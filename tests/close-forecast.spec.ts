import { test, expect } from "@playwright/test";
import {
  analyzeCloseHistory,
  forecastBars,
} from "../src/lib/market/close-forecast";
import type { CloseHistoryRange } from "../src/lib/market/close-forecast";
import fixtures from "./fixtures/close-forecast.json";

for (const fixture of fixtures.cases) {
  test(`close forecast matches the original Python result: ${fixture.name}`, async () => {
    const calls: CloseHistoryRange[] = [];
    const result = await analyzeCloseHistory(async (range) => {
      calls.push(range);
      return range === "1mo" ? fixture.oneMonth : fixture.threeMonths;
    });
    expect(calls).toEqual(fixture.calls);
    expect(result.score).toBe(fixture.expected.score);
    expect(result.dataPoints).toBe(fixture.expected.dataPoints);
    expect(result.historyRange).toBe(fixture.expected.historyRange);
    expect(result.startPrice).toBeCloseTo(fixture.expected.startPrice, 10);
    expect(result.analysisClose).toBeCloseTo(
      fixture.expected.analysisClose,
      10,
    );
    expect(result.predictedClose).toBeCloseTo(
      fixture.expected.predictedClose,
      10,
    );
    for (const key of [
      "ema5",
      "ema20",
      "rsi14",
      "macd",
      "macdSignal",
      "macdHistogram",
      "atr14",
    ] as const) {
      const expected = fixture.expected.indicators[key];
      if (expected === null) expect(result.indicators[key]).toBeNull();
      else expect(result.indicators[key]).toBeCloseTo(expected, 10);
    }
  });
}

test("close forecast rejects unavailable data instead of returning a placeholder", async () => {
  const empty = {
    meta: {},
    timestamp: [],
    indicators: {
      quote: [{ open: [], high: [], low: [], close: [], volume: [] }],
    },
  };
  expect(forecastBars(empty)).toEqual([]);
  await expect(analyzeCloseHistory(async () => empty)).rejects.toThrow(
    /日足データ/,
  );
});
