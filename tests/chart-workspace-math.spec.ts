import { expect, test } from "@playwright/test";
import {
  clampViewport,
  heikinAshi,
  measureChart,
  movingAverage,
  panViewport,
  savedChartPoints,
  weeklyChartPoints,
  zoomViewport,
  type SavedChartCandle,
} from "../src/lib/analysis/chart-workspace";

const start = Date.parse("2026-10-05T00:00:00Z") / 1000;
const raw = (
  close: number,
  ts = start,
  volume: number | null = 100,
): SavedChartCandle => ({
  ts,
  open: close,
  high: close + 2,
  low: close - 2,
  close,
  volume,
});
const points = (closes: number[]) =>
  savedChartPoints(closes.map((close, i) => raw(close, start + i * 60)));

test("saved candles validate OHLC, sort, deduplicate and retain unknown-volume prices", () => {
  const input = [
    raw(120, start + 120),
    raw(100, start),
    raw(110, start + 60),
    raw(111, start + 60, null),
    { ...raw(500, start + 60), low: 501 },
    { ...raw(140, start + 240), volume: -1 },
    { ...raw(130, start + 180), volume: 0 },
    { ...raw(10, start + 300), high: 9 },
    { ...raw(10, start + 360), close: NaN },
    raw(0, start + 420),
    raw(10, NaN),
    raw(10, -1),
    raw(10, 1e30),
  ];
  const original = structuredClone(input),
    series = savedChartPoints(input);
  expect(input).toEqual(original);
  expect(series.map((point) => point.time)).toEqual([
    start,
    start + 60,
    start + 120,
    start + 180,
    start + 240,
  ]);
  expect(series.map((point) => point.close)).toEqual([100, 111, 120, 130, 140]);
  expect(series.map((point) => point.volume)).toEqual([
    100,
    null,
    100,
    0,
    null,
  ]);
  expect(
    savedChartPoints([{ ts: start, open: 10, high: 11, low: 9, close: 10 }])[0]
      .volume,
  ).toBeNull();
  expect(savedChartPoints([])).toEqual([]);
});

test("custom SMA and EMA use observed closes and full-period seeds", () => {
  const input = points([10, 20, 30, 40, 80]);
  expect(movingAverage(input, 3, "sma")).toEqual([null, null, 20, 30, 50]);
  expect(movingAverage(input, 3, "ema")).toEqual([null, null, 20, 30, 55]);
  expect(movingAverage(input, 2, "sma")).toEqual([null, 15, 25, 35, 60]);
  const long = points(Array.from({ length: 250 }, (_, i) => 10 + i));
  expect(movingAverage(long, 200, "ema")[198]).toBeNull();
  expect(movingAverage(long, 200, "ema")[199]).toBeCloseTo(109.5, 10);
  expect(movingAverage(long, 200, "ema").at(-1)).toBeCloseTo(159.5, 10);
  for (const period of [1, 201, 2.5, NaN, Infinity])
    expect(
      movingAverage(input, period, "sma").every((value) => value === null),
    ).toBe(true);
  expect(movingAverage(input, 10, "ema").every((value) => value === null)).toBe(
    true,
  );
});

test("custom averages and saved indicators never depend on appended future bars", () => {
  const input = Array.from({ length: 60 }, (_, i) =>
    raw(100 + i, start + i * 60),
  );
  const prefix = savedChartPoints(input.slice(0, 40));
  const full = savedChartPoints(
    input.map((bar, i) =>
      i < 40
        ? bar
        : {
            ...bar,
            open: bar.open * 2,
            high: bar.high * 2,
            low: bar.low * 2,
            close: bar.close * 2,
            volume: null,
          },
    ),
  );
  expect(full.slice(0, 40)).toEqual(prefix);
  for (const type of ["sma", "ema"] as const)
    expect(movingAverage(full, 15, type).slice(0, 40)).toEqual(
      movingAverage(prefix, 15, type),
    );
});

test("Heikin Ashi follows previous synthetic values while preserving original OHLC", () => {
  const input = savedChartPoints([
    { ts: start, open: 100, high: 110, low: 90, close: 104, volume: 100 },
    { ts: start + 60, open: 120, high: 130, low: 115, close: 128, volume: 100 },
    { ts: start + 120, open: 80, high: 82, low: 76, close: 78, volume: 100 },
  ]);
  const original = structuredClone(input),
    transformed = heikinAshi(input);
  expect(transformed).toEqual([
    { time: start, open: 102, high: 110, low: 90, close: 101 },
    { time: start + 60, open: 101.5, high: 130, low: 101.5, close: 123.25 },
    { time: start + 120, open: 112.375, high: 112.375, low: 76, close: 79 },
  ]);
  expect(input).toEqual(original);
  expect(heikinAshi(input).slice(0, 2)).toEqual(heikinAshi(input.slice(0, 2)));
  expect(heikinAshi([])).toEqual([]);
});

test("weekly aggregation uses JST Monday boundaries and first actual timestamps", () => {
  const times = [
    "2026-10-02T00:00:00Z",
    "2026-10-04T16:00:00Z",
    "2026-10-09T00:00:00Z",
    "2026-10-13T00:00:00Z",
  ].map((value) => Date.parse(value) / 1000);
  const input = savedChartPoints(
    times.map((time, i) => raw(100 + i * 10, time, (i + 1) * 100)),
  );
  const original = structuredClone(input),
    weekly = weeklyChartPoints([...input].reverse());
  expect(
    weekly.map((point) => ({
      time: point.time,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    })),
  ).toEqual([
    { time: times[0], open: 100, high: 102, low: 98, close: 100, volume: 100 },
    { time: times[1], open: 110, high: 122, low: 108, close: 120, volume: 500 },
    { time: times[3], open: 130, high: 132, low: 128, close: 130, volume: 400 },
  ]);
  expect(input).toEqual(original);
});

