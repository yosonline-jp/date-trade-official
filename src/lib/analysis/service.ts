import "server-only";
import { analysisConfig } from "./config";
import { analyzeMarket } from "./engine";
import { YahooStockDataProvider } from "./provider";
import { AnalysisError } from "./signal";
import type { AnalysisResult, Stock } from "./types";
const results = new Map<
  string,
  { expires: number; promise: Promise<AnalysisResult> }
>();
let running = 0;
export async function analyzeStock(stock: Stock): Promise<AnalysisResult> {
  const cached = results.get(stock.code);
  if (cached && cached.expires > Date.now()) return cached.promise;
  if (running >= 3)
    throw new AnalysisError(
      "分析リクエストが集中しています。少し待ってから再度お試しください。",
      "RATE_LIMIT",
    );
  const provider = new YahooStockDataProvider();
  running++;
  const job = (async () => {
    const [one, five, fifteen] = await Promise.all(
      ["1m", "5m", "15m"].map((interval) =>
        provider.getIntradayData(
          `${stock.code}.T`,
          interval as "1m" | "5m" | "15m",
        ),
      ),
    );
    return analyzeMarket(
      stock,
      { "1m": one, "5m": five, "15m": fifteen },
      Math.floor(Date.now() / 1000),
      [
        ...provider.warnings,
        "1分足は配信元の保存制約に合わせて直近29暦日を7日ごとに分割取得します。数か月の1分足履歴は利用できません。",
        "到達確率は同一銘柄の過去の類似局面における実測率です。期間が短く、将来の確率として校正されていません。",
      ],
    );
  })();
  const entry = { expires: Infinity, promise: job };
  results.set(stock.code, entry);
  while (results.size > analysisConfig.provider.maxCachedSymbols)
    results.delete(results.keys().next().value!);
  try {
    const result = await job;
    entry.expires = Date.now() + analysisConfig.provider.ttlMs;
    return result;
  } catch (error) {
    if (results.get(stock.code) === entry) results.delete(stock.code);
    throw error;
  } finally {
    running--;
  }
}
