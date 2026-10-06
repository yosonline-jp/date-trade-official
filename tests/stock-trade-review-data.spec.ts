import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { getPersonalTradeSummary } from "../src/lib/stock-trade-summary";
import type { StockTradeReviewData } from "../src/lib/market/stock-trade-review";

type Row = Record<string, unknown>;
type Scope = "public" | "own";
type Request = {
  scope: Scope;
  table: string;
  fields: string;
  filters: Array<[string, unknown]>;
  order: { column: string; ascending: boolean } | null;
  from: number;
  to: number;
};
type HarnessOptions = {
  user?: { id: string } | null;
  authError?: unknown;
  authThrows?: boolean;
  clientThrows?: boolean;
  publicRows?: Row[];
  ownRows?: Row[];
  failScope?: Scope;
  failFrom?: number;
  queryThrows?: boolean;
  publicGate?: Promise<void>;
};

const viewerId = "verified-viewer";
const privateMemo = "private-only-trade-memo";
const internalError = "private database connection detail";

function publicRecord(id: number, extra: Row = {}): Row {
  return {
    id,
    stock_code: "285A",
    stock_name: "テスト銘柄",
    buy_price: 100,
    sell_price: 110,
    quantity: 1,
    profit: 10,
    trade_date: "2026-10-07",
    memo: null,
    trade_type: "買付",
    type: "real",
    created_at: "2026-10-07T00:00:00Z",
    visibility: "public",
    users: {
      id: "other-trader",
      account: "other",
      nickname: "トレーダー",
      avatar: null,
    },
    ...extra,
  };
}

function ownRecord(profit: unknown, extra: Row = {}): Row {
  return { user_id: viewerId, type: "real", profit, ...extra };
}

// The actual loader and pure summary run without a live database or auth session.
// Intentionally ignore mock filters to exercise the loader's final privacy checks.
function harness(options: HarnessOptions = {}) {
  const state = { requests: [] as Request[], authCalls: 0, roleClientCalls: 0 };
  class Query {
    fields = "";
    filters: Array<[string, unknown]> = [];
    sort: Request["order"] = null;
    constructor(readonly table: string) {}
    select(fields: string) {
      this.fields = fields;
      return this;
    }
    eq(column: string, value: unknown) {
      this.filters.push([column, value]);
      return this;
    }
    order(column: string, options: { ascending: boolean }) {
      this.sort = { column, ascending: options.ascending };
      return this;
    }
    returns() {
      return this;
    }
    async range(from: number, to: number) {
      const scope: Scope = this.fields.includes("user_id") ? "own" : "public";
      state.requests.push({
        scope,
        table: this.table,
        fields: this.fields,
        filters: this.filters,
        order: this.sort,
        from,
        to,
      });
      if (scope === "public") await options.publicGate;
      if (options.failScope === scope && from === (options.failFrom ?? 0)) {
        if (options.queryThrows) throw new Error(internalError);
        return { data: null, error: { message: internalError } };
      }
      const rows =
        scope === "public"
          ? (options.publicRows ?? [])
          : (options.ownRows ?? []);
      return { data: rows.slice(from, to + 1), error: null };
    }
  }
  const exported = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync("src/lib/market/stock-trade-review.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports: exported,
      require(name: string) {
        if (name === "server-only") return {};
        if (name === "@/lib/stock-trade-summary")
          return { getPersonalTradeSummary };
        if (name === "@/utils/supabase/server")
          return {
            createClient: async () => {
              if (options.clientThrows) throw new Error(internalError);
              return { from: (table: string) => new Query(table) };
            },
            getRequestUser: async () => {
              state.authCalls++;
              if (options.authThrows) throw new Error(internalError);
              return {
                data: {
                  user:
                    options.user === undefined
                      ? { id: viewerId }
                      : options.user,
                },
                error: options.authError ?? null,
              };
            },
            createRoleClient: () => {
              state.roleClientCalls++;
              throw new Error("Privileged client is forbidden");
            },
          };
        throw new Error(`Unexpected import: ${name}`);
      },
      Promise,
    },
  );
  return {
    api: exported as {
      getStockTradeReviewData(code: string): Promise<StockTradeReviewData>;
    },
    state,
  };
}

