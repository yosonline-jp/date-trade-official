import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function harness(failRefresh = false) {
  const reads: string[] = [];
  let refreshed = false;
  let releaseRefresh = () => {};
  let releaseReads = () => {};
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  const readGate = new Promise<void>((resolve) => {
    releaseReads = resolve;
  });
  class Query {
    constructor(readonly table: string) {}
    select() {
      return this;
    }
    eq() {
      return this;
    }
    order() {
      return this;
    }
    limit() {
      return this;
    }
    async single() {
      if (this.table !== "stocks" && !refreshed)
        throw new Error("Price/chart read started before refresh finished");
      reads.push(this.table);
      await readGate;
      if (this.table === "stocks")
        return {
          data: {
            code: "285A",
            name: "テスト銘柄",
            market: "プライム",
            comments: [],
          },
          error: null,
        };
      if (this.table === "stock_charts")
        return { data: { data: { timestamp: [123] } }, error: null };
      return {
        data: { regular_market_price: failRefresh ? 100 : 105 },
        error: null,
      };
    }
  }
  const exported = {};
  runInNewContext(
    ts.transpileModule(readFileSync("src/lib/market/stock-detail.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports: exported,
      require(name: string) {
        if (name === "server-only") return {};
        if (name === "@/utils/supabase/server")
          return {
            createClient: async () => ({
              from: (table: string) => new Query(table),
            }),
            getRequestUser: async () => ({ data: { user: null } }),
          };
        if (name === "./refresh")
          return {
            ensureFreshStock: async () => {
              await refreshGate;
              refreshed = true;
              if (failRefresh) throw new Error("Provider unavailable");
            },
          };
        throw new Error(`Unexpected import: ${name}`);
      },
      Promise,
    },
  );
  return {
    api: exported as {
      getStockDetail(code: string): Promise<{
        price: { regular_market_price: number };
        stock: { code: string };
        chartData: { data: { timestamp: number[] } };
      }>;
    },
    reads,
    releaseRefresh: () => releaseRefresh(),
    releaseReads: () => releaseReads(),
  };
}

test("detail reads run together while prices and charts wait for refresh", async () => {
  const h = harness();
  const pending = h.api.getStockDetail("285A");
  await expect.poll(() => h.reads).toEqual(["stocks"]);
  h.releaseRefresh();
  await expect
    .poll(() => [...h.reads].sort())
    .toEqual(["daily_prices", "stock_charts", "stocks"]);
  h.releaseReads();
  const result = await pending;
  expect(result.price.regular_market_price).toBe(105);
  expect(result.stock.code).toBe("285A");
  expect(result.chartData.data.timestamp).toEqual([123]);
});

test("a failed refresh still reads the saved detail data", async () => {
  const h = harness(true);
  const pending = h.api.getStockDetail("285A");
  h.releaseRefresh();
  h.releaseReads();
  expect((await pending).price.regular_market_price).toBe(100);
});
