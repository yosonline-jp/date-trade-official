import { expect, test } from "@playwright/test";
import {
  technicalLevels,
  technicalSeries,
} from "../src/lib/analysis/stock-technicals";
import { indicators } from "../src/lib/analysis/indicators";
import type { Candle } from "../src/lib/analysis/types";

const start = Date.parse("2026-09-30T00:00:00Z") / 1000;
const bars = (closes: number[], volumes?: number[]): Candle[] =>
  closes.map((close, i) => ({
    time: start + i * 60,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: volumes?.[i] ?? 100,
  }));
const rising = () => bars(Array.from({ length: 100 }, (_, i) => i + 1));

test("moving averages and MACD use SMA seeds and proper signal warm-up", () => {
  const series = technicalSeries(rising()),
    latest = series.at(-1)!;
  expect(series[3].sma5).toBeNull();
  expect(series[4].sma5).toBe(3);
  expect(series[7].ema9).toBeNull();
  expect(series[8].ema9).toBe(5);
  expect(series[24].macd).toBeNull();
  expect(series[25].macd).toBeCloseTo(7, 10);
  expect(series[32].macdSignal).toBeNull();
  expect(series[33].macdSignal).toBeCloseTo(7, 10);
  expect(latest).toMatchObject({
    sma5: 98,
    sma25: 88,
    sma75: 63,
    ema9: 96,
    rci26: 100,
  });
  expect(latest.macdHistogram).toBeCloseTo(0, 10);
});

test("Bollinger bands use the twenty-close population deviation and percentages", () => {
  const series = technicalSeries(
    bars(Array.from({ length: 20 }, (_, i) => i + 1)),
  );
  const latest = series.at(-1)!,
    deviation = Math.sqrt(33.25);
  expect(series[18].bbMiddle).toBeNull();
  expect(latest.bbMiddle).toBe(10.5);
  expect(latest.bbUpper).toBeCloseTo(10.5 + 2 * deviation, 10);
  expect(latest.bbLower).toBeCloseTo(10.5 - 2 * deviation, 10);
  expect(latest.bbPercentB).toBeCloseTo(
    (100 * (20 - (10.5 - 2 * deviation))) / (4 * deviation),
    10,
  );
  expect(latest.bbBandwidth).toBeCloseTo((100 * 4 * deviation) / 10.5, 10);
});

test("Stochastic, Williams R, CCI, DMI, ROC and rolling extremes match hand calculations", () => {
  const series = technicalSeries(rising()),
    latest = series.at(-1)!;
  expect(series[7].stochasticK).toBeNull();
  expect(series[8].stochasticK).toBe(90);
  expect(series[9].stochasticD).toBeNull();
  expect(series[10].stochasticD).toBe(90);
  expect(series[13].plusDI).toBeNull();
  expect(series[14].plusDI).toBe(50);
  expect(latest).toMatchObject({
    stochasticK: 90,
    stochasticD: 90,
    plusDI: 50,
    minusDI: 0,
    recentHigh: 101,
    recentLow: 80,
  });
  expect(latest.williamsR).toBeCloseTo(-100 / 15, 10);
  expect(latest.cci).toBeCloseTo(9.5 / (0.015 * 5), 10);
  expect(latest.roc).toBeCloseTo((100 * 10) / 90, 10);
  const falling = technicalSeries(
    bars(Array.from({ length: 30 }, (_, i) => 100 - i)),
  ).at(-1)!;
  expect(falling.plusDI).toBe(0);
  expect(falling.minusDI).toBe(50);
  expect(falling.rci26).toBe(-100);
});

