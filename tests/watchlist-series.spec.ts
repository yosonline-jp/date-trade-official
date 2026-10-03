import { test, expect } from "@playwright/test";
import { watchlistSeries } from "../src/lib/market/watchlist-series";
import type { YahooChart } from "../src/lib/market/provider";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CandleRaw } from "../src/components/mini-candle-chart";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import ts from "typescript";

// Compile real React JSX rather than Playwright's component-test JSX transport.
const component = {} as { default: ComponentType<{ data: CandleRaw[] }> };
runInNewContext(
  ts.transpileModule(
    readFileSync("src/components/mini-candle-chart.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText,
  { exports: component, require: createRequire(resolve("package.json")) },
);
const MiniCandleChart = component.default;

test("watchlist transmits 30 sessions with the same displayed prices and latest date", () => {
  const rows = Array.from({ length: 250 }, (_, i) => ({
    ts: 1700000000 + i * 86400,
    open: 100 + i,
    high: 104 + i,
    low: 98 + i,
    close: 102 + i,
  }));
  const chart: YahooChart = {
    meta: {},
    timestamp: rows.map((row) => row.ts),
    indicators: {
      quote: [
        {
          open: rows.map((row) => row.open),
          high: rows.map((row) => row.high),
          low: rows.map((row) => row.low),
          close: rows.map((row) => row.close),
          volume: [],
        },
      ],
    },
  };
  const compact = watchlistSeries(chart);
  expect(compact).toEqual(rows.slice(-30));
  expect(
    renderToStaticMarkup(createElement(MiniCandleChart, { data: compact })),
  ).toBe(renderToStaticMarkup(createElement(MiniCandleChart, { data: rows })));
  expect(compact.at(-1)?.ts).toBe(rows.at(-1)?.ts);
  expect(JSON.stringify(compact).length).toBeLessThan(
    JSON.stringify(rows).length * 0.13,
  );
  // A null OHLC row is omitted before selecting the final 30 sessions.
  chart.indicators.quote[0].open[249] = null;
  expect(watchlistSeries(chart)).toEqual(rows.slice(-31, -1));
});

test("empty and partial histories stay empty or retain all valid sessions", () => {
  expect(watchlistSeries()).toEqual([]);
  expect(
    watchlistSeries({
      meta: {},
      timestamp: [3, 1, 2],
      indicators: {
        quote: [
          {
            open: [3, 1, null],
            high: [4, 2, 3],
            low: [2, 0, 1],
            close: [3, 1, 2],
            volume: [],
          },
        ],
      },
    }),
  ).toEqual([
    { ts: 1, open: 1, high: 2, low: 0, close: 1 },
    { ts: 3, open: 3, high: 4, low: 2, close: 3 },
  ]);
});
