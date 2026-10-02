import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "journal-tests-"));
for (const name of ["journal", "journal-csv"]) {
  const source = await fs.readFile("src/lib/" + name + ".ts", "utf8");
  const compiled = ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace(/from ["']\.\/journal["']/g, 'from "./journal.mjs"');
  await fs.writeFile(path.join(temp, name + ".mjs"), compiled);
}
const { calendarRecords, analyzeTrades, periodRange, tradeProfit, validDate } =
  await import(pathToFileURL(path.join(temp, "journal.mjs")));
const { parseCsv, previewImport, tradeFingerprint, suggestMapping } =
  await import(pathToFileURL(path.join(temp, "journal-csv.mjs")));
const trade = (profit, date = "2026-10-01", overrides = {}) => ({
  id: 1,
  stock_code: "7203",
  stock_name: "トヨタ",
  buy_price: 100,
  sell_price: 110,
  quantity: 10,
  profit,
  trade_date: date,
  trade_type: "現物",
  type: "real",
  memo: "",
  ...overrides,
});
test("profits subtract fees for both long and short trades", () => {
  assert.equal(tradeProfit(trade(0, "2026-10-01", { fees: 10 })), 90);
  assert.equal(
    tradeProfit(trade(0, "2026-10-01", { trade_type: "売建", fees: 10 })),
    -110,
  );
});
test("analytics include zero-profit trades in win rate and compute daily drawdown", () => {
  const stats = analyzeTrades([
    trade(-50, "2026-10-03"),
    trade(100),
    trade(-20, "2026-10-02"),
    trade(0),
  ]);
  assert.equal(stats.total, 30);
  assert.equal(stats.winRate, 25);
  assert.equal(stats.drawdown, 70);
  assert.equal(stats.averageLoss, 35);
  assert.equal(stats.profitFactor, 100 / 70);
});
test("initial losses count toward drawdown and empty statistics are defined", () => {
  assert.equal(analyzeTrades([trade(-100)]).drawdown, 100);
  assert.equal(analyzeTrades([]).profitFactor, null);
  assert.equal(analyzeTrades([]).total, 0);
});
test("month and year buckets cross year boundaries", () => {
  const s = analyzeTrades([trade(10, "2025-12-31"), trade(20, "2026-01-01")]);
  assert.equal(s.years.length, 2);
  assert.equal(s.months[0].profit, 10);
});
test("weekly and monthly ranges cover year changes and leap years", () => {
  assert.deepEqual(periodRange("week", "2026-01-01"), {
    start: "2025-12-29",
    end: "2026-01-04",
  });
  assert.deepEqual(periodRange("month", "2024-02-29"), {
    start: "2024-02-01",
    end: "2024-02-29",
  });
  assert.equal(validDate("2026-02-30"), false);
});
test("CSV handles BOM, CRLF, quoted commas, escaped quotes and multiline notes", () => {
  const csv = parseCsv('\uFEFFcode,memo\r\n7203,"a,b\n""quoted"""\r\n');
  assert.equal(csv.rows[0][1], 'a,b\n"quoted"');
});
test("CSV rejects unclosed quotes and uneven columns", () => {
  assert.throws(() => parseCsv('a,b\n1,"oops'));
  assert.throws(() => parseCsv("a,b\n1"));
});
test("completed imports normalize dates and calculate fees", () => {
  const csv = parseCsv(
    "銘柄コード,取引日,買値,売値,数量,手数料\n7203,2026/1/2,100,110,10,5",
  );
  const p = previewImport(
    csv.rows,
    suggestMapping(csv.headers),
    "completed",
    "real",
    "private",
  );
  assert.equal(p.errors.length, 0);
  assert.equal(p.trades[0].profit, 95);
  assert.equal(p.trades[0].trade_date, "2026-01-02");
});
test("FIFO executions allocate opening and closing fees through partial closes", () => {
  const csv = parseCsv(
    "銘柄コード,約定日,売買,単価,数量,手数料\n7203,2026-10-01,買,100,100,100\n7203,2026-10-02,買,110,100,100\n7203,2026-10-03,売,120,150,150",
  );
  const p = previewImport(
    csv.rows,
    suggestMapping(csv.headers),
    "executions",
    "real",
    "private",
  );
  assert.equal(p.errors.length, 0);
  assert.deepEqual(
    p.trades.map((t) => [t.quantity, t.buy_price, t.fees, t.profit]),
    [
      [100, 100, 200, 1800],
      [50, 110, 100, 400],
    ],
  );
  assert.equal(p.unmatched.length, 1);
});
test("short executions match selling then buying and skip unmatched closes", () => {
  const csv = parseCsv(
    "銘柄コード,約定日,売買,単価,数量\n7203,2026-10-01,売建,120,10\n7203,2026-10-02,買返済,100,10\n7203,2026-10-03,売,110,10",
  );
  const p = previewImport(
    csv.rows,
    suggestMapping(csv.headers),
    "executions",
    "real",
    "private",
  );
  assert.equal(p.trades[0].profit, 200);
  assert.equal(p.trades[0].trade_type, "売建");
  assert.equal(p.unmatched.length, 1);
});
test("invalid numeric rows and invalid dates never become trades", () => {
  const csv = parseCsv(
    "銘柄コード,取引日,買値,売値,数量\n7203,2026-02-30,100,110,10\n7203,2026-10-01,100,110,0",
  );
  const p = previewImport(
    csv.rows,
    suggestMapping(csv.headers),
    "completed",
    "real",
    "private",
  );
  assert.equal(p.trades.length, 0);
  assert.equal(p.errors.length, 2);
});
test("duplicate fingerprint ignores notes and separates real/demo and short/long", () => {
  assert.equal(
    tradeFingerprint(trade(10)),
    tradeFingerprint(trade(10, "2026-10-01", { memo: "other" })),
  );
  assert.notEqual(
    tradeFingerprint(trade(10)),
    tradeFingerprint(trade(10, "2026-10-01", { type: "demo" })),
  );
});
process.on("exit", () => {
  /* Temporary transpiled files live in the container tmp directory. */
});

test("automatic calendar preserves manual entries and counts fees and adjustments only once", () => {
  const rows = [
    { id: 10, date: "2026-10-01", amount: 888, adjustment_amount: -5 },
    { id: 11, date: "2026-10-02", amount: 100, adjustment_amount: 0 },
  ];
  const trades = [trade(95), trade(1000, "2026-10-01", { type: "demo" })];
  assert.equal(
    calendarRecords(rows, trades, "manual")["2026-10-01"].amount,
    888,
  );
  const auto = calendarRecords(rows, trades, "trades");
  assert.equal(auto["2026-10-01"].amount, 90);
  assert.equal(auto["2026-10-01"].tradeTotal, 95);
  assert.equal(auto["2026-10-02"], undefined);
});
test("calendar retains zero-profit trading days and standalone adjustments", () => {
  const auto = calendarRecords(
    [{ id: 1, date: "2026-10-02", amount: 50, adjustment_amount: -10 }],
    [trade(0)],
    "trades",
  );
  assert.equal(auto["2026-10-01"].amount, 0);
  assert.equal(auto["2026-10-02"].amount, -10);
});