function expectSafeQuery(request: Request, scope: Scope) {
  expect(request.table).toBe("trade_records");
  expect(request.filters).toContainEqual(["stock_code", "285A"]);
  expect(request.order).toEqual({ column: "id", ascending: true });
  expect(request.to - request.from + 1).toBe(1000);
  if (scope === "public") {
    expect(request.filters).toContainEqual(["visibility", "public"]);
    expect(request.fields).not.toContain("user_id");
  } else {
    expect(request.filters).toContainEqual(["user_id", viewerId]);
    expect(request.fields.split(",").sort()).toEqual([
      "profit",
      "type",
      "user_id",
    ]);
  }
}

test("anonymous viewers receive public records only and never query private summary data", async () => {
  const h = harness({
    user: null,
    publicRows: [
      publicRecord(1),
      publicRecord(2, { visibility: "private", memo: privateMemo }),
      publicRecord(3, { visibility: null, memo: privateMemo }),
      publicRecord(4, { visibility: undefined, memo: privateMemo }),
    ],
  });
  const result = await h.api.getStockTradeReviewData("285A");
  expect(result.publicRecords.map((record) => record.id)).toEqual([1]);
  expect(result.personalSummary).toBeNull();
  expect(result.historyUnavailable).toBe(false);
  expect(result.summaryUnavailable).toBe(false);
  expect(JSON.stringify(result)).not.toContain(privateMemo);
  expect(h.state.requests).toHaveLength(1);
  expectSafeQuery(h.state.requests[0], "public");
  expect(h.state.roleClientCalls).toBe(0);
});

test("an auth error or auth exception cannot establish ownership even if a user object exists", async () => {
  for (const authOptions of [
    { authError: { message: internalError } },
    { authThrows: true },
  ]) {
    const h = harness({
      ...authOptions,
      publicRows: [publicRecord(1)],
      ownRows: [ownRecord(500)],
    });
    const result = await h.api.getStockTradeReviewData("285A");
    expect(result.publicRecords).toHaveLength(1);
    expect(result.personalSummary).toBeNull();
    expect(result.summaryUnavailable).toBe(false);
    expect(h.state.requests.map((request) => request.scope)).toEqual([
      "public",
    ]);
  }
});

test("personal totals use the verified owner across visibilities and never embedded profile ownership", async () => {
  const h = harness({
    publicRows: [
      publicRecord(1),
      publicRecord(2, { visibility: "private", memo: privateMemo }),
    ],
    ownRows: [
      ownRecord(40, {
        visibility: "private",
        memo: privateMemo,
        users: { id: "other-trader" },
      }),
      ownRecord(-10, { visibility: "public" }),
      ownRecord(null),
      ownRecord("15", { type: "demo" }),
      ownRecord(500, { user_id: "other-trader", users: { id: viewerId } }),
      ownRecord(700, { user_id: null, users: { id: viewerId } }),
    ],
  });
  const result = await h.api.getStockTradeReviewData("285A");
  expect(result.publicRecords.map((record) => record.id)).toEqual([1]);
  expect(result.personalSummary).toEqual({
    real: {
      recordCount: 3,
      profitCount: 2,
      missingProfitCount: 1,
      totalProfit: 30,
      winRate: 50,
      averageProfit: 15,
    },
    demo: {
      recordCount: 1,
      profitCount: 1,
      missingProfitCount: 0,
      totalProfit: 15,
      winRate: 100,
      averageProfit: 15,
    },
  });
  expect(JSON.stringify(result)).not.toContain(privateMemo);
  expect(Object.keys(result).sort()).toEqual([
    "historyUnavailable",
    "personalSummary",
    "publicRecords",
    "summaryUnavailable",
  ]);
  expect(result.historyUnavailable).toBe(false);
  expect(result.summaryUnavailable).toBe(false);
  for (const request of h.state.requests)
    expectSafeQuery(request, request.scope);
  expect(h.state.roleClientCalls).toBe(0);
});

