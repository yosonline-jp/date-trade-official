import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { cleanHistory, marketState } from "../src/lib/analysis/engine";
import { AnalysisError } from "../src/lib/analysis/signal";
import { seconds } from "../src/lib/analysis/similarity";
import {
  technicalLevels,
  technicalSeries,
} from "../src/lib/analysis/stock-technicals";
import type { Candle, Interval, Stock } from "../src/lib/analysis/types";
import { intradayHistory } from "./fixtures/intraday";

type RouteOptions = {
  stock?: Stock | null;
  databaseError?: boolean;
  bars?: Candle[];
  providerError?: unknown;
  asOf?: number;
};

function route(options: RouteOptions = {}) {
  const exported = {};
  const requests: { symbol: string; interval: Interval }[] = [];
  let databaseCalls = 0;
  const stock =
    options.stock === undefined
      ? { code: "285A", name: "テスト銘柄", market: "東証グロース" }
      : options.stock;
  const clock = options.asOf ?? Date.parse("2026-09-07T15:30:00+09:00");
  class Clock extends Date {
    static now() {
      return clock;
    }
  }
  class Provider {
    warnings = new Set(["配信元の履歴制限"]);
    async getIntradayData(symbol: string, interval: Interval) {
      requests.push({ symbol, interval });
      if (options.providerError) throw options.providerError;
      return options.bars ?? intradayHistory(1)[interval];
    }
  }
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({
      data: stock,
      error: options.databaseError ? { message: "unavailable" } : null,
    }),
  };
  runInNewContext(
    ts.transpileModule(
      readFileSync(
        "src/app/(client)/api/stocks/[code]/technicals/route.ts",
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports: exported,
      Date: Clock,
      Response,
      URL,
      require(name: string) {
        if (name === "@/utils/supabase/server")
          return {
            createClient: async () => {
              databaseCalls++;
              return { from: () => query };
            },
          };
        if (name === "@/lib/analysis/provider")
          return { YahooStockDataProvider: Provider };
        if (name === "@/lib/analysis/engine")
          return { cleanHistory, marketState };
        if (name === "@/lib/analysis/signal") return { AnalysisError };
        if (name === "@/lib/analysis/similarity") return { seconds };
        if (name === "@/lib/analysis/stock-technicals")
          return { technicalLevels, technicalSeries };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  const get = (
    exported as {
      GET: (
        request: Request,
        context: { params: Promise<{ code: string }> },
      ) => Promise<Response>;
    }
  ).GET;
  return {
    requests,
    databaseCalls: () => databaseCalls,
    get(code = "285A", interval?: string, limit?: string) {
      const params = new URLSearchParams();
      if (interval !== undefined) params.set("interval", interval);
      if (limit !== undefined) params.set("limit", limit);
      const query = params.size ? `?${params}` : "";
      return get(
        new Request(`http://localhost/api/stocks/${code}/technicals${query}`),
        {
          params: Promise.resolve({ code }),
        },
      );
    },
  };
}

test("technical API validates symbol and interval before fetching data", async () => {
  const api = route();
  for (const [code, interval] of [
    ["../../env", "1m"],
    ["285a", "1m"],
    ["285A", "daily"],
    ["285A", ""],
  ]) {
    const response = await api.get(code, interval);
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  }
  expect(api.databaseCalls()).toBe(0);
  expect(api.requests).toEqual([]);
});

test("technical API preserves missing, delisted and database-error statuses", async () => {
  const missing = route({ stock: null });
  expect((await missing.get()).status).toBe(404);
  expect(missing.requests).toEqual([]);
  const delisted = route({
    stock: { code: "285A", name: "テスト銘柄", market: "上場廃止" },
  });
  expect((await delisted.get()).status).toBe(422);
  expect(delisted.requests).toEqual([]);
  const failed = route({ databaseError: true });
  expect((await failed.get()).status).toBe(503);
  expect(failed.requests).toEqual([]);
});

test("technical API warms up full history and returns only the latest 240 completed candles", async () => {
  const bars = intradayHistory(1)["1m"];
  const pending = { ...bars.at(-1)!, time: bars.at(-1)!.time + 60 };
  const api = route({ bars: [...bars, pending] });
  const response = await api.get();
  expect(response.status).toBe(200);
  expect(api.requests).toEqual([{ symbol: "285A.T", interval: "1m" }]);
  const body = await response.json();
  expect(body).toMatchObject({
    symbol: "285A",
    name: "テスト銘柄",
    interval: "1m",
    dataAt: "2026-09-07T06:30:00.000Z",
    analyzedAt: "2026-09-07T06:30:00.000Z",
    source: {
      provider: "Yahoo Finance",
      marketState: "CLOSED",
      bars: 330,
      warnings: ["配信元の履歴制限"],
    },
  });
  expect(body.points).toHaveLength(240);
  expect(body.points[0].rsi).toBe(technicalSeries(bars)[90].rsi);
  expect(body.points[0].rsi).not.toBeNull();
  expect(body.points.at(-1).time).toBe(bars.at(-1)!.time);
  expect(body.levels).toEqual(technicalLevels(bars, "intraday"));
});

test("technical API allows short history with null indicators and rejects empty history", async () => {
  const bars = intradayHistory(1)["1m"].slice(0, 1);
  const response = await route({ bars }).get();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.source.bars).toBe(1);
  expect(body.points[0].rsi).toBeNull();
  expect(body.points[0].ema100).toBeNull();
  const empty = await route({ bars: [] }).get();
  expect(empty.status).toBe(422);
  expect(await empty.json()).toMatchObject({ kind: "INSUFFICIENT_DATA" });
});

test("technical API maps rate limits, timeouts and provider failures without fabricated data", async () => {
  for (const [kind, status] of [
    ["RATE_LIMIT", 429],
    ["TIMEOUT", 504],
    ["PROVIDER", 503],
  ] as const) {
    const response = await route({
      providerError: new AnalysisError("配信元でエラー", kind),
    }).get("285A", "5m");
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body).toEqual({ error: "配信元でエラー", kind });
    expect(body.points).toBeUndefined();
    expect(response.headers.get("Retry-After")).toBe(
      kind === "RATE_LIMIT" ? "60" : null,
    );
  }
  const unexpected = await route({ providerError: new Error("network") }).get();
  expect(unexpected.status).toBe(503);
});

test("technical API evaluates freshness from the end of the selected timeframe", async () => {
  const last = intradayHistory(1)["15m"][1];
  const response = await route({
    bars: [last],
    asOf: Date.parse("2026-09-07T09:49:00+09:00"),
  }).get("285A", "15m");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.dataAt).toBe("2026-09-07T00:30:00.000Z");
  expect(body.source.marketState).toBe("OPEN");
});

