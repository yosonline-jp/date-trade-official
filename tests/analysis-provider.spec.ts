import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { analysisConfig } from "../src/lib/analysis/config";
import { AnalysisError } from "../src/lib/analysis/signal";
import { seconds } from "../src/lib/analysis/similarity";
import type { Interval } from "../src/lib/analysis/types";

function provider(fetcher: (url: URL) => Promise<Response>) {
  const exported = {};
  runInNewContext(
    ts.transpileModule(readFileSync("src/lib/analysis/provider.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports: exported,
      Date,
      Error,
      Map,
      Set,
      Promise,
      URL,
      URLSearchParams,
      AbortSignal,
      fetch: fetcher,
      require(name: string) {
        if (name === "server-only") return {};
        if (name === "@/utils/supabase/server") return {};
        if (name === "./config") return { analysisConfig };
        if (name === "./signal") return { AnalysisError };
        if (name === "./similarity") return { seconds };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  return new (
    exported as {
      YahooStockDataProvider: new () => {
        getIntradayData(symbol: string, interval: Interval): Promise<unknown[]>;
      };
    }
  ).YahooStockDataProvider();
}
function response(times = [Date.parse("2026-10-02T09:00:00+09:00") / 1000]) {
  return Response.json({
    chart: {
      result: [
        {
          meta: {},
          timestamp: times,
          indicators: {
            quote: [
              {
                open: times.map(() => 100),
                high: times.map(() => 101),
                low: times.map(() => 99),
                close: times.map(() => 100),
                volume: times.map(() => 1000),
              },
            ],
          },
        },
      ],
    },
  });
}
test("1m history uses seven-day chunks, deduplication and shared short-lived caching", async () => {
  const requests: URL[] = [];
  const p = provider(async (url) => {
    requests.push(url);
    await Promise.resolve();
    return response();
  });
  const [first, second] = await Promise.all([
    p.getIntradayData("7203.T", "1m"),
    p.getIntradayData("7203.T", "1m"),
  ]);
  expect(requests).toHaveLength(5);
  expect(first).toEqual(second);
  expect(first).toHaveLength(1);
  expect(
    requests.every(
      (url) =>
        Number(url.searchParams.get("period2")) -
          Number(url.searchParams.get("period1")) <=
        7 * 86400,
    ),
  ).toBe(true);
  await p.getIntradayData("7203.T", "1m");
  expect(requests).toHaveLength(5);
});
test("rate limits and timeouts are typed and failed requests can retry", async () => {
  let calls = 0;
  const p = provider(async () => {
    calls++;
    return calls === 1 ? new Response("", { status: 429 }) : response();
  });
  expect(
    await p.getIntradayData("7203.T", "5m").catch((error: unknown) => error),
  ).toMatchObject({
    kind: "RATE_LIMIT",
  });
  expect(await p.getIntradayData("7203.T", "5m")).toHaveLength(1);
  expect(calls).toBe(2);
  const timeout = provider(async () => {
    throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
  });
  expect(
    await timeout
      .getIntradayData("7203.T", "15m")
      .catch((error: unknown) => error),
  ).toMatchObject({
    kind: "TIMEOUT",
  });
});
test("holiday-only chunks and recess quotes are excluded without fabricated candles", async () => {
  const empty = provider(async () =>
    Response.json({ chart: { result: [{ meta: {} }] } }),
  );
  expect(await empty.getIntradayData("7203.T", "5m")).toEqual([]);
  const filtered = provider(async () =>
    response([
      Date.parse("2026-10-02T11:30:00+09:00") / 1000,
      Date.parse("2026-10-02T15:30:00+09:00") / 1000,
    ]),
  );
  expect(await filtered.getIntradayData("7203.T", "1m")).toEqual([]);
});
