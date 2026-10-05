import { createClient } from "@/utils/supabase/server";
import { YahooStockDataProvider } from "@/lib/analysis/provider";
import { cleanHistory, marketState } from "@/lib/analysis/engine";
import { AnalysisError } from "@/lib/analysis/signal";
import { seconds } from "@/lib/analysis/similarity";
import {
  technicalLevels,
  technicalSeries,
  type StockTechnicalData,
} from "@/lib/analysis/stock-technicals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const headers = { "Cache-Control": "no-store" };
  const interval = new URL(request.url).searchParams.get("interval") ?? "1m";
  if (typeof code !== "string" || !/^[0-9A-Z]{4,5}$/.test(code))
    return Response.json(
      { error: "銘柄コードが正しくありません。" },
      { status: 400, headers },
    );
  if (interval !== "1m" && interval !== "5m" && interval !== "15m")
    return Response.json(
      { error: "時間足は1m・5m・15mから選択してください。" },
      { status: 400, headers },
    );
  try {
    const db = await createClient();
    const { data: stock, error } = await db
      .from("stocks")
      .select("code,name,market")
      .eq("code", code)
      .maybeSingle();
    if (error)
      throw new AnalysisError("銘柄情報を取得できませんでした。", "PROVIDER");
    if (!stock)
      return Response.json(
        { error: "銘柄が見つかりません。" },
        { status: 404, headers },
      );
    if (stock.market === "上場廃止")
      return Response.json(
        { error: "上場廃止銘柄の分足指標は利用できません。" },
        { status: 422, headers },
      );

    const provider = new YahooStockDataProvider();
    const raw = await provider.getIntradayData(`${stock.code}.T`, interval);
    const asOf = Date.now() / 1000;
    const bars = cleanHistory(raw, interval, asOf);
    const latest = bars.at(-1);
    if (!latest)
      throw new AnalysisError(
        `${interval}の確定した株価データがありません。時間をおいて再度お試しください。`,
      );
    const dataAt = latest.time + seconds[interval];
    const result: StockTechnicalData = {
      symbol: stock.code,
      name: stock.name,
      interval,
      // Warm up indicators on all fetched history before limiting the payload.
      points: technicalSeries(bars).slice(-240),
      levels: technicalLevels(bars, "intraday"),
      dataAt: new Date(dataAt * 1000).toISOString(),
      analyzedAt: new Date(asOf * 1000).toISOString(),
      source: {
        provider: "Yahoo Finance",
        delay: "遅延の可能性があります。リアルタイム配信ではありません。",
        // marketState accepts a one-minute bar start; pass this interval's end.
        marketState: marketState(asOf, dataAt - 60),
        bars: bars.length,
        warnings: [...provider.warnings],
      },
    };
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof AnalysisError)
      return Response.json(
        { error: error.message, kind: error.kind },
        {
          status:
            error.kind === "INSUFFICIENT_DATA"
              ? 422
              : error.kind === "RATE_LIMIT"
                ? 429
                : error.kind === "TIMEOUT"
                  ? 504
                  : 503,
          headers: {
            ...headers,
            ...(error.kind === "RATE_LIMIT" ? { "Retry-After": "60" } : {}),
          },
        },
      );
    return Response.json(
      { error: "分足指標を取得できませんでした。再度お試しください。" },
      { status: 503, headers },
    );
  }
}