test("technical API rejects invalid limits before database or provider access", async () => {
  const api = route();
  for (const limit of [
    "",
    "0",
    "119",
    "1501",
    "120.5",
    "120.0",
    "-120",
    "NaN",
    "Infinity",
    "1e3",
    " 120 ",
  ]) {
    const response = await api.get("285A", "1m", limit);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "表示本数は120〜1500の整数で指定してください。",
    });
  }
  expect(api.databaseCalls()).toBe(0);
  expect(api.requests).toEqual([]);
});

test("technical API supports 1200-bar chart payloads with full-history indicator warmup", async () => {
  const bars = intradayHistory(7)["1m"];
  const api = route({ bars, asOf: (bars.at(-1)!.time + 60) * 1000 });
  const response = await api.get("285A", "1m", "1200");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.points).toHaveLength(1200);
  expect(body.source.bars).toBe(bars.length);
  expect(body.points[0].ema100).toBe(
    technicalSeries(bars)[bars.length - 1200].ema100,
  );
  expect(body.points[0].ema100).not.toBeNull();
  expect(body.points.at(-1).time).toBe(bars.at(-1)!.time);
  for (const limit of ["120", "1500"]) {
    const boundary = await api.get("285A", "1m", limit);
    expect(boundary.status).toBe(200);
    expect((await boundary.json()).points).toHaveLength(Number(limit));
  }
});
