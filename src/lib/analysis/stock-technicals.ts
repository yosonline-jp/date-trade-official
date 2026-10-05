import { ema, indicators, rci, tradingDay, wilder } from "./indicators";
import type { Candle, IndicatorPoint, Interval, MarketState } from "./types";

type Value = number | null;
type Series = Value[];

export type TechnicalPoint = Omit<IndicatorPoint, "volume"> & {
  volume: Value;
  sma5: Value;
  sma25: Value;
  sma75: Value;
  ema9: Value;
  rci26: Value;
  macd: Value;
  macdSignal: Value;
  macdHistogram: Value;
  bbUpper: Value;
  bbMiddle: Value;
  bbLower: Value;
  bbPercentB: Value;
  bbBandwidth: Value;
  stochasticK: Value;
  stochasticD: Value;
  williamsR: Value;
  cci: Value;
  mfi: Value;
  obv: Value;
  plusDI: Value;
  minusDI: Value;
  roc: Value;
  recentHigh: Value;
  recentLow: Value;
};

export type TechnicalLevels = {
  previousHigh: Value;
  previousLow: Value;
  dayHigh: Value;
  dayLow: Value;
  pivot: Value;
  r1: Value;
  r2: Value;
  s1: Value;
  s2: Value;
};

export type StockTechnicalData = {
  symbol: string;
  name: string;
  interval: Interval;
  points: TechnicalPoint[];
  levels: ReturnType<typeof technicalLevels>;
  dataAt: string;
  analyzedAt: string;
  source: {
    provider: string;
    delay: string;
    marketState: MarketState;
    bars: number;
    warnings: string[];
  };
};

const finite = (value: Value | undefined): Value =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function windowValues(
  values: Series,
  end: number,
  period: number,
): number[] | null {
  if (end < period - 1) return null;
  const window = values.slice(end - period + 1, end + 1);
  return window.every((value) => finite(value) !== null)
    ? (window as number[])
    : null;
}

function sma(values: Series, period: number): Series {
  return values.map((_, end) => {
    const window = windowValues(values, end, period);
    return window
      ? window.reduce((sum, value) => sum + value, 0) / period
      : null;
  });
}

/** The signal EMA starts after nine observed MACD values, not nine price bars. */
function nullableEma(values: Series, period: number): Series {
  let current: Value = null;
  const result: Series = [];
  for (let i = 0; i < values.length; i++) {
    const value = finite(values[i]);
    if (value === null) current = null;
    else if (current !== null)
      current += (2 / (period + 1)) * (value - current);
    else {
      const window = windowValues(values, i, period);
      if (window) current = window.reduce((sum, n) => sum + n, 0) / period;
    }
    result.push(current);
  }
  return result;
}

function extremes(bars: Candle[], end: number, period: number) {
  if (end < period - 1) return null;
  const window = bars.slice(end - period + 1, end + 1);
  if (
    window.some(
      (bar) => !Number.isFinite(bar.high) || !Number.isFinite(bar.low),
    )
  )
    return null;
  return {
    high: Math.max(...window.map((bar) => bar.high)),
    low: Math.min(...window.map((bar) => bar.low)),
  };
}

function directionalIndices(bars: Candle[], period = 14) {
  const ranges: number[] = [],
    plus: number[] = [],
    minus: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const previous = bars[i - 1],
      bar = bars[i];
    const up = bar.high - previous.high,
      down = previous.low - bar.low;
    if (
      ![bar.high, bar.low, previous.high, previous.low, previous.close].every(
        Number.isFinite,
      )
    ) {
      ranges.push(NaN);
      plus.push(NaN);
      minus.push(NaN);
      continue;
    }
    ranges.push(
      Math.max(
        bar.high - bar.low,
        Math.abs(bar.high - previous.close),
        Math.abs(bar.low - previous.close),
      ),
    );
    plus.push(up > down && up > 0 ? up : 0);
    minus.push(down > up && down > 0 ? down : 0);
  }
  const smoothedRange = wilder(ranges, period),
    smoothedPlus = wilder(plus, period),
    smoothedMinus = wilder(minus, period);
  return bars.map((_, i) => {
    const range = finite(smoothedRange[i - 1]);
    const positive = finite(smoothedPlus[i - 1]),
      negative = finite(smoothedMinus[i - 1]);
    return {
      plusDI:
        range !== null && range > 0 && positive !== null
          ? finite((100 * positive) / range)
          : null,
      minusDI:
        range !== null && range > 0 && negative !== null
          ? finite((100 * negative) / range)
          : null,
    };
  });
}

