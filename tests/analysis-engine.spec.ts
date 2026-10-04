import { test, expect } from "@playwright/test";
import {
  adx,
  atr,
  ema,
  indicators,
  kdj,
  rci,
  rsi,
  vwap,
} from "../src/lib/analysis/indicators";
import {
  frameAt,
  classifySignal,
  scoreSignal,
} from "../src/lib/analysis/signal";
import { closedIndex, quantile } from "../src/lib/analysis/similarity";
import {
  entryPrediction,
  pricePlan,
  rciProjection,
  targetReached,
} from "../src/lib/analysis/prediction";
import {
  analyzeMarket,
  cleanHistory,
  marketState,
} from "../src/lib/analysis/engine";
import { backtestMetrics } from "../src/lib/analysis/backtest";
import { analysisConfig } from "../src/lib/analysis/config";
import type {
  Analog,
  Frame,
  IndicatorPoint,
  Interval,
} from "../src/lib/analysis/types";
import { intradayHistory, point } from "./fixtures/intraday";

function frame(
  interval: Interval,
  direction: "LONG" | "SHORT" = "LONG",
  environment = false,
): Frame {
  const rows: IndicatorPoint[] = Array.from({ length: 120 }, (_, i) => ({
    ...point(i * 60),
    rci: -95,
  }));
  rows[117].rci = environment ? -5 : -95;
  rows[118] = {
    ...rows[118],
    rci: environment ? 0 : -90,
    close: 99.8,
    ema20: 100.1,
    rsi: 40,
    k: 40,
    d: 45,
    j: 30,
  };
  rows[119].rci = environment ? 10 : -70;
  if (direction === "SHORT")
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      rows[i] = {
        ...p,
        close: 200 - p.close,
        open: 200 - p.open,
        high: 200 - p.low,
        low: 200 - p.high,
        rci: -p.rci!,
        rsi: 100 - p.rsi!,
        k: 100 - p.k!,
        d: 100 - p.d!,
        j: 100 - p.j!,
        ema20: 200 - p.ema20!,
        ema50: 200 - p.ema50!,
        ema100: 200 - p.ema100!,
        vwap: 200 - p.vwap!,
      };
    }
  return frameAt(rows, 119, interval);
}
function analogs(count = 10): Analog[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i * 20,
    distance: 0.2,
    base: 100,
    originRci: -90,
    path: [-70, -45, 5, 60, 90].map((value, index) => ({
      ...point(index * 60),
      open: 100 + index * 0.3,
      close: 100 + (index + 1) * 0.3 + i * 0.01,
      low: 99.9 + index * 0.3,
      high: 100.6 + index * 0.3,
      rci: value,
    })),
    returns: { 1: 0.003, 3: 0.009, 5: 0.015, 10: 0.02, 20: 0.03 },
  }));
}

