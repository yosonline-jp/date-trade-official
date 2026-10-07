import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type {
  WatchlistMutationResult,
  WatchlistStatus,
} from "../src/lib/watchlist-action-types";

type DbError = { code?: string; message: string };
type Operation = "insert" | "delete" | "select";
type QueryRecord = {
  operation: Operation;
  table: string;
  fields: string | null;
  filters: Array<[string, unknown]>;
  payload: Record<string, unknown> | null;
  limit: number | null;
};
type HarnessOptions = {
  user?: { id: unknown } | null;
  authError?: unknown;
  clientThrows?: boolean;
  authThrows?: boolean;
  queryThrows?: Operation;
  insertError?: DbError;
  deleteError?: DbError;
  selectError?: DbError;
  selected?: { id: number } | null;
};

const owner = "verified-owner";
const privateDetail = "database-or-auth-private-detail";
const revalidated = [
  "/watchlist",
  "/dashboard/watchlist",
  "/stocks/285A",
  "/stocks/285A/trades",
  "/dashboard/stocks/285A",
];

function harness(options: HarnessOptions = {}) {
  const state = {
    queries: [] as QueryRecord[],
    paths: [] as string[],
    authCalls: 0,
    roleClientCalls: 0,
    logs: [] as unknown[],
  };
  class Query {
    operation: Operation = "select";
    fields: string | null = null;
    filters: Array<[string, unknown]> = [];
    payload: Record<string, unknown> | null = null;
    take: number | null = null;
    constructor(readonly table: string) {}
    record() {
      state.queries.push({
        operation: this.operation,
        table: this.table,
        fields: this.fields,
        filters: this.filters,
        payload: this.payload,
        limit: this.take,
      });
      if (options.queryThrows === this.operation)
        throw new Error(privateDetail);
    }
    async insert(payload: Record<string, unknown>) {
      this.operation = "insert";
      this.payload = payload;
      this.record();
      return { error: options.insertError ?? null };
    }
    delete() {
      this.operation = "delete";
      return this;
    }
    select(fields: string) {
      this.operation = "select";
      this.fields = fields;
      return this;
    }
    eq(column: string, value: unknown) {
      this.filters.push([column, value]);
      return this;
    }
    limit(limit: number) {
      this.take = limit;
      return this;
    }
    async maybeSingle() {
      this.record();
      return {
        data: options.selected ?? null,
        error: options.selectError ?? null,
      };
    }
    then(
      resolve: (value: { error: DbError | null }) => unknown,
      reject: (cause: unknown) => unknown,
    ) {
      return Promise.resolve()
        .then(() => {
          this.record();
          return { error: options.deleteError ?? null };
        })
        .then(resolve, reject);
    }
  }
  const exported = {};
  runInNewContext(
    ts.transpileModule(readFileSync("src/app/actions/watchlist.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports: exported,
      Promise,
      console: {
        error: (...args: unknown[]) => state.logs.push(args),
        log: (...args: unknown[]) => state.logs.push(args),
      },
      require(name: string) {
        if (name === "next/cache")
          return { revalidatePath: (path: string) => state.paths.push(path) };
        if (name === "@/utils/supabase/server")
          return {
            createClient: async () => {
              if (options.clientThrows) throw new Error(privateDetail);
              return {
                auth: {
                  getUser: async () => {
                    state.authCalls++;
                    if (options.authThrows) throw new Error(privateDetail);
                    return {
                      data: {
                        user:
                          options.user === undefined
                            ? { id: owner }
                            : options.user,
                      },
                      error: options.authError ?? null,
                    };
                  },
                },
                from: (table: string) => new Query(table),
              };
            },
            createRoleClient: () => {
              state.roleClientCalls++;
              throw new Error("Privileged client is forbidden");
            },
          };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  return {
    state,
    actions: exported as {
      addToWatchlist(input: unknown): Promise<WatchlistMutationResult>;
      removeFromWatchlist(input: unknown): Promise<WatchlistMutationResult>;
      checkWatchlist(input: unknown): Promise<WatchlistStatus>;
    },
  };
}

test("guests and unverified users cannot read or mutate watchlist rows", async () => {
  for (const options of [
    { user: null },
    { user: { id: owner }, authError: { message: privateDetail } },
    { user: { id: " " } },
    { user: { id: undefined } },
    { user: { id: 123 } },
  ]) {
    const h = harness(options);
    expect(await h.actions.checkWatchlist("285A")).toEqual({
      status: "auth-required",
    });
    expect(
      await h.actions.addToWatchlist({ code: "285A", name: "テスト銘柄" }),
    ).toEqual({ status: "auth-required" });
    expect(await h.actions.removeFromWatchlist("285A")).toEqual({
      status: "auth-required",
    });
    expect(h.state.queries).toEqual([]);
    expect(h.state.paths).toEqual([]);
    expect(h.state.roleClientCalls).toBe(0);
    expect(h.state.logs).toEqual([]);
  }
});

test("client and authentication exceptions return a fixed message without reading rows", async () => {
  for (const options of [{ clientThrows: true }, { authThrows: true }]) {
    const h = harness(options);
    for (const action of [
      () => h.actions.checkWatchlist("285A"),
      () => h.actions.addToWatchlist({ code: "285A", name: "テスト銘柄" }),
      () => h.actions.removeFromWatchlist("285A"),
    ]) {
      const result = await action();
      expect(result).toMatchObject({
        status: "error",
        message: expect.stringContaining("認証状態"),
      });
      expect(JSON.stringify(result)).not.toContain(privateDetail);
    }
    expect(h.state.queries).toEqual([]);
    expect(h.state.logs).toEqual([]);
  }
});

test("invalid codes and stock names are rejected without auth or database calls", async () => {
  const h = harness();
  for (const code of [
    null,
    undefined,
    285,
    {},
    [],
    "",
    " ",
    "285",
    "285AAAA",
    "7203.T",
    "../7203",
    "285Ａ",
  ])
    for (const action of [
      () => h.actions.checkWatchlist(code),
      () => h.actions.removeFromWatchlist(code),
    ])
      expect(await action()).toMatchObject({
        status: "error",
        message: expect.stringContaining("銘柄コード"),
      });
  for (const stock of [
    null,
    undefined,
    [],
    "285A",
    {},
    { code: "285A" },
    { code: "285A", name: " " },
    { code: "285A", name: 3 },
    { code: "285A", name: "名".repeat(201) },
    { code: "../285A", name: "銘柄" },
    {
      get code() {
        throw new Error(privateDetail);
      },
      name: "銘柄",
    },
  ])
    expect(await h.actions.addToWatchlist(stock)).toMatchObject({
      status: "error",
      message: expect.stringContaining("銘柄コード"),
    });
  expect(h.state.authCalls).toBe(0);
  expect(h.state.queries).toEqual([]);
  expect(h.state.paths).toEqual([]);
});

test("add normalizes input and forces the verified owner while ignoring client fields", async () => {
  const h = harness();
  expect(
    await h.actions.addToWatchlist({
      code: " 285a ",
      name: " テスト銘柄 ",
      user_id: "another-owner",
      stock_code: "7203",
      is_admin: true,
    }),
  ).toEqual({ status: "success", isWatching: true });
  expect(h.state.queries).toEqual([
    {
      operation: "insert",
      table: "watchlist",
      fields: null,
      filters: [],
      limit: null,
      payload: { user_id: owner, stock_code: "285A", stock_name: "テスト銘柄" },
    },
  ]);
  expect(h.state.paths).toEqual(revalidated);
  expect(h.state.roleClientCalls).toBe(0);
});

test("five-character codes and the maximum trimmed name are accepted", async () => {
  const h = harness();
  expect(
    await h.actions.addToWatchlist({
      code: " ab123 ",
      name: " " + "名".repeat(200) + " ",
    }),
  ).toEqual({ status: "success", isWatching: true });
  expect(h.state.queries[0].payload).toEqual({
    user_id: owner,
    stock_code: "AB123",
    stock_name: "名".repeat(200),
  });
});

test("check distinguishes an unwatched code from a query failure using an owner-scoped nullable read", async () => {
  for (const selected of [null, { id: 7 }]) {
    const h = harness({ selected });
    expect(await h.actions.checkWatchlist(" 285a ")).toEqual({
      status: "ready",
      isWatching: !!selected,
    });
    expect(h.state.queries).toEqual([
      {
        operation: "select",
        table: "watchlist",
        fields: "id",
        filters: [
          ["user_id", owner],
          ["stock_code", "285A"],
        ],
        payload: null,
        limit: 1,
      },
    ]);
    expect(h.state.paths).toEqual([]);
  }
  const failed = harness({ selectError: { message: privateDetail } });
  const result = await failed.actions.checkWatchlist("285A");
  expect(result).toMatchObject({
    status: "error",
    message: expect.stringContaining("状態を確認"),
  });
  expect(JSON.stringify(result)).not.toContain(privateDetail);
});

test("remove only affects the verified owner's normalized code and remains successful when already absent", async () => {
  const h = harness();
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await h.actions.removeFromWatchlist(" 285a ")).toEqual({
      status: "success",
      isWatching: false,
    });
    expect(h.state.queries[attempt]).toEqual({
      operation: "delete",
      table: "watchlist",
      fields: null,
      filters: [
        ["user_id", owner],
        ["stock_code", "285A"],
      ],
      payload: null,
      limit: null,
    });
  }
  expect(h.state.paths).toEqual([...revalidated, ...revalidated]);
});

test("a duplicate is successful only after verifying the same owner's code exists", async () => {
  const duplicate = { code: "23505", message: privateDetail };
  const h = harness({ insertError: duplicate, selected: { id: 3 } });
  expect(
    await h.actions.addToWatchlist({ code: "285a", name: "銘柄" }),
  ).toEqual({ status: "success", isWatching: true });
  expect(h.state.queries[1]).toEqual({
    operation: "select",
    table: "watchlist",
    fields: "id",
    filters: [
      ["user_id", owner],
      ["stock_code", "285A"],
    ],
    payload: null,
    limit: 1,
  });
  expect(h.state.paths).toEqual(revalidated);
  for (const options of [
    { insertError: duplicate, selected: null },
    {
      insertError: duplicate,
      selectError: { message: privateDetail },
      selected: { id: 3 },
    },
    { insertError: duplicate, queryThrows: "select" as const },
  ]) {
    const failed = harness(options);
    const result = await failed.actions.addToWatchlist({
      code: "285A",
      name: "銘柄",
    });
    expect(result).toMatchObject({
      status: "error",
      message: expect.stringContaining("追加できません"),
    });
    expect(JSON.stringify(result)).not.toContain(privateDetail);
    expect(failed.state.paths).toEqual([]);
  }
});

test("database failures and query exceptions return fixed messages and do not revalidate", async () => {
  for (const operation of ["insert", "delete", "select"] as const) {
    for (const throws of [false, true]) {
      const h = harness(
        throws
          ? { queryThrows: operation }
          : {
              insertError:
                operation === "insert" ? { message: privateDetail } : undefined,
              deleteError:
                operation === "delete" ? { message: privateDetail } : undefined,
              selectError:
                operation === "select" ? { message: privateDetail } : undefined,
            },
      );
      const result =
        operation === "insert"
          ? await h.actions.addToWatchlist({ code: "285A", name: "銘柄" })
          : operation === "delete"
            ? await h.actions.removeFromWatchlist("285A")
            : await h.actions.checkWatchlist("285A");
      expect(result).toMatchObject({
        status: "error",
        message: expect.any(String),
      });
      expect(JSON.stringify(result)).not.toContain(privateDetail);
      expect(h.state.paths).toEqual([]);
      expect(h.state.logs).toEqual([]);
    }
  }
});
