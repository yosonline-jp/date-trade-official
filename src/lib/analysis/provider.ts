import "server-only";
import { createClient } from "@/utils/supabase/server";
import { analysisConfig } from "./config";
import { AnalysisError } from "./signal";
import { seconds } from "./similarity";
import type { Candle, Interval, Stock, StockDataProvider } from "./types";
import type { YahooChart } from "@/lib/market/provider";

type CachedHistory = { bars: Candle[]; warnings: string[] };
const cache = new Map<
  string,
  { expires: number; promise: Promise<CachedHistory> }
>();

export async function searchCatalogue(query: string): Promise<Stock[]> {
  const text = query
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\sー・]/gu, "");
  if (!text) return [];
  const db = await createClient();
  const { data, error } = await db
    .from("stocks")
    .select("code,name,market")
    .neq("market", "上場廃止")
    .or(`code.ilike.%${text}%,name.ilike.%${text}%`)
    .order("code")
    .limit(12);
  if (error)
    throw new AnalysisError(
      "銘柄検索に失敗しました。時間をおいて再度お試しください。",
      "PROVIDER",
    );
  return data ?? [];
}
async function fetchChunk(
  symbol: string,
  interval: Interval,
  start: number,
  end: number,
): Promise<Candle[]> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
  );
  url.search = new URLSearchParams({
    interval,
    period1: String(start),
    period2: String(end),
    includePrePost: "false",
  }).toString();
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DaytradeWorkspace/1.0)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(analysisConfig.provider.timeoutMs),
    });
  } catch (error) {
    throw new AnalysisError(
      error instanceof Error && /timeout|abort/i.test(error.name)
        ? "株価APIの応答がタイムアウトしました。再度お試しください。"
        : "株価APIに接続できませんでした。",
      error instanceof Error && /timeout|abort/i.test(error.name)
        ? "TIMEOUT"
        : "PROVIDER",
    );
  }
  if (response.status === 429)
    throw new AnalysisError(
      "株価APIのリクエスト制限に達しました。時間をおいて再度お試しください。",
      "RATE_LIMIT",
    );
  if (!response.ok)
    throw new AnalysisError(
      `株価APIが${response.status}を返しました。${interval}の履歴を取得できません。`,
      "PROVIDER",
    );
  const body = (await response.json()) as {
    chart?: { result?: YahooChart[]; error?: { description?: string } };
  };
  const chart = body.chart?.result?.[0],
    quote = chart?.indicators?.quote?.[0];
  // A weekend/holiday-only chunk can legitimately contain metadata and no bars.
  if (chart && !body.chart?.error && !Array.isArray(chart.timestamp)) return [];
  if (!chart || !quote || !Array.isArray(chart.timestamp))
    throw new AnalysisError(
      `${interval}の株価履歴を取得できませんでした。`,
      "PROVIDER",
    );
  return chart.timestamp.flatMap((time, i) => {
    const [open, high, low, close, volume] = [
      quote.open[i],
      quote.high[i],
      quote.low[i],
      quote.close[i],
      quote.volume[i],
    ];
    if (
      ![time, open, high, low, close, volume].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      )
    )
      return [];
    // Exclude pre/post-market, recess and Yahoo's instantaneous closing quote.
    const local = new Date((time + 9 * 3600) * 1000),
      minute = local.getUTCHours() * 60 + local.getUTCMinutes();
    if (!(
      (minute >= 540 && minute + seconds[interval] / 60 <= 690) ||
      (minute >= 750 && minute + seconds[interval] / 60 <= 930)
    ))
      return [];
    return [
      {
        time,
        open: open!,
        high: high!,
        low: low!,
        close: close!,
        volume: volume!,
      },
    ];
  });
}
async function history(
  symbol: string,
  interval: Interval,
): Promise<CachedHistory> {
  const key = `${symbol}:${interval}`,
    now = Date.now(),
    previous = cache.get(key);
  if (previous && previous.expires > now) return previous.promise;
  const job = (async () => {
    const end = Math.floor(now / 60_000) * 60,
      start = end - analysisConfig.provider.historyDays * 86400;
    const warnings: string[] = [],
      bars: Candle[] = [];
    if (interval === "1m") {
      for (let finish = end; finish > start;) {
        const begin = Math.max(
          start,
          finish - analysisConfig.provider.chunkDays * 86400,
        );
        try {
          bars.push(...(await fetchChunk(symbol, interval, begin, finish)));
        } catch (error) {
          if (
            finish !== end &&
            error instanceof AnalysisError &&
            /APIが(400|404|422)/.test(error.message)
          ) {
            warnings.push(
              "配信元の1分足履歴制限により、一部の古い期間を取得できませんでした。",
            );
          } else throw error;
        }
        finish = begin;
      }
    } else bars.push(...(await fetchChunk(symbol, interval, start, end)));
    return {
      bars: [...new Map(bars.map((b) => [b.time, b])).values()].sort(
        (a, b) => a.time - b.time,
      ),
      warnings,
    };
  })();
  const entry = { expires: Infinity, promise: job };
  cache.set(key, entry);
  while (cache.size > analysisConfig.provider.maxCachedSymbols * 3)
    cache.delete(cache.keys().next().value!);
  try {
    const result = await job;
    entry.expires = Date.now() + analysisConfig.provider.ttlMs;
    return result;
  } catch (error) {
    if (cache.get(key) === entry) cache.delete(key);
    throw error;
  }
}
export class YahooStockDataProvider implements StockDataProvider {
  readonly warnings = new Set<string>();
  searchStocks(query: string) {
    return searchCatalogue(query);
  }
  async getIntradayData(symbol: string, interval: Interval) {
    const result = await history(symbol, interval);
    result.warnings.forEach((warning) => this.warnings.add(warning));
    return result.bars;
  }
}
