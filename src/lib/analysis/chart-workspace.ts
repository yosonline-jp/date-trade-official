import { ema } from "./indicators";
import { technicalSeries, type TechnicalPoint } from "./stock-technicals";
import type { Candle } from "./types";

export type ChartPoint = TechnicalPoint;
export type SavedChartCandle = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};
export type ChartViewport = { start: number; count: number };
export type ChartMeasurement = {
  fromIndex: number;
  toIndex: number;
  fromPrice: number;
  toPrice: number;
  priceChange: number;
  percentChange: number;
  bars: number;
};

function validPriceBar(bar: SavedChartCandle) {
  return (
    Number.isFinite(bar.ts) &&
    bar.ts >= 0 &&
    Number.isFinite(new Date((bar.ts + 9 * 3600) * 1000).getTime()) &&
    [bar.open, bar.high, bar.low, bar.close].every(
      (price) => Number.isFinite(price) && price > 0,
    ) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close)
  );
}

const knownVolume = (volume: number | null | undefined) =>
  typeof volume === "number" && Number.isFinite(volume) && volume >= 0
    ? volume
    : NaN;

/** Invalid prices are discarded; absent volume does not discard a price bar. */
export function savedChartPoints(data: SavedChartCandle[]): TechnicalPoint[] {
  const candles = new Map<number, Candle>();
  for (const bar of data) {
    if (!validPriceBar(bar)) continue;
    // The last valid saved observation for a timestamp replaces earlier ones.
    candles.set(bar.ts, {
      time: bar.ts,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: knownVolume(bar.volume),
    });
  }
  return technicalSeries([...candles.values()].sort((a, b) => a.time - b.time));
}

/** Custom averages use raw closes, with a full-period seed and no future bars. */
export function movingAverage(
  points: TechnicalPoint[],
  period: number,
  type: "sma" | "ema",
): Array<number | null> {
  if (
    !Number.isInteger(period) ||
    period < 2 ||
    period > 200 ||
    (type !== "sma" && type !== "ema")
  )
    return points.map(() => null);
  const closes = points.map((point) => point.close);
  if (type === "ema")
    return ema(closes, period).map((value) =>
      value !== null && Number.isFinite(value) ? value : null,
    );
  let sum = 0;
  let unknown = 0;
  return closes.map((close, i) => {
    if (Number.isFinite(close)) sum += close;
    else unknown++;
    if (i >= period) {
      const previous = closes[i - period];
      if (Number.isFinite(previous)) sum -= previous;
      else unknown--;
    }
    return i >= period - 1 && unknown === 0 && Number.isFinite(sum)
      ? sum / period
      : null;
  });
}

/** HA bars are a display transform; source OHLC and indicators stay unchanged. */
export function heikinAshi(points: TechnicalPoint[]): Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}> {
  let previousOpen = 0;
  let previousClose = 0;
  return points.map((point, i) => {
    const close = (point.open + point.high + point.low + point.close) / 4;
    const open =
      i === 0
        ? (point.open + point.close) / 2
        : (previousOpen + previousClose) / 2;
    previousOpen = open;
    previousClose = close;
    return {
      time: point.time,
      open,
      high: Math.max(point.high, open, close),
      low: Math.min(point.low, open, close),
      close,
    };
  });
}

function tradingWeek(time: number) {
  const jst = new Date((time + 9 * 3600) * 1000);
  const daysFromMonday = (jst.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(
      jst.getUTCFullYear(),
      jst.getUTCMonth(),
      jst.getUTCDate() - daysFromMonday,
    ),
  );
  return monday.toISOString().slice(0, 10);
}

/** Monday-start JST weeks retain the first observed bar's actual timestamp. */
export function weeklyChartPoints(points: TechnicalPoint[]): TechnicalPoint[] {
  const canonical = new Map<number, TechnicalPoint>();
  for (const point of points)
    if (validPriceBar({ ...point, ts: point.time }))
      canonical.set(point.time, point);
  const weeks = new Map<string, Candle>();
  for (const point of [...canonical.values()].sort((a, b) => a.time - b.time)) {
    const key = tradingWeek(point.time);
    const week = weeks.get(key);
    const volume = knownVolume(point.volume);
    if (!week) {
      weeks.set(key, {
        time: point.time,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume,
      });
    } else {
      week.high = Math.max(week.high, point.high);
      week.low = Math.min(week.low, point.low);
      week.close = point.close;
      // NaN is intentional internally: one unknown day makes the sum unknown.
      week.volume += volume;
    }
  }
  return technicalSeries([...weeks.values()]);
}

const integer = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.floor(value) : fallback;

/** A viewport is an inclusive start index and a count suitable for slice(). */
export function clampViewport(
  total: number,
  view: ChartViewport,
  minBars = 20,
): ChartViewport {
  const length = Math.max(0, integer(total, 0));
  if (length === 0) return { start: 0, count: 0 };
  const minimum = Math.min(length, Math.max(1, integer(minBars, 20)));
  const count = Math.min(
    length,
    Math.max(minimum, integer(view.count, length)),
  );
  const start = Math.min(length - count, Math.max(0, integer(view.start, 0)));
  return { start, count };
}

/** factor < 1 zooms in; anchor is the relative 0..1 position within the window. */
export function zoomViewport(
  total: number,
  view: ChartViewport,
  factor: number,
  anchor = 0.5,
  minBars = 20,
): ChartViewport {
  const current = clampViewport(total, view, minBars);
  if (!Number.isFinite(factor) || factor <= 0 || current.count === 0)
    return current;
  const location = Number.isFinite(anchor)
    ? Math.min(1, Math.max(0, anchor))
    : 0.5;
  const size = clampViewport(
    total,
    { start: current.start, count: Math.round(current.count * factor) },
    minBars,
  ).count;
  const start = Math.round(
    current.start + current.count * location - size * location,
  );
  return clampViewport(total, { start, count: size }, minBars);
}

export function panViewport(
  total: number,
  view: ChartViewport,
  delta: number,
  minBars = 20,
): ChartViewport {
  const current = clampViewport(total, view, minBars);
  return clampViewport(
    total,
    {
      ...current,
      start: current.start + (Number.isFinite(delta) ? Math.round(delta) : 0),
    },
    minBars,
  );
}

/** Measurement uses original closes, independently of HA or line display mode. */
export function measureChart(
  points: TechnicalPoint[],
  fromIndex: number,
  toIndex: number,
): ChartMeasurement | null {
  if (
    ![fromIndex, toIndex].every(Number.isInteger) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= points.length ||
    toIndex >= points.length
  )
    return null;
  const fromPrice = points[fromIndex].close;
  const toPrice = points[toIndex].close;
  if (
    !Number.isFinite(fromPrice) ||
    fromPrice <= 0 ||
    !Number.isFinite(toPrice) ||
    toPrice <= 0
  )
    return null;
  const priceChange = toPrice - fromPrice;
  return {
    fromIndex,
    toIndex,
    fromPrice,
    toPrice,
    priceChange,
    percentChange: (100 * priceChange) / fromPrice,
    bars: Math.abs(toIndex - fromIndex),
  };
}
