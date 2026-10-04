import type {
  Candle,
  History,
  IndicatorPoint,
} from "../../src/lib/analysis/types";

/** Deterministic test-only history. Production never imports these fixtures. */
export function intradayHistory(days = 14): History {
  const one: Candle[] = [];
  let date = Date.UTC(2026, 8, 7) / 1000,
    tradingDays = 0;
  while (tradingDays < days) {
    if (![0, 6].includes(new Date(date * 1000).getUTCDay())) {
      for (let i = 0; i < 330; i++) {
        const time = date + (i < 150 ? i * 60 : (i + 60) * 60);
        const close =
          100 +
          tradingDays * 0.7 +
          Math.sin(i / 9) * 1.8 +
          Math.sin(i / 3) * 0.25;
        const open = one.at(-1)?.close ?? close;
        one.push({
          time,
          open,
          close,
          high: Math.max(open, close) + 0.2,
          low: Math.min(open, close) - 0.2,
          volume: 1000 + (i % 11) * 110,
        });
      }
      tradingDays++;
    }
    date += 86400;
  }
  const aggregate = (period: number) => {
    const result: Candle[] = [];
    for (let i = 0; i < one.length; i += period) {
      const window = one.slice(i, i + period);
      result.push({
        time: window[0].time,
        open: window[0].open,
        close: window.at(-1)!.close,
        high: Math.max(...window.map((b) => b.high)),
        low: Math.min(...window.map((b) => b.low)),
        volume: window.reduce((sum, b) => sum + b.volume, 0),
      });
    }
    return result;
  };
  return { "1m": one, "5m": aggregate(5), "15m": aggregate(15) };
}
export function point(time = 0): IndicatorPoint {
  return {
    time,
    open: 100,
    high: 101,
    low: 99,
    close: 100.4,
    volume: 2000,
    rci: 0,
    rsi: 45,
    k: 55,
    d: 45,
    j: 75,
    ema20: 100.2,
    ema50: 99,
    ema100: 98,
    vwap: 100,
    atr: 1,
    adx: 30,
    volumeRatio: 2,
  };
}