test("weekly technical periods count weekly bars and unknown volume never fabricates a sum", () => {
  const input = Array.from({ length: 15 }, (_, week) => [
    raw(100 + week * 10, start + week * 7 * 86400, 10),
    raw(105 + week * 10, start + (week * 7 + 4) * 86400, 20),
  ]).flat();
  const daily = savedChartPoints(input),
    normal = weeklyChartPoints(daily);
  const unknown = weeklyChartPoints(
    savedChartPoints(
      input.map((bar, i) => (i === 10 ? { ...bar, volume: null } : bar)),
    ),
  );
  expect(normal).toHaveLength(15);
  expect(normal[13].rsi).toBeNull();
  expect(normal[14].rsi).toBe(100);
  expect(normal.at(-1)!.ema20).toBeNull();
  expect(daily.at(-1)!.ema20).not.toBeNull();
  expect(normal.every((point) => point.volume === 30)).toBe(true);
  expect(unknown[5].volume).toBeNull();
  expect(unknown[5].close).toBe(normal[5].close);
  expect(unknown[14].rsi).toBe(normal[14].rsi);
  expect(unknown[14].mfi).toBeNull();
  expect(normal[14].mfi).toBe(100);
  expect(weeklyChartPoints(daily).slice(0, 8)).toEqual(
    weeklyChartPoints(daily.slice(0, 16)),
  );
  expect(weeklyChartPoints([])).toEqual([]);
});

test("viewport clamping handles empty, short, invalid and out-of-range windows", () => {
  expect(clampViewport(0, { start: 100, count: 50 })).toEqual({
    start: 0,
    count: 0,
  });
  expect(clampViewport(3, { start: 100, count: 50 })).toEqual({
    start: 0,
    count: 3,
  });
  expect(clampViewport(100, { start: -4, count: 8 })).toEqual({
    start: 0,
    count: 20,
  });
  expect(clampViewport(100, { start: 999, count: 50 })).toEqual({
    start: 50,
    count: 50,
  });
  expect(clampViewport(100, { start: NaN, count: NaN })).toEqual({
    start: 0,
    count: 100,
  });
  expect(clampViewport(100, { start: 4.9, count: 25.9 })).toEqual({
    start: 4,
    count: 25,
  });
  expect(clampViewport(100, { start: 80, count: 5 }, 5)).toEqual({
    start: 80,
    count: 5,
  });
});

test("zoom preserves its anchor and pan remains inside the history", () => {
  const current = { start: 40, count: 40 };
  expect(zoomViewport(100, current, 0.5)).toEqual({ start: 50, count: 20 });
  expect(zoomViewport(100, current, 0.5, 0)).toEqual({ start: 40, count: 20 });
  expect(zoomViewport(100, current, 0.5, 1)).toEqual({ start: 60, count: 20 });
  expect(zoomViewport(100, current, 10)).toEqual({ start: 0, count: 100 });
  expect(zoomViewport(100, current, 0)).toEqual(current);
  expect(zoomViewport(0, current, 0.5)).toEqual({ start: 0, count: 0 });
  expect(panViewport(100, current, -100)).toEqual({ start: 0, count: 40 });
  expect(panViewport(100, current, 100)).toEqual({ start: 60, count: 40 });
  expect(panViewport(100, current, 5)).toEqual({ start: 45, count: 40 });
  expect(panViewport(100, current, NaN)).toEqual(current);
});

test("zoom and pan always return valid windows under varied histories", () => {
  for (const total of [0, 1, 19, 100, 1000]) {
    for (const startIndex of [-100, 0, 10, 5000]) {
      for (const count of [-10, 0, 15, 100, 5000]) {
        for (const view of [
          clampViewport(total, { start: startIndex, count }),
          zoomViewport(total, { start: startIndex, count }, 0.37, 0.8),
          panViewport(total, { start: startIndex, count }, -33),
        ]) {
          expect(
            Number.isInteger(view.start) && Number.isInteger(view.count),
          ).toBe(true);
          expect(view.start).toBeGreaterThanOrEqual(0);
          expect(view.count).toBeGreaterThanOrEqual(Math.min(total, 20));
          expect(view.start + view.count).toBeLessThanOrEqual(total);
        }
      }
    }
  }
});

test("measurement uses original closes, signed returns and elapsed bar count", () => {
  const input = savedChartPoints([
    { ...raw(104, start), open: 100, high: 110, low: 90 },
    { ...raw(128, start + 60), open: 120, high: 130, low: 115 },
  ]);
  expect(heikinAshi(input)[0].close).toBe(101);
  const forward = measureChart(input, 0, 1)!;
  expect(forward).toMatchObject({
    fromIndex: 0,
    toIndex: 1,
    fromPrice: 104,
    toPrice: 128,
    priceChange: 24,
    bars: 1,
  });
  expect(forward.percentChange).toBeCloseTo((100 * 24) / 104, 10);
  expect(measureChart(input, 1, 0)).toMatchObject({
    fromPrice: 128,
    toPrice: 104,
    priceChange: -24,
    bars: 1,
  });
  expect(measureChart(input, 0, 0)).toMatchObject({
    priceChange: 0,
    percentChange: 0,
    bars: 0,
  });
  for (const [from, to] of [
    [-1, 1],
    [0, 2],
    [0, 0.5],
    [NaN, 1],
  ])
    expect(measureChart(input, from, to)).toBeNull();
  expect(measureChart([], 0, 0)).toBeNull();
});
