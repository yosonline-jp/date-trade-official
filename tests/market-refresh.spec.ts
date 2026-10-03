import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Row = Record<string, string | number | null>;
type Result = { data: Row | Row[] | null; error: Error | null };
const today = "2026-10-04T01:00:00Z";
const yesterday = "2026-10-03T01:00:00Z";
const day = (value: string | number | Date = today) =>
  new Date(new Date(value).getTime() + 9 * 3600000).toISOString().slice(0, 10);

function harness(
  codes: string[],
  options: {
    stale?: string[];
    failBulk?: boolean;
    failFetch?: string[];
    missingChart?: string[];
  } = {},
) {
  const tables: Record<string, Row[]> = {
    stocks: codes.map((code) => ({ code, name: code, market: "プライム" })),
    stock_charts: codes
      .filter((code) => !options.missingChart?.includes(code))
      .map((code, id) => ({
        code,
        id,
        fetched_at: options.stale?.includes(code) ? yesterday : today,
      })),
    daily_prices: codes.map((code, id) => ({
      code,
      id,
      updated_at: options.stale?.includes(code) ? yesterday : today,
    })),
  };
  const reads: { table: string; codes: string[] }[] = [];
  const writes: { table: string; operation: string; id?: number }[] = [];
  const fetched: string[] = [];
  let active = 0;
  let peak = 0;
  let fetchGate: Promise<void> | undefined;
  class Query implements PromiseLike<Result> {
    codes: string[] = [];
    column = "";
    ascending = true;
    count = Infinity;
    single = false;
    operation = "read";
    id?: number;
    constructor(readonly table: string) {}
    select() {
      return this;
    }
    in(_column: string, codes: string[]) {
      this.codes = codes;
      return this;
    }
    eq(column: string, value: string | number) {
      if (column === "code") this.codes = [String(value)];
      else this.id = Number(value);
      return this;
    }
    order(column: string, options?: { ascending: boolean }) {
      this.column = column;
      this.ascending = options?.ascending ?? true;
      return this;
    }
    limit(count: number) {
      this.count = count;
      return this;
    }
    maybeSingle() {
      this.single = true;
      return this;
    }
    update() {
      this.operation = "update";
      return this;
    }
    insert() {
      this.operation = "insert";
      return this;
    }
    async execute(): Promise<Result> {
      if (this.operation !== "read") {
        writes.push({
          table: this.table,
          operation: this.operation,
          id: this.id,
        });
        return { data: null, error: null };
      }
      reads.push({ table: this.table, codes: this.codes });
      if (options.failBulk && this.codes.length > 1)
        return { data: null, error: new Error("Bulk read failed") };
      let rows = tables[this.table].filter((row) =>
        this.codes.includes(String(row.code)),
      );
      if (this.column)
        rows = rows.sort((a, b) => {
          const order =
            this.column === "id"
              ? Number(a.id) - Number(b.id)
              : String(a[this.column]).localeCompare(String(b[this.column]));
          return this.ascending ? order : -order;
        });
      rows = rows.slice(0, this.count);
      return { data: this.single ? (rows[0] ?? null) : rows, error: null };
    }
    then<TResult1 = Result, TResult2 = never>(
      fulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
      rejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
      return this.execute().then(fulfilled, rejected);
    }
  }
  const exported = {};
  runInNewContext(
    ts.transpileModule(readFileSync("src/lib/market/refresh.ts", "utf8"), {
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
            createRoleClient: async () => ({
              from: (table: string) => new Query(table),
            }),
          };
        if (name === "./provider")
          return {
            jstDay: day,
            latestCandle: () => ({
              open: 100,
              high: 110,
              low: 95,
              close: 105,
              volume: 1000,
            }),
            fetchYahooChart: async (symbol: string) => {
              const code = symbol.replace(/\.T$/, "");
              fetched.push(code);
              peak = Math.max(peak, ++active);
              try {
                await (fetchGate ??
                  new Promise((resolve) => setTimeout(resolve, 5)));
                if (options.failFetch?.includes(code))
                  throw new Error("Fetch failed");
                return {
                  meta: {},
                  indicators: { quote: [{ close: [100, 105] }] },
                };
              } finally {
                active--;
              }
            },
          };
        throw new Error(`Unexpected import: ${name}`);
      },
      Date,
      Map,
      Set,
      Promise,
    },
  );
  return {
    api: exported as {
      ensureFreshStock(code: string): Promise<void>;
      ensureFreshStocks(codes: string[]): Promise<string[]>;
    },
    reads,
    writes,
    fetched,
    tables,
    peak: () => peak,
    gate: (promise: Promise<void>) => {
      fetchGate = promise;
    },
  };
}