test("MFI weights positive and negative typical-price flows, OBV signs actual volume", () => {
  const alternating = technicalSeries(
    bars(Array.from({ length: 15 }, (_, i) => (i % 2 ? 11 : 10))),
  );
  expect(alternating[13].mfi).toBeNull();
  expect(alternating[14].mfi).toBeCloseTo(
    (100 * 7 * 11) / (7 * 11 + 7 * 10),
    10,
  );
  expect(technicalSeries(rising()).at(-1)!.mfi).toBe(100);
  expect(
    technicalSeries(bars(Array.from({ length: 20 }, (_, i) => 30 - i))).at(-1)!
      .mfi,
  ).toBe(0);
  expect(
    technicalSeries(bars([10, 11, 10, 10], [100, 200, 400, 800])).map(
      (p) => p.obv,
    ),
  ).toEqual([0, 200, -200, -200]);
});

test("flat ranges and zero-volume money flow remain unavailable instead of fabricated signals", () => {
  const flat = bars(Array(100).fill(100)).map((bar) => ({
    ...bar,
    high: 100,
    low: 100,
    volume: 0,
  }));
  const latest = technicalSeries(flat).at(-1)!;
  expect(latest).toMatchObject({
    sma75: 100,
    ema9: 100,
    macd: 0,
    macdSignal: 0,
    macdHistogram: 0,
    bbUpper: 100,
    bbMiddle: 100,
    bbLower: 100,
    bbBandwidth: 0,
    bbPercentB: null,
    stochasticK: null,
    stochasticD: null,
    williamsR: null,
    cci: null,
    mfi: null,
    plusDI: null,
    minusDI: null,
    obv: 0,
    roc: 0,
    rsi: 50,
    rci: 0,
    rci26: 0,
    vwap: null,
  });
});

test("insufficient or nonfinite observations produce null values without mutating inputs", () => {
  expect(technicalSeries([])).toEqual([]);
  const input = bars([10, 11, 12]);
  const original = structuredClone(input),
    latest = technicalSeries(input).at(-1)!;
  expect(input).toEqual(original);
  for (const key of [
    "sma5",
    "sma25",
    "sma75",
    "ema9",
    "rci26",
    "macd",
    "bbMiddle",
    "stochasticK",
    "cci",
    "mfi",
    "plusDI",
    "roc",
    "recentHigh",
  ] as const)
    expect(latest[key]).toBeNull();
  const corrupt = rising();
  corrupt[99] = {
    ...corrupt[99],
    high: NaN,
    low: NaN,
    close: NaN,
    volume: NaN,
  };
  const invalid = technicalSeries(corrupt).at(-1)!;
  for (const key of [
    "sma5",
    "ema9",
    "rci26",
    "macd",
    "bbMiddle",
    "stochasticK",
    "cci",
    "mfi",
    "obv",
    "plusDI",
    "roc",
    "recentHigh",
    "rsi",
    "rci",
    "adx",
    "atr",
    "vwap",
  ] as const)
    expect(invalid[key]).toBeNull();
});

test("existing indicator values are reused unchanged for valid OHLCV", () => {
  const input = rising(),
    original = indicators(input),
    added = technicalSeries(input);
  for (let i = 0; i < input.length; i++)
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
      expect(added[i][key]).toEqual(original[i][key]);
});

test("missing daily volume preserves every price bar and price-indicator warm-up", () => {
  const input = rising().map((bar, i) => ({ ...bar, time: start + i * 86400 }));
  const missing = input.map((bar, i) =>
    i === 50 ? { ...bar, volume: NaN } : bar,
  );
  const normal = technicalSeries(input),
    observed = technicalSeries(missing);
  expect(observed).toHaveLength(input.length);
  for (let i = 0; i < input.length; i++)
    for (const key of [
      "rsi",
      "rci",
      "rci26",
      "ema9",
      "ema20",
      "ema50",
      "ema100",
      "macd",
      "atr",
      "adx",
      "cci",
    ] as const)
      expect(observed[i][key]).toEqual(normal[i][key]);
  expect(observed[50].volume).toBeNull();
  expect(observed[51].volume).toBe(100);
  expect(observed[50].vwap).toBeNull();
  expect(observed[51].vwap).toBe(52);
  expect(observed[50].mfi).toBeNull();
  expect(observed[63].mfi).toBeNull();
  expect(observed[64].mfi).toBe(100);
  expect(observed[50].volumeRatio).toBeNull();
  expect(observed[70].volumeRatio).toBeNull();
  expect(observed[71].volumeRatio).toBe(1);
  expect(observed[49].obv).toBe(4900);
  expect(observed.slice(50).every((point) => point.obv === null)).toBe(true);
});

