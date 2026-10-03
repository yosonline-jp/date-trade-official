import type { CandleRaw } from "@/components/mini-candle-chart";
import type { YahooChart } from "./provider";

/** Send only the same 30 valid sessions that the watchlist mini chart displays. */
export function watchlistSeries(chart?: YahooChart | null): CandleRaw[] {
  const quote = chart?.indicators?.quote?.[0];
  const candles = (chart?.timestamp ?? []).flatMap((ts, i) => {
    const candle = {
      ts,
      open: quote?.open?.[i],
      high: quote?.high?.[i],
      low: quote?.low?.[i],
      close: quote?.close?.[i],
    };
    return Object.values(candle).every(
      (n) => typeof n === "number" && Number.isFinite(n),
    )
      ? [candle as CandleRaw]
      : [];
  });
  return candles.sort((a, b) => a.ts - b.ts).slice(-30);
}
