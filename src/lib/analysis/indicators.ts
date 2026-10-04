import { analysisConfig as config, type AnalysisConfig } from "./config";
import type { Candle, IndicatorPoint } from "./types";
type Series = (number | null)[];

export function ema(values: number[], period: number): Series {
  const result: Series = values.map(() => null);
  if (values.length < period) return result;
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = value;
  const alpha = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    value += alpha * (values[i] - value);
    result[i] = value;
  }
  return result;
}
export function wilder(values: number[], period: number): Series {
  const result: Series = values.map(() => null);
  if (values.length < period) return result;
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = value;
  for (let i = period; i < values.length; i++) {
    value = (value * (period - 1) + values[i]) / period;
    result[i] = value;
  }
  return result;
}
/** Spearman correlation with average ranks for tied prices; flat windows are neutral. */
export function rci(
  values: number[],
  period: number = config.rciPeriod,
): Series {
  return values.map((_, end) => {
    if (end < period - 1) return null;
    const window = values.slice(end - period + 1, end + 1);
    const order = window
      .map((value, index) => ({ value, index }))
      .sort((a, b) => a.value - b.value);
    const ranks = Array<number>(period);
    for (let i = 0; i < period;) {
      let j = i + 1;
      while (j < period && order[j].value === order[i].value) j++;
      for (let k = i; k < j; k++) ranks[order[k].index] = (i + j - 1) / 2;
      i = j;
    }
    const mean = (period - 1) / 2;
    let covariance = 0,
      priceVariance = 0,
      timeVariance = 0;
    ranks.forEach((rank, i) => {
      covariance += (rank - mean) * (i - mean);
      priceVariance += (rank - mean) ** 2;
      timeVariance += (i - mean) ** 2;
    });
    return priceVariance === 0
      ? 0
      : Math.max(
          -100,
          Math.min(
            100,
            (100 * covariance) / Math.sqrt(priceVariance * timeVariance),
          ),
        );
  });
}
export function rsi(
  values: number[],
  period: number = config.rsiPeriod,
): Series {
  const changes = values.slice(1).map((value, i) => value - values[i]);
  const gains = wilder(
    changes.map((n) => Math.max(0, n)),
    period,
  );
  const losses = wilder(
    changes.map((n) => Math.max(0, -n)),
    period,
  );
  return [
    null,
    ...gains.map((gain, i) => {
      const loss = losses[i];
      if (gain === null || loss === null) return null;
      if (gain === 0 && loss === 0) return 50;
      return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
    }),
  ];
}
export function kdj(bars: Candle[], period: number = config.kdjPeriod) {
  let k = 50,
    d = 50;
  return bars.map((bar, i) => {
    if (i < period - 1) return { k: null, d: null, j: null };
    const window = bars.slice(i - period + 1, i + 1);
    const high = Math.max(...window.map((b) => b.high)),
      low = Math.min(...window.map((b) => b.low));
    const rsv = high === low ? 50 : (100 * (bar.close - low)) / (high - low);
    k = (2 * k + rsv) / 3;
    d = (2 * d + k) / 3;
    return { k, d, j: 3 * k - 2 * d };
  });
}
export const tradingDay = (time: number) =>
  new Date((time + 9 * 3600) * 1000).toISOString().slice(0, 10);
export function vwap(bars: Candle[]): Series {
  let day = "",
    volume = 0,
    total = 0;
  return bars.map((bar) => {
    const next = tradingDay(bar.time);
    if (next !== day) {
      day = next;
      volume = 0;
      total = 0;
    }
    volume += bar.volume;
    total += ((bar.high + bar.low + bar.close) / 3) * bar.volume;
    return volume > 0 ? total / volume : null;
  });
}
export function atr(bars: Candle[], period: number = config.atrPeriod): Series {
  return wilder(
    bars.map((b, i) =>
      i === 0
        ? b.high - b.low
        : Math.max(
            b.high - b.low,
            Math.abs(b.high - bars[i - 1].close),
            Math.abs(b.low - bars[i - 1].close),
          ),
    ),
    period,
  );
}
export function adx(bars: Candle[], period: number = config.adxPeriod): Series {
  const tr: number[] = [],
    plus: number[] = [],
    minus: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const up = bars[i].high - bars[i - 1].high,
      down = bars[i - 1].low - bars[i].low;
    plus.push(up > down && up > 0 ? up : 0);
    minus.push(down > up && down > 0 ? down : 0);
    tr.push(
      Math.max(
        bars[i].high - bars[i].low,
        Math.abs(bars[i].high - bars[i - 1].close),
        Math.abs(bars[i].low - bars[i - 1].close),
      ),
    );
  }
  const smoothedTr = wilder(tr, period),
    smoothedPlus = wilder(plus, period),
    smoothedMinus = wilder(minus, period);
  const dx: number[] = [];
  for (let i = period - 1; i < tr.length; i++) {
    const total = (smoothedPlus[i] ?? 0) + (smoothedMinus[i] ?? 0);
    dx.push(
      !smoothedTr[i] || total === 0
        ? 0
        : (100 * Math.abs((smoothedPlus[i] ?? 0) - (smoothedMinus[i] ?? 0))) /
            total,
    );
  }
  const result: Series = bars.map(() => null);
  wilder(dx, period).forEach((value, i) => {
    result[i + period] = value;
  });
  return result;
}
export function indicators(
  bars: Candle[],
  settings: AnalysisConfig = config,
): IndicatorPoint[] {
  const closes = bars.map((b) => b.close),
    rciValues = rci(closes, settings.rciPeriod),
    rsiValues = rsi(closes, settings.rsiPeriod),
    kdjValues = kdj(bars, settings.kdjPeriod);
  const ema20 = ema(closes, 20),
    ema50 = ema(closes, 50),
    ema100 = ema(closes, 100),
    vwaps = vwap(bars),
    atrs = atr(bars, settings.atrPeriod),
    adxs = adx(bars, settings.adxPeriod);
  return bars.map((bar, i) => {
    const volumes = bars
      .slice(Math.max(0, i - settings.volumePeriod), i)
      .map((b) => b.volume);
    const average = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    return {
      ...bar,
      ...kdjValues[i],
      rci: rciValues[i],
      rsi: rsiValues[i],
      ema20: ema20[i],
      ema50: ema50[i],
      ema100: ema100[i],
      vwap: vwaps[i],
      atr: atrs[i],
      adx: adxs[i],
      volumeRatio:
        i < settings.volumePeriod || average <= 0 ? null : bar.volume / average,
    };
  });
}
