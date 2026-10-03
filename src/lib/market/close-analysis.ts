import "server-only";
import { analyzeCloseHistory, type StockCloseAnalysis } from "./close-forecast";
import { fetchYahooChart, jstDay } from "./provider";

export async function analyzeStockClose(
  code: string,
  name: string,
): Promise<StockCloseAnalysis> {
  const forecast = await analyzeCloseHistory((range) =>
    fetchYahooChart(`${code}.T`, range),
  );
  const tradingDate = jstDay(forecast.targetTimestamp * 1000);
  const analyzedAt = new Date().toISOString();
  return {
    ...forecast,
    code,
    name,
    tradingDate,
    analyzedAt,
    isCurrentDate: tradingDate === jstDay(analyzedAt),
  };
}
