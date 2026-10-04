import { createClient } from "@/utils/supabase/server";
import { analyzeStock } from "@/lib/analysis/service";
import { AnalysisError } from "@/lib/analysis/signal";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  let code: unknown;
  try {
    code = (await request.json())?.symbol;
  } catch {
    return Response.json(
      { error: "JSON形式で銘柄コードを指定してください。" },
      { status: 400, headers },
    );
  }
  if (typeof code !== "string" || !/^[0-9A-Z]{4,5}$/.test(code))
    return Response.json(
      { error: "銘柄コードが正しくありません。" },
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
        { error: "上場廃止銘柄の分析は利用できません。" },
        { status: 422, headers },
      );
    return Response.json(await analyzeStock(stock), { headers });
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
      { error: "分析に失敗しました。株価データを確認し、再度お試しください。" },
      { status: 503, headers },
    );
  }
}