const codes = Array.from({ length: 24 }, (_, i) => String(1000 + i));

test("24 fresh symbols need only three metadata reads and no downloads", async () => {
  const { api, reads, writes, fetched } = harness(codes);
  expect(await api.ensureFreshStocks([...codes, codes[0], "invalid"])).toEqual(
    [],
  );
  expect(reads).toHaveLength(3);
  expect(reads.every((read) => read.codes.length === 24)).toBe(true);
  expect(fetched).toEqual([]);
  expect(writes).toEqual([]);
});

test("stale symbols refresh with the existing four-download concurrency and report failures", async () => {
  const h = harness(codes, { stale: codes.slice(0, 9), failFetch: [codes[2]] });
  expect(await h.api.ensureFreshStocks(codes)).toEqual([codes[2]]);
  expect(h.fetched.sort()).toEqual(codes.slice(0, 9));
  expect(h.peak()).toBe(4);
  expect(h.writes).toHaveLength(16);
});

test("bulk read errors fall back to single-symbol checks", async () => {
  const h = harness(codes, { failBulk: true, stale: [codes[0]] });
  expect(await h.api.ensureFreshStocks(codes)).toEqual([]);
  expect(h.reads).toHaveLength(3 + 24 * 3);
  expect(h.fetched).toEqual([codes[0]]);
});

test("missing charts use checked insertion and old duplicate rows retain the original selection", async () => {
  const h = harness(codes, { missingChart: [codes[0]] });
  h.tables.stock_charts.unshift({
    code: codes[1],
    id: -1,
    fetched_at: yesterday,
  });
  h.tables.daily_prices.push({ code: codes[1], id: 99, updated_at: yesterday });
  expect(await h.api.ensureFreshStocks(codes)).toEqual([]);
  expect(h.fetched.sort()).toEqual(codes.slice(0, 2));
  expect(h.writes).toContainEqual({
    table: "stock_charts",
    operation: "insert",
    id: undefined,
  });
  expect(h.writes).toContainEqual({
    table: "stock_charts",
    operation: "update",
    id: -1,
  });
  expect(h.writes).toContainEqual({
    table: "daily_prices",
    operation: "update",
    id: 1,
  });
});

test("a batch awaits an existing same-symbol refresh without downloading twice", async () => {
  const h = harness(codes, { stale: [codes[0]] });
  let release = () => {};
  h.gate(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const first = h.api.ensureFreshStock(codes[0]);
  await expect.poll(() => h.fetched.length).toBe(1);
  // Both metadata rows can become fresh just before the in-flight job resolves.
  h.tables.stock_charts[0].fetched_at = today;
  h.tables.daily_prices[0].updated_at = today;
  let done = false;
  const batch = h.api.ensureFreshStocks(codes).then((value) => {
    done = true;
    return value;
  });
  await expect.poll(() => h.reads.length).toBe(6);
  expect(done).toBe(false);
  release();
  await first;
  expect(await batch).toEqual([]);
  expect(h.fetched).toEqual([codes[0]]);
});

test("empty/invalid lists do not access the database and delisted symbols are not refreshed", async () => {
  const h = harness(codes, { stale: [codes[0]] });
  expect(await h.api.ensureFreshStocks(["invalid", ""])).toEqual([]);
  expect(h.reads).toEqual([]);
  h.tables.stocks[0].market = "上場廃止";
  expect(await h.api.ensureFreshStocks(codes)).toEqual([]);
  expect(h.fetched).toEqual([]);
});
