import { expect, test } from "@playwright/test";
import {
  HISTORY_LIMIT,
  historyKey,
  parseHistory,
  upsertHistory,
  type HistoryEntry,
  type HistoryInput,
} from "../src/lib/stock-history";

function entry(
  code = "285A",
  viewedAt = 100,
  extra: Partial<HistoryEntry> = {},
): HistoryEntry {
  return {
    code,
    name: "テスト銘柄",
    market: "プライム",
    viewedAt,
    timeframe: "1m",
    preset: "standard",
    chartOpen: true,
    ...extra,
  };
}

function input(extra: Partial<HistoryInput> = {}): HistoryInput {
  return {
    code: "285A",
    name: "テスト銘柄",
    market: "プライム",
    timeframe: "1m",
    preset: "standard",
    chartOpen: true,
    ...extra,
  };
}

function saved(entries: unknown[], version: unknown = 1) {
  return JSON.stringify({ version, entries });
}

test("chart and analysis use separate keys and retain only the timeframes supported by each feature", () => {
  expect(historyKey("chart")).toBe("daytrade.recent.chart.v1");
  expect(historyKey("analysis")).toBe("daytrade.recent.analysis.v1");
  const rows = [
    entry("1000", 1, { timeframe: "1m" }),
    entry("1001", 2, { timeframe: "5m", preset: "daytrade" }),
    entry("1002", 3, { timeframe: "15m", preset: "trend" }),
    entry("1003", 4, { timeframe: "daily" }),
    entry("1004", 5, { timeframe: "weekly" }),
  ];
  expect(
    parseHistory(saved(rows), "chart").map((row) => row.timeframe),
  ).toEqual(["weekly", "daily", "15m", "5m", "1m"]);
  expect(
    parseHistory(saved(rows), "analysis").map((row) => row.timeframe),
  ).toEqual(["15m", "5m", "1m"]);
  expect(
    upsertHistory([], input({ timeframe: "daily" }), "analysis", 10),
  ).toEqual([]);
});

test("storage normalizes names and codes while dropping user information, prices, and unknown fields", () => {
  const raw = saved([
    {
      ...entry(" 285a ", 0, {
        name: "  銘柄名  ",
        market: "  グロース  ",
        chartOpen: false,
      }),
      user_id: "private-user",
      email: "private@example.test",
      price: 12345,
      comment: "private-note",
    },
  ]);
  expect(parseHistory(raw, "chart")).toEqual([
    entry("285A", 0, { name: "銘柄名", market: "グロース", chartOpen: false }),
  ]);
  expect(
    parseHistory(saved([entry("1234A", 1, { market: null })]), "chart")[0]
      .market,
  ).toBeNull();
});

test("duplicate codes keep the latest visit and its settings before sorting newest first", () => {
  const rows = [
    entry("285a", 10, { preset: "standard" }),
    entry("7203", 40),
    entry("285A", 50, { timeframe: "15m", preset: "trend", chartOpen: false }),
    entry(" 285A ", 20, { preset: "daytrade" }),
    entry("8306", 30),
  ];
  const result = parseHistory(saved(rows), "chart");
  expect(result.map((row) => [row.code, row.viewedAt])).toEqual([
    ["285A", 50],
    ["7203", 40],
    ["8306", 30],
  ]);
  expect(result[0]).toMatchObject({
    timeframe: "15m",
    preset: "trend",
    chartOpen: false,
  });
});

test("history keeps the newest 20 unique stocks and evicts the oldest on the next visit", () => {
  const rows = Array.from({ length: 25 }, (_, index) =>
    entry(String(1000 + index), index),
  );
  const parsed = parseHistory(saved(rows), "chart");
  expect(HISTORY_LIMIT).toBe(20);
  expect(parsed).toHaveLength(20);
  expect(parsed.map((row) => row.code)).toEqual(
    Array.from({ length: 20 }, (_, index) => String(1024 - index)),
  );
  const updated = upsertHistory(parsed, input({ code: "1025" }), "chart", 25);
  expect(updated).toHaveLength(20);
  expect(updated[0].code).toBe("1025");
  expect(updated.at(-1)?.code).toBe("1006");
  expect(updated.some((row) => row.code === "1005")).toBe(false);
});

