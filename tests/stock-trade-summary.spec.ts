import { expect, test } from "@playwright/test";
import {
  getPersonalTradeSummary,
  type TradeProfitRow,
} from "../src/lib/stock-trade-summary";

const viewer = "viewer-id";
const row = (
  profit: unknown,
  type: string | null = "real",
  user_id: string | null = viewer,
): TradeProfitRow => ({ user_id, type, profit });
const empty = {
  recordCount: 0,
  profitCount: 0,
  missingProfitCount: 0,
  totalProfit: null,
  winRate: null,
  averageProfit: null,
};

test("unauthenticated viewers never receive a personal summary", () => {
  const rows = [row(100), row(1000000, "real", "other-id")];
  for (const viewerId of [null, "", "   "]) {
    expect(getPersonalTradeSummary(rows, viewerId)).toBeNull();
  }
});

test("strict owner IDs exclude other people and missing owners independently of profiles", () => {
  const rows: (TradeProfitRow & { users?: { id: string } | null })[] = [
    { ...row(75), users: null },
    { ...row(1000000000000, "real", "other-id"), users: { id: viewer } },
    { ...row(500000, "real", null), users: { id: viewer } },
    { ...row(900000, "real", "Viewer-id"), users: null },
    { ...row(300000, "real", "viewer-id "), users: null },
  ];
  expect(getPersonalTradeSummary(rows, viewer)?.real).toEqual({
    recordCount: 1,
    profitCount: 1,
    missingProfitCount: 0,
    totalProfit: 75,
    winRate: 100,
    averageProfit: 75,
  });
});

test("the owner's public and private trades contribute to the same personal summary", () => {
  const rows: (TradeProfitRow & { visibility: "public" | "private" })[] = [
    { ...row(120), visibility: "public" },
    { ...row(-40), visibility: "private" },
    { ...row(1000000, "real", "other-id"), visibility: "public" },
  ];
  expect(getPersonalTradeSummary(rows, viewer)?.real).toEqual({
    recordCount: 2,
    profitCount: 2,
    missingProfitCount: 0,
    totalProfit: 80,
    winRate: 50,
    averageProfit: 40,
  });
});

test("real and demo remain separate and unknown trade types do not enter either total", () => {
  const result = getPersonalTradeSummary(
    [
      row(100),
      row(-50),
      row(-30, "demo"),
      row(10, "demo"),
      row(9999, "paper"),
      row(9999, null),
    ],
    viewer,
  );
  expect(result?.real).toEqual({
    recordCount: 2,
    profitCount: 2,
    missingProfitCount: 0,
    totalProfit: 50,
    winRate: 50,
    averageProfit: 25,
  });
  expect(result?.demo).toEqual({
    recordCount: 2,
    profitCount: 2,
    missingProfitCount: 0,
    totalProfit: -20,
    winRate: 50,
    averageProfit: -10,
  });
});

test("missing and malformed profits retain record counts while finite numbers and strings aggregate", () => {
  const missing = [
    null,
    undefined,
    "",
    "  ",
    NaN,
    Infinity,
    -Infinity,
    true,
    false,
    {},
    [],
    "abc",
    "Infinity",
    "NaN",
  ];
  const rows = [
    row(100),
    row("-20"),
    row(0),
    row(" 40.5 "),
    ...missing.map((profit) => row(profit)),
  ];
  expect(getPersonalTradeSummary(rows, viewer)?.real).toEqual({
    recordCount: 4 + missing.length,
    profitCount: 4,
    missingProfitCount: missing.length,
    totalProfit: 120.5,
    winRate: 50,
    averageProfit: 30.125,
  });
});

test("zero profits remain valid for the win-rate and average denominators", () => {
  const result = getPersonalTradeSummary(
    [row(100), row(0), row("0"), row(null)],
    viewer,
  );
  expect(result?.real).toMatchObject({
    recordCount: 4,
    profitCount: 3,
    missingProfitCount: 1,
    totalProfit: 100,
  });
  expect(result?.real.winRate).toBeCloseTo(100 / 3, 10);
  expect(result?.real.averageProfit).toBeCloseTo(100 / 3, 10);
  expect(
    getPersonalTradeSummary([row(0), row("0")], viewer)?.real,
  ).toMatchObject({
    totalProfit: 0,
    winRate: 0,
    averageProfit: 0,
  });
});

test("empty accounts and records without any valid profit distinguish counts from absent metrics", () => {
  expect(getPersonalTradeSummary([], viewer)).toEqual({
    real: empty,
    demo: empty,
  });
  expect(
    getPersonalTradeSummary([row(null), row(""), row(NaN)], viewer),
  ).toEqual({
    real: {
      recordCount: 3,
      profitCount: 0,
      missingProfitCount: 3,
      totalProfit: null,
      winRate: null,
      averageProfit: null,
    },
    demo: empty,
  });
});

test("aggregation uses saved profit without recomputing price differences or modifying records", () => {
  const rows = Object.freeze([
    Object.freeze({
      ...row(123.45),
      buy_price: 100,
      sell_price: 200,
      quantity: 100,
      fees: 999,
    }),
    Object.freeze({
      ...row(-23.45),
      buy_price: 1000,
      sell_price: 5000,
      quantity: 10000,
      fees: 0,
    }),
  ]);
  const original = structuredClone(rows);
  const result = getPersonalTradeSummary(rows, viewer);
  expect(result?.real.totalProfit).toBe(100);
  expect(result?.real.averageProfit).toBe(50);
  expect(getPersonalTradeSummary(rows, viewer)).toEqual(result);
  expect(rows).toEqual(original);
});