test("unknown intraday volume invalidates VWAP through that session and resets next day", () => {
  const input = rising().map((bar, i) => ({
    ...bar,
    time: i < 70 ? start + i * 60 : start + 86400 + (i - 70) * 60,
  }));
  for (const volume of [NaN, -1]) {
    const series = technicalSeries(
      input.map((bar, i) => (i === 50 ? { ...bar, volume } : bar)),
    );
    expect(series[49].vwap).toBe(25.5);
    expect(series.slice(50, 70).every((point) => point.vwap === null)).toBe(
      true,
    );
    expect(series[70].vwap).toBe(71);
    expect(series[71].vwap).toBe(71.5);
    expect(series[50]).toMatchObject({
      volume: null,
      mfi: null,
      obv: null,
      volumeRatio: null,
    });
    expect(series[50].rsi).toBe(100);
    expect(series[50].rci).toBe(100);
  }
});

test("appending or changing future bars cannot change earlier technical values", () => {
  const input = rising(),
    prefix = input.slice(0, 60);
  const future = input.map((bar, i) =>
    i < 60
      ? bar
      : {
          ...bar,
          open: bar.open * 10,
          high: bar.high * 10,
          low: bar.low * 10,
          close: bar.close * 10,
          volume: bar.volume * 10,
        },
  );
  expect(technicalSeries(input).slice(0, 60)).toEqual(technicalSeries(prefix));
  expect(technicalSeries(future).slice(0, 60)).toEqual(technicalSeries(prefix));
});

test("intraday levels aggregate JST trading days and pivots use the previous close", () => {
  const input = [
    {
      ...bars([100])[0],
      time: Date.parse("2026-09-30T00:00:00Z") / 1000,
      high: 110,
      low: 90,
    },
    {
      ...bars([105])[0],
      time: Date.parse("2026-09-30T06:00:00Z") / 1000,
      high: 108,
      low: 95,
    },
    {
      ...bars([106])[0],
      time: Date.parse("2026-10-01T00:00:00Z") / 1000,
      high: 112,
      low: 99,
    },
    {
      ...bars([107])[0],
      time: Date.parse("2026-10-01T06:00:00Z") / 1000,
      high: 111,
      low: 98,
    },
  ];
  const levels = technicalLevels(input, "intraday"),
    pivot = 305 / 3;
  expect(levels).toMatchObject({
    previousHigh: 110,
    previousLow: 90,
    dayHigh: 112,
    dayLow: 98,
  });
  expect(levels.pivot).toBeCloseTo(pivot, 10);
  expect(levels.r1).toBeCloseTo(2 * pivot - 90, 10);
  expect(levels.r2).toBeCloseTo(pivot + 20, 10);
  expect(levels.s1).toBeCloseTo(2 * pivot - 110, 10);
  expect(levels.s2).toBeCloseTo(pivot - 20, 10);
  expect(technicalLevels(input.slice(0, 2), "intraday").pivot).toBeNull();
});

test("daily levels use the previous daily candle and unavailable data stays null", () => {
  const input = bars([100, 105]);
  expect(technicalLevels(input, "daily")).toEqual({
    previousHigh: 101,
    previousLow: 99,
    dayHigh: 106,
    dayLow: 104,
    pivot: 100,
    r1: 101,
    r2: 102,
    s1: 99,
    s2: 98,
  });
  expect(
    Object.values(technicalLevels([], "daily")).every(
      (value) => value === null,
    ),
  ).toBe(true);
  expect(technicalLevels(input.slice(0, 1), "daily").previousHigh).toBeNull();
  const invalid = [{ ...input[0], high: NaN }, input[1]];
  expect(technicalLevels(invalid, "daily").pivot).toBeNull();
});