test("history and summary fetch every batch beyond 1000 records, including an exact full final batch", async () => {
  const h = harness({
    publicRows: Array.from({ length: 2000 }, (_, index) =>
      publicRecord(index + 1),
    ),
    ownRows: [
      ...Array.from({ length: 1000 }, () => ownRecord(1)),
      ownRecord(25),
    ],
  });
  const result = await h.api.getStockTradeReviewData("285A");
  expect(result.publicRecords).toHaveLength(2000);
  expect(result.publicRecords[1999].id).toBe(2000);
  expect(result.personalSummary?.real.recordCount).toBe(1001);
  expect(result.personalSummary?.real.totalProfit).toBe(1025);
  expect(
    h.state.requests
      .filter((request) => request.scope === "public")
      .map(({ from, to }) => [from, to]),
  ).toEqual([
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
  expect(
    h.state.requests
      .filter((request) => request.scope === "own")
      .map(({ from, to }) => [from, to]),
  ).toEqual([
    [0, 999],
    [1000, 1999],
  ]);
  for (const request of h.state.requests)
    expectSafeQuery(request, request.scope);
});

test("personal summary starts without waiting for a slow public history request", async () => {
  let releasePublic = () => {};
  const publicGate = new Promise<void>((resolve) => {
    releasePublic = resolve;
  });
  const h = harness({
    publicGate,
    publicRows: [publicRecord(1)],
    ownRows: [ownRecord(25)],
  });
  const pending = h.api.getStockTradeReviewData("285A");
  try {
    await expect
      .poll(() =>
        [...new Set(h.state.requests.map((request) => request.scope))].sort(),
      )
      .toEqual(["own", "public"]);
  } finally {
    releasePublic();
  }
  const result = await pending;
  expect(result.publicRecords).toHaveLength(1);
  expect(result.personalSummary?.real.totalProfit).toBe(25);
});

test("a failed later history batch discards partial public records without losing the personal summary", async () => {
  const h = harness({
    publicRows: Array.from({ length: 1000 }, (_, index) =>
      publicRecord(index + 1),
    ),
    ownRows: [ownRecord(25)],
    failScope: "public",
    failFrom: 1000,
  });
  const result = await h.api.getStockTradeReviewData("285A");
  expect(result.publicRecords).toEqual([]);
  expect(result.historyUnavailable).toBe(true);
  expect(result.personalSummary?.real.totalProfit).toBe(25);
  expect(result.summaryUnavailable).toBe(false);
  expect(JSON.stringify(result)).not.toContain(internalError);
});

test("a failed later personal batch discards partial totals while keeping public history", async () => {
  const h = harness({
    publicRows: [publicRecord(1)],
    ownRows: Array.from({ length: 1000 }, () => ownRecord(1)),
    failScope: "own",
    failFrom: 1000,
  });
  const result = await h.api.getStockTradeReviewData("285A");
  expect(result.publicRecords).toHaveLength(1);
  expect(result.historyUnavailable).toBe(false);
  expect(result.personalSummary).toBeNull();
  expect(result.summaryUnavailable).toBe(true);
  expect(JSON.stringify(result)).not.toContain(internalError);
});

test("transport failures resolve with the appropriate scope flags and no internal details", async () => {
  for (const failure of [
    { failScope: "public" as const, queryThrows: true },
    { failScope: "own" as const, queryThrows: true },
    { clientThrows: true },
  ]) {
    const h = harness({
      ...failure,
      publicRows: [publicRecord(1)],
      ownRows: [ownRecord(25)],
    });
    const result = await h.api.getStockTradeReviewData("285A");
    const publicFailed = failure.clientThrows || failure.failScope === "public";
    const ownFailed = failure.clientThrows || failure.failScope === "own";
    expect(result.historyUnavailable).toBe(Boolean(publicFailed));
    expect(result.summaryUnavailable).toBe(Boolean(ownFailed));
    expect(result.publicRecords.length).toBe(publicFailed ? 0 : 1);
    expect(result.personalSummary === null).toBe(Boolean(ownFailed));
    expect(JSON.stringify(result)).not.toContain(internalError);
  }
});