test("RCI handles rising, falling, tied and flat prices and insufficient history", () => {
  expect(rci([1, 2, 3, 4, 5, 6, 7]).at(-1)).toBe(100);
  expect(rci([7, 6, 5, 4, 3, 2, 1]).at(-1)).toBe(-100);
  expect(rci([1, 1, 2, 3], 4).at(-1)).toBeCloseTo(94.868329805, 8);
  expect(rci(Array(7).fill(1)).at(-1)).toBe(0);
  expect(rci([1, 2, 3])).toEqual([null, null, null]);
});
test("RCI detects -80 recovery and +80 breakdown", () => {
  expect(frame("1m").rciCrossUp).toBe(true);
  expect(frame("1m").rciReversalUp).toBe(true);
  expect(frame("1m", "SHORT").rciCrossDown).toBe(true);
  expect(frame("1m", "SHORT").rciReversalDown).toBe(true);
});
test("KDJ starts at neutral RSV and detects golden/dead crosses", () => {
  const base = Array.from({ length: 120 }, (_, i) => ({
    time: i * 60,
    open: 100,
    close: 100,
    high: 101,
    low: 99,
    volume: 1000,
  }));
  expect(kdj(base).at(-1)).toEqual({ k: 50, d: 50, j: 50 });
  const up = indicators([
    ...base,
    { ...base[0], time: 120 * 60, close: 100.8 },
  ]);
  const down = indicators([
    ...base,
    { ...base[0], time: 120 * 60, close: 99.2 },
  ]);
  expect(frameAt(up, 120, "1m").goldenCross).toBe(true);
  expect(frameAt(down, 120, "1m").deadCross).toBe(true);
});
test("Wilder RSI handles a known sequence, monotonic and unchanged prices", () => {
  const prices = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89,
    46.03, 45.61, 46.28, 46.28,
  ];
  expect(rsi(prices).at(-1)).toBeCloseTo(70.464135, 5);
  expect(rsi(Array.from({ length: 20 }, (_, i) => i + 1)).at(-1)).toBe(100);
  expect(rsi(Array.from({ length: 20 }, (_, i) => 20 - i)).at(-1)).toBe(0);
  expect(rsi(Array(20).fill(100)).at(-1)).toBe(50);
  expect(frame("1m").current.rsi! > frame("1m").previous.rsi!).toBe(true);
  expect(
    frame("1m", "SHORT").current.rsi! < frame("1m", "SHORT").previous.rsi!,
  ).toBe(true);
});
test("EMA seed, ATR, ADX and session-reset VWAP have explicit expected values", () => {
  expect(ema([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
  const bars = Array.from({ length: 30 }, (_, i) => ({
    time: i * 60,
    open: 100 + i,
    close: 100 + i,
    high: 101 + i,
    low: 99 + i,
    volume: 1000,
  }));
  expect(atr(bars).at(-1)).toBe(2);
  expect(adx(bars).at(-1)).toBe(100);
  expect(
    vwap([
      { ...bars[0], time: 0 },
      { ...bars[1], time: 60 },
      { ...bars[2], time: 86400 },
    ]),
  ).toEqual([100, 100.5, 102]);
});
test("LONG and SHORT scores follow the 30/30/40 weights symmetrically", () => {
  for (const direction of ["LONG", "SHORT"] as const) {
    const e = frame("15m", direction, true),
      s = frame("5m", direction),
      t = frame("1m", direction);
    const score = scoreSignal(direction, e, s, t);
    expect(score).toMatchObject({
      total: 100,
      environment: 30,
      setup: 30,
      trigger: 40,
    });
    expect(classifySignal(score.total, direction, e)).toMatchObject({
      signal: direction,
      strength: "STRONG",
    });
    expect(classifySignal(70, direction, e).strength).toBe("NORMAL");
    expect(classifySignal(55, direction, e).strength).toBe("WEAK");
  }
});
test("WAIT, opposite 15m environment and insufficient data cannot become strong signals", () => {
  expect(classifySignal(49, "LONG", frame("15m", "LONG", true)).signal).toBe(
    "WAIT",
  );
  expect(
    classifySignal(100, "LONG", frame("15m", "SHORT", true)),
  ).toMatchObject({ signal: "WAIT", counterTrend: true });
  expect(() => frameAt([point()], 0, "1m")).toThrow(/不足/);
  expect(() =>
    analyzeMarket(
      { code: "7203", name: "test", market: "プライム" },
      { "1m": [], "5m": [], "15m": [] },
      1000,
    ),
  ).toThrow(/不足/);
});
test("entry price is a statistical range and remains unavailable with too few analogs", () => {
  const f = frame("1m");
  expect(entryPrediction(f, [], "LONG")).toBeNull();
  const entry = entryPrediction(f, analogs(), "LONG")!;
  expect(entry.low).toBeLessThanOrEqual(entry.expected);
  expect(entry.high).toBeGreaterThanOrEqual(entry.expected);
  expect(entry.expected).toBeGreaterThan(0);
  const changed = analogs().map((a) => ({
    ...a,
    returns: { ...a.returns, 3: 0.02 },
  }));
  expect(entryPrediction(f, changed, "LONG")!.expected).not.toBe(
    entry.expected,
  );
});
test("TP1/2/3 and stop loss produce ordered targets and exact risk/reward", () => {
  for (const direction of ["LONG", "SHORT"] as const) {
    const plan = pricePlan(
      frame("1m", direction),
      analogs(),
      direction,
      [98, 99, 101, 102, 103],
    );
    expect(plan.takeProfit).toHaveLength(3);
    const entry = plan.entry!.expected,
      stop = plan.stopLoss!.price;
    expect(direction === "LONG" ? stop < entry : stop > entry).toBe(true);
    let previous = entry;
    for (const tp of plan.takeProfit) {
      expect(
        direction === "LONG" ? tp.expected > previous : tp.expected < previous,
      ).toBe(true);
      expect(tp.riskReward).toBeCloseTo(
        Math.abs(tp.expected - entry) / Math.abs(stop - entry),
        12,
      );
      expect(tp.probability).toBeGreaterThanOrEqual(0);
      expect(tp.probability).toBeLessThanOrEqual(100);
      previous = tp.expected;
    }
  }
});
test("OHLC ambiguity counts as stop-first and never claims a fill without entry", () => {
  const a = analogs()[0];
  a.path = [{ ...point(), low: 98, high: 102 }];
  expect(targetReached(a, 1, 1.01, 0.99, "LONG")).toBe(false);
  expect(targetReached(a, 1, 0.99, 1.01, "SHORT")).toBe(false);
  expect(targetReached(a, 1.05, 1.06, 1.04, "LONG")).toBe(false);
});
test("RCI projections use observed first hits and sample denominators", () => {
  const f = frame("1m");
  f.current.rci = -90;
  const projections = rciProjection(f, analogs(), "LONG");
  expect(projections.map((p) => p.rci)).toEqual([-80, -50, 0, 50, 80]);
  for (const p of projections) {
    expect(p.probability).toBe(100);
    expect(p.samples).toBe(10);
    expect(p.lowerPrice).toBeLessThanOrEqual(p.expectedPrice!);
    expect(p.upperPrice).toBeGreaterThanOrEqual(p.expectedPrice!);
  }
  expect(
    rciProjection(f, analogs(2), "LONG").every(
      (p) => p.expectedPrice === null && p.probability === null,
    ),
  ).toBe(true);
  f.current.rci = 10;
  expect(
    rciProjection(f, analogs(), "LONG").find((p) => p.rci === 0)
      ?.alreadyReached,
  ).toBe(true);
  expect(quantile([1, 3, 5, 7], 0.25)).toBe(2.5);
});
test("only completed higher-timeframe candles are available at a decision", () => {
  const points = [point(0), point(300), point(600)];
  expect(closedIndex(points, "5m", 599)).toBe(0);
  expect(closedIndex(points, "5m", 600)).toBe(1);
  expect(cleanHistory(points, "5m", 599)).toHaveLength(1);
});
test("changing or appending future prices never changes a historical analysis", () => {
  const history = intradayHistory(),
    cut = history["1m"].at(-200)!.time + 60;
  const stock = { code: "TEST", name: "テスト専用", market: "プライム" };
  const before = analyzeMarket(stock, history, cut);
  const changed = structuredClone(history);
  for (const interval of ["1m", "5m", "15m"] as const)
    for (const p of changed[interval])
      if (p.time + { "1m": 60, "5m": 300, "15m": 900 }[interval] > cut) {
        p.open *= 10;
        p.high *= 10;
        p.low *= 10;
        p.close *= 10;
      }
  expect(analyzeMarket(stock, changed, cut)).toEqual(before);
  const prefix = structuredClone(history);
  for (const interval of ["1m", "5m", "15m"] as const)
    prefix[interval] = cleanHistory(prefix[interval], interval, cut);
  expect(analyzeMarket(stock, prefix, cut)).toEqual(before);
  expect(before.charts["15m"].at(-1)!.time + 900).toBeLessThanOrEqual(
    before.timeframes.oneMinute.current.time + 60,
  );
});
test("configured RCI periods reach all three timeframes in the engine", () => {
  const history = intradayHistory();
  for (const interval of ["1m", "5m", "15m"] as const) {
    const bars = history[interval];
    [105, 104, 103, 102, 101, 103, 102].forEach((price, i) => {
      const bar = bars[bars.length - 7 + i];
      bar.open = bar.close = price;
      bar.high = price + 1;
      bar.low = price - 1;
    });
  }
  const stock = { code: "TEST", name: "テスト専用", market: null };
  const asOf = history["1m"].at(-1)!.time + 60;
  const baseline = analyzeMarket(stock, history, asOf);
  const configured = analyzeMarket(stock, history, asOf, [], {
    ...analysisConfig,
    rciPeriod: 3,
  });
  for (const frame of Object.values(configured.timeframes))
    expect(frame.current.rci).toBeCloseTo(50, 10);
  for (const frame of Object.values(baseline.timeframes))
    expect(frame.current.rci).not.toBeCloseTo(50, 10);
});
test("closed market, lunch recess and stale quotes return the correct market state", () => {
  const t = (text: string) => Date.parse(text) / 1000;
  expect(
    marketState(t("2026-10-04T10:00:00+09:00"), t("2026-10-02T15:24:00+09:00")),
  ).toBe("CLOSED");
  expect(
    marketState(t("2026-10-05T12:00:00+09:00"), t("2026-10-05T11:29:00+09:00")),
  ).toBe("BREAK");
  expect(
    marketState(t("2026-10-05T10:00:00+09:00"), t("2026-10-02T15:24:00+09:00")),
  ).toBe("STALE");
});
test("insufficient statistical evidence forces WAIT and null prices", () => {
  const history = intradayHistory();
  const result = analyzeMarket(
    { code: "TEST", name: "test", market: null },
    history,
    history["1m"].at(-100)!.time + 60,
    [],
    {
      ...analysisConfig,
      similarity: { ...analysisConfig.similarity, minSamples: 1000 },
    },
  );
  expect(result.signal).toBe("WAIT");
  expect(result.entry).toBeNull();
  expect(result.takeProfit).toEqual([]);
  expect(result.rciProjection.every((p) => p.probability === null)).toBe(true);
});
test("backtest metrics report win rate, profit factor, expectancy and drawdown", () => {
  expect(backtestMetrics([10, -5, -5, 20])).toEqual({
    trades: 4,
    wins: 2,
    losses: 2,
    winRate: 50,
    averageProfit: 15,
    averageLoss: -5,
    profitFactor: 3,
    expectancy: 5,
    netProfit: 20,
    maxDrawdown: 10,
    maximumLosingStreak: 2,
  });
  expect(backtestMetrics([]).expectancy).toBeNull();
});