/** Chronological OHLCV bars in; every output uses only its bar and earlier bars. */
export function technicalSeries(bars: Candle[]): TechnicalPoint[] {
  const base = indicators(bars);
  const closes = bars.map((bar) => finite(bar.close));
  const sma5 = sma(closes, 5),
    sma25 = sma(closes, 25),
    sma75 = sma(closes, 75);
  const ema9 = nullableEma(closes, 9);
  const rci26 = rci(
    bars.map((bar) => bar.close),
    26,
  );
  const ema12 = ema(
      bars.map((bar) => bar.close),
      12,
    ),
    ema26 = ema(
      bars.map((bar) => bar.close),
      26,
    );
  const macd = closes.map((_, i) => {
    const fast = finite(ema12[i]),
      slow = finite(ema26[i]);
    return fast !== null && slow !== null ? finite(fast - slow) : null;
  });
  const macdSignal = nullableEma(macd, 9);
  const typical = bars.map((bar) =>
    finite((bar.high + bar.low + bar.close) / 3),
  );
  const stochasticK = bars.map((bar, i) => {
    const range = extremes(bars, i, 9);
    return range && range.high > range.low
      ? finite((100 * (bar.close - range.low)) / (range.high - range.low))
      : null;
  });
  const stochasticD = sma(stochasticK, 3);
  const di = directionalIndices(bars);
  const flows = bars.map((bar, i) => {
    const current = typical[i],
      previous = typical[i - 1];
    if (
      i === 0 ||
      current === null ||
      previous === null ||
      !Number.isFinite(bar.volume) ||
      bar.volume < 0
    )
      return null;
    const raw = current * bar.volume;
    return {
      positive: current > previous ? raw : 0,
      negative: current < previous ? raw : 0,
    };
  });
  let obv: Value = 0;
  let invalidPriceSeen = false;
  let volumeDay = "";
  let unknownDayVolume = false;
  return bars.map((bar, i) => {
    invalidPriceSeen ||= ![bar.high, bar.low, bar.close].every(Number.isFinite);
    const nextDay = tradingDay(bar.time);
    if (volumeDay !== nextDay) {
      volumeDay = nextDay;
      unknownDayVolume = false;
    }
    const validVolume = Number.isFinite(bar.volume) && bar.volume >= 0;
    unknownDayVolume ||= !validVolume;
    const bbWindow = windowValues(closes, i, 20);
    const middle = bbWindow
      ? bbWindow.reduce((sum, n) => sum + n, 0) / 20
      : null;
    const deviation =
      bbWindow && middle !== null
        ? Math.sqrt(
            bbWindow.reduce((sum, n) => sum + (n - middle) ** 2, 0) / 20,
          )
        : null;
    const upper =
      middle !== null && deviation !== null ? middle + 2 * deviation : null;
    const lower =
      middle !== null && deviation !== null ? middle - 2 * deviation : null;
    const cciWindow = windowValues(typical, i, 20);
    const cciMean = cciWindow
      ? cciWindow.reduce((sum, n) => sum + n, 0) / 20
      : null;
    const meanDeviation =
      cciWindow && cciMean !== null
        ? cciWindow.reduce((sum, n) => sum + Math.abs(n - cciMean), 0) / 20
        : null;
    const flowWindow = i >= 14 ? flows.slice(i - 13, i + 1) : [];
    let mfi: Value = null;
    if (flowWindow.length === 14 && flowWindow.every((flow) => flow !== null)) {
      const positive = flowWindow.reduce(
        (sum, flow) => sum + flow!.positive,
        0,
      );
      const negative = flowWindow.reduce(
        (sum, flow) => sum + flow!.negative,
        0,
      );
      if (positive + negative > 0)
        mfi = (100 * positive) / (positive + negative);
    }
    if (
      !Number.isFinite(bar.close) ||
      !Number.isFinite(bar.volume) ||
      bar.volume < 0 ||
      (i > 0 && !Number.isFinite(bars[i - 1].close))
    )
      obv = null;
    else if (i > 0 && obv !== null)
      obv += Math.sign(bar.close - bars[i - 1].close) * bar.volume;
    const williamsRange = extremes(bars, i, 14),
      recent = extremes(bars, i, 20);
    const basePoint = { ...base[i] };
    for (const key of [
      "rci",
      "k",
      "d",
      "j",
      "rsi",
      "ema20",
      "ema50",
      "ema100",
      "vwap",
      "adx",
      "atr",
      "volumeRatio",
    ] as const)
      basePoint[key] = finite(basePoint[key]);
    // Ranking can return a finite-looking value for NaN inputs; Wilder ADX
    // cannot recover its smoothed state after an unknown price observation.
    if (!windowValues(closes, i, 7)) basePoint.rci = null;
    if (invalidPriceSeen) basePoint.adx = null;
    // An unknown volume must not be silently interpreted as zero trading.
    // VWAP resumes with a new session; relative volume resumes after its
    // lookback window no longer contains the unknown observation.
    if (unknownDayVolume) basePoint.vwap = null;
    if (
      !validVolume ||
      bars
        .slice(Math.max(0, i - 20), i)
        .some(
          (previous) =>
            !Number.isFinite(previous.volume) || previous.volume < 0,
        )
    )
      basePoint.volumeRatio = null;
    return {
      ...basePoint,
      volume: validVolume ? bar.volume : null,
      sma5: finite(sma5[i]),
      sma25: finite(sma25[i]),
      sma75: finite(sma75[i]),
      ema9: finite(ema9[i]),
      rci26: i >= 25 && windowValues(closes, i, 26) ? finite(rci26[i]) : null,
      macd: finite(macd[i]),
      macdSignal: finite(macdSignal[i]),
      macdHistogram:
        macd[i] !== null && macdSignal[i] !== null
          ? finite(macd[i]! - macdSignal[i]!)
          : null,
      bbUpper: finite(upper),
      bbMiddle: finite(middle),
      bbLower: finite(lower),
      bbPercentB:
        upper !== null && lower !== null && upper > lower
          ? finite((100 * (bar.close - lower)) / (upper - lower))
          : null,
      bbBandwidth:
        upper !== null && lower !== null && middle !== null && middle > 0
          ? finite((100 * (upper - lower)) / middle)
          : null,
      stochasticK: finite(stochasticK[i]),
      stochasticD: finite(stochasticD[i]),
      williamsR:
        williamsRange && williamsRange.high > williamsRange.low
          ? finite(
              (-100 * (williamsRange.high - bar.close)) /
                (williamsRange.high - williamsRange.low),
            )
          : null,
      cci:
        cciMean !== null &&
        meanDeviation !== null &&
        meanDeviation > 0 &&
        typical[i] !== null
          ? finite((typical[i]! - cciMean) / (0.015 * meanDeviation))
          : null,
      mfi: finite(mfi),
      obv: finite(obv),
      ...di[i],
      roc:
        i >= 10 &&
        closes[i] !== null &&
        closes[i - 10] !== null &&
        closes[i - 10]! > 0
          ? finite((100 * (closes[i]! - closes[i - 10]!)) / closes[i - 10]!)
          : null,
      recentHigh: recent?.high ?? null,
      recentLow: recent?.low ?? null,
    };
  });
}