test("revisiting a stock replaces all navigation settings without mutating the existing history or input", () => {
  const rows = Object.freeze([
    Object.freeze(entry("7203", 300)),
    Object.freeze(entry("285A", 100)),
  ]);
  const nextInput = Object.freeze(
    input({
      code: " 285a ",
      name: "更新銘柄",
      market: null,
      timeframe: "5m",
      preset: "trend",
      chartOpen: false,
    }),
  );
  const result = upsertHistory(rows, nextInput, "chart", 400);
  expect(result).toEqual([
    entry("285A", 400, {
      name: "更新銘柄",
      market: null,
      timeframe: "5m",
      preset: "trend",
      chartOpen: false,
    }),
    entry("7203", 300),
  ]);
  expect(rows[1].viewedAt).toBe(100);
  expect(nextInput.code).toBe(" 285a ");
});

test("the current visit is first for equal timestamps and after a backwards device clock change", () => {
  const rows = [entry("7203", 100), entry("285A", 90)];
  expect(
    upsertHistory(rows, input(), "chart", 100).map((row) => row.code),
  ).toEqual(["285A", "7203"]);
  const inserted = upsertHistory(rows, input({ code: "8306" }), "chart", 100);
  expect(inserted.map((row) => row.code)).toEqual(["8306", "7203", "285A"]);
  const clockMovedBack = upsertHistory(rows, input(), "chart", 10);
  expect(clockMovedBack.map((row) => [row.code, row.viewedAt])).toEqual([
    ["285A", 10],
    ["7203", 100],
  ]);
});

test("corrupt JSON, invalid envelopes, and unsupported versions safely produce an empty history", () => {
  for (const raw of [
    null,
    "",
    "{",
    "null",
    "[]",
    "{}",
    JSON.stringify({ entries: [entry()] }),
    saved([entry()], 2),
    saved([entry()], "1"),
    JSON.stringify({ version: 1, entries: null }),
    JSON.stringify({ version: 1, entries: { code: "285A" } }),
  ]) {
    expect(parseHistory(raw, "chart"), String(raw)).toEqual([]);
  }
});

test("invalid entries are skipped individually including invalid enums, fields, and unrepresentable dates", () => {
  const invalidEntries = [
    null,
    [],
    {},
    { ...entry(), code: "123" },
    { ...entry(), code: "123456" },
    { ...entry(), code: "../285A" },
    { ...entry(), code: "１２３４" },
    { ...entry(), name: " \n " },
    { ...entry(), name: "株".repeat(161) },
    { ...entry(), market: 1 },
    { ...entry(), market: "市".repeat(121) },
    { ...entry(), viewedAt: -1 },
    { ...entry(), viewedAt: "100" },
    { ...entry(), viewedAt: Number.MAX_VALUE },
    { ...entry(), viewedAt: 8640000000000001 },
    { ...entry(), timeframe: "1h" },
    { ...entry(), preset: "unknown" },
    { ...entry(), chartOpen: "true" },
  ];
  const valid = entry("7203", 0, {
    name: "株".repeat(160),
    market: "市".repeat(120),
  });
  expect(parseHistory(saved([...invalidEntries, valid]), "chart")).toEqual([
    valid,
  ]);
  const maxDate = entry("8306", 8640000000000000);
  expect(parseHistory(saved([maxDate]), "chart")).toEqual([maxDate]);
});

test("invalid updates retain a normalized existing history rather than adding a broken visit", () => {
  const dirty = [
    { ...entry("285a", 10), price: 123 },
    entry("7203", 30),
    entry("285A", 20),
    { ...entry("8306", 15), timeframe: "invalid" },
  ] as unknown as HistoryEntry[];
  const normalized = [entry("7203", 30), entry("285A", 20)];
  for (const invalid of [
    { code: "bad" },
    { name: " " },
    { market: "市".repeat(121) },
    { preset: "invalid" },
    { chartOpen: 1 },
  ]) {
    expect(
      upsertHistory(
        dirty,
        { ...input(), ...invalid } as unknown as HistoryInput,
        "chart",
        40,
      ),
    ).toEqual(normalized);
  }
  for (const now of [-1, NaN, Infinity, Number.MAX_VALUE]) {
    expect(upsertHistory(dirty, input(), "chart", now)).toEqual(normalized);
  }
});
