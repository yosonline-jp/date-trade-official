import { analysisConfig, type AnalysisConfig } from "./config";
import { tradingDay } from "./indicators";
import { trend } from "./signal";
import type { Analog, Frame, IndicatorPoint, Interval } from "./types";
export const seconds: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
};
/** Only use higher-timeframe candles already closed at the 1m decision time. */
export function closedIndex(
  points: IndicatorPoint[],
  interval: Interval,
  decisionTime: number,
) {
  let low = 0,
    high = points.length - 1,
    found = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (points[mid].time + seconds[interval] <= decisionTime) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return found;
}
export function features(
  one: IndicatorPoint[],
  i: number,
  five: IndicatorPoint[],
  j: number,
  fifteen: IndicatorPoint[],
  k: number,
): number[] | null {
  const p = one[i],
    previous = one[i - 1],
    f = five[j],
    e = fifteen[k];
  if (!p || !previous || !f || !e || !fifteen[k - 1]) return null;
  if (
    [
      p.rci,
      previous.rci,
      p.rsi,
      p.k,
      p.d,
      p.j,
      p.ema20,
      p.ema50,
      p.vwap,
      p.atr,
      p.volumeRatio,
      e.ema20,
      e.ema50,
      fifteen[k - 1].ema20,
      f.ema20,
      f.ema50,
    ].some((v) => v === null || !Number.isFinite(v)) ||
    !p.atr
  )
    return null;
  const encode = (value: IndicatorPoint) =>
    trend(value) === "UP" ? 1 : trend(value) === "DOWN" ? -1 : 0;
  return [
    p.rci!,
    p.rci! - previous.rci!,
    p.rsi!,
    p.k!,
    p.d!,
    p.j!,
    (p.close - p.ema20!) / p.atr!,
    (p.ema20! - p.ema50!) / p.atr!,
    (p.close - p.vwap!) / p.atr!,
    (e.ema20! - fifteen[k - 1].ema20!) / Math.max(e.atr ?? p.atr!, 1e-9),
    (p.close - p.low) / p.atr!,
    p.atr! / p.close,
    p.volumeRatio!,
    encode(e),
    encode(f),
    encode(p),
  ];
}
export function quantile(values: number[], fraction: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    pos = (sorted.length - 1) * fraction;
  const low = Math.floor(pos),
    high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}
export function summarize(values: number[]) {
  return {
    mean: values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null,
    median: quantile(values, 0.5),
    q25: quantile(values, 0.25),
    q75: quantile(values, 0.75),
  };
}
export function similarCases(
  series: Record<Interval, IndicatorPoint[]>,
  current: { one: Frame; five: Frame; fifteen: Frame },
  config: AnalysisConfig = analysisConfig,
): Analog[] {
  const one = series["1m"],
    five = series["5m"],
    fifteen = series["15m"];
  const decision = current.one.current.time + 60;
  const target = features(
    one,
    one.length - 1,
    five,
    closedIndex(five, "5m", decision),
    fifteen,
    closedIndex(fifteen, "15m", decision),
  );
  if (!target) return [];
  const candidates: Analog[] = [];
  for (
    let i = config.minimumBars - 1;
    i + config.similarity.horizon < one.length - 1;
    i++
  ) {
    const t = one[i].time + 60,
      j = closedIndex(five, "5m", t),
      k = closedIndex(fifteen, "15m", t);
    if (
      j < config.minimumBars - 1 ||
      k < config.minimumBars - 1 ||
      trend(fifteen[k]) !== current.fifteen.trend
    )
      continue;
    const path = one.slice(i + 1, i + config.similarity.horizon + 1);
    // Label windows must be fully observed, contiguous and within the same trading day.
    if (
      path.at(-1)!.time + 60 > decision ||
      path.some(
        (p, n) =>
          p.time !== one[i].time + (n + 1) * 60 ||
          tradingDay(p.time) !== tradingDay(one[i].time),
      )
    )
      continue;
    const input = features(one, i, five, j, fifteen, k);
    if (!input) continue;
    const distance = Math.sqrt(
      input.reduce(
        (sum, value, n) =>
          sum +
          config.similarity.weights[n] *
            ((value - target[n]) / config.similarity.scales[n]) ** 2,
        0,
      ) / config.similarity.weights.reduce((a, b) => a + b, 0),
    );
    if (distance > config.similarity.maxDistance) continue;
    const returns: Record<number, number> = {};
    for (const horizon of config.similarity.returns)
      returns[horizon] = one[i + horizon].close / one[i].close - 1;
    candidates.push({
      index: i,
      distance,
      path,
      base: one[i].close,
      originRci: one[i].rci!,
      returns,
    });
  }
  const selected: Analog[] = [];
  for (const candidate of candidates.sort((a, b) => a.distance - b.distance)) {
    if (
      selected.every(
        (s) => Math.abs(s.index - candidate.index) >= config.similarity.stride,
      )
    )
      selected.push(candidate);
    if (selected.length >= config.similarity.maxSamples) break;
  }
  return selected;
}