/** Classic pivots use the preceding trading day's observed high, low and close. */
export function technicalLevels(
  bars: Candle[],
  basis: "intraday" | "daily",
): TechnicalLevels {
  let current: Candle | undefined, previous: Candle | undefined;
  if (basis === "daily") {
    current = bars.at(-1);
    previous = bars.at(-2);
  } else {
    let day = "";
    for (const bar of bars) {
      if (!Number.isFinite(bar.time)) continue;
      const next = tradingDay(bar.time);
      if (day !== next) {
        previous = current;
        current = { ...bar };
        day = next;
      } else if (current) {
        current = {
          ...current,
          high: Math.max(current.high, bar.high),
          low: Math.min(current.low, bar.low),
          close: bar.close,
          volume: current.volume + bar.volume,
        };
      }
    }
  }
  const high = finite(previous?.high),
    low = finite(previous?.low),
    close = finite(previous?.close);
  const pivot =
    high !== null && low !== null && close !== null
      ? finite((high + low + close) / 3)
      : null;
  return {
    previousHigh: high,
    previousLow: low,
    dayHigh: finite(current?.high),
    dayLow: finite(current?.low),
    pivot,
    r1: pivot !== null && low !== null ? finite(2 * pivot - low) : null,
    r2:
      pivot !== null && high !== null && low !== null
        ? finite(pivot + high - low)
        : null,
    s1: pivot !== null && high !== null ? finite(2 * pivot - high) : null,
    s2:
      pivot !== null && high !== null && low !== null
        ? finite(pivot - high + low)
        : null,
  };
}
