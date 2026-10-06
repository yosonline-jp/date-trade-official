import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { StockCommentSchema } from "../src/validations/stock-comment";

type CommentResult = {
  status: "success" | "error" | "auth-required";
  message: string;
};
type CommentInsert = {
  stock_code: string;
  user_id: string;
  comment: string;
};
type FailureStage = "client" | "auth" | "insert";
type HarnessOptions = {
  user?: { id: string } | null;
  authError?: { message: string } | null;
  insertError?: { message: string } | null;
  throwAt?: FailureStage;
};

const internalError = "private-database-host: authentication-token-detail";

// Execute the actual server action while keeping all database/cache writes local.
function harness(options: HarnessOptions = {}) {
  const state = {
    user:
      options.user === undefined
        ? { id: "server-authenticated-user" }
        : options.user,
    authCalls: 0,
    tables: [] as string[],
    inserts: [] as CommentInsert[],
    revalidated: [] as string[],
  };
  const exported = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync("src/app/actions/stock-comments.ts", "utf8"),
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
        if (name === "@/utils/supabase/server")
          return {
            createClient: async () => {
              if (options.throwAt === "client") throw new Error(internalError);
              return {
                auth: {
                  getUser: async () => {
                    state.authCalls += 1;
                    if (options.throwAt === "auth")
                      throw new Error(internalError);
                    return {
                      data: { user: state.user },
                      error: options.authError ?? null,
                    };
                  },
                },
                from: (table: string) => {
                  state.tables.push(table);
                  return {
                    insert: async (payload: CommentInsert) => {
                      state.inserts.push({ ...payload });
                      if (options.throwAt === "insert")
                        throw new Error(internalError);
                      return { error: options.insertError ?? null };
                    },
                  };
                },
              };
            },
          };
        if (name === "@/validations/stock-comment")
          return { StockCommentSchema };
        if (name === "next/cache")
          return {
            revalidatePath: (route: string) => state.revalidated.push(route),
          };
        throw new Error(`Unexpected import: ${name}`);
      },
      Promise,
      console: { error() {}, warn() {} },
    },
  );
  return {
    api: exported as {
      addComment(stockCode: string, comment: string): Promise<CommentResult>;
    },
    state,
  };
}

test("anonymous and expired sessions receive login guidance without attempting a write", async () => {
  for (const options of [
    { user: null, authError: null },
    { user: null, authError: { message: internalError } },
    { user: { id: "unverified-user" }, authError: { message: internalError } },
  ]) {
    const h = harness(options);
    const result = await h.api.addComment(
      "285A",
      "買いの勢いを確認しています。",
    );
    expect(result.status).toBe("auth-required");
    expect(result.message).toBeTruthy();
    expect(result.message).not.toContain(internalError);
    expect(h.state.authCalls).toBe(1);
    expect(h.state.tables).toEqual([]);
    expect(h.state.inserts).toEqual([]);
    expect(h.state.revalidated).toEqual([]);
  }
});

test("a signed-in comment uses the verified user, trims whitespace, and refreshes both detail routes", async () => {
  const h = harness();
  const result = await h.api.addComment(
    "285A",
    "  出来高を確認しています。\n ",
  );
  expect(result.status).toBe("success");
  expect(h.state.authCalls).toBe(1);
  expect(h.state.tables).toEqual(["stock_comments"]);
  expect(h.state.inserts).toEqual([
    {
      stock_code: "285A",
      user_id: "server-authenticated-user",
      comment: "出来高を確認しています。",
    },
  ]);
  expect([...h.state.revalidated].sort()).toEqual([
    "/dashboard/stocks/285A",
    "/stocks/285A",
  ]);
});

test("valid boundary input accepts a five-character code and 250 characters after trimming", async () => {
  const h = harness();
  const comment = "株".repeat(250);
  expect((await h.api.addComment("1234A", `  ${comment}  `)).status).toBe(
    "success",
  );
  expect(h.state.inserts[0]).toEqual({
    stock_code: "1234A",
    user_id: "server-authenticated-user",
    comment,
  });
});

test("invalid codes, blank comments, and oversized comments never reach the database", async () => {
  const invalidInput: [string, string][] = [
    ["285A", ""],
    ["285A", " \n\t "],
    ["285A", "株".repeat(251)],
    ["285", "コメント"],
    ["123456", "コメント"],
    ["285a", "コメント"],
    ["../285A", "コメント"],
  ];
  for (const [code, comment] of invalidInput) {
    const h = harness();
    const result = await h.api.addComment(code, comment);
    expect(
      result.status,
      `invalid input: ${code}, ${comment.length} characters`,
    ).toBe("error");
    expect(result.message).toBeTruthy();
    expect(h.state.tables).toEqual([]);
    expect(h.state.inserts).toEqual([]);
    expect(h.state.revalidated).toEqual([]);
  }
});

test("authentication is checked again when a previously signed-in session expires", async () => {
  const h = harness();
  expect((await h.api.addComment("285A", "最初のコメント")).status).toBe(
    "success",
  );
  h.state.user = null;
  expect((await h.api.addComment("285A", "失効後のコメント")).status).toBe(
    "auth-required",
  );
  expect(h.state.authCalls).toBe(2);
  expect(h.state.inserts).toHaveLength(1);
  expect([...h.state.revalidated].sort()).toEqual([
    "/dashboard/stocks/285A",
    "/stocks/285A",
  ]);
});

test("database failures return a safe error and do not refresh detail pages", async () => {
  const h = harness({ insertError: { message: internalError } });
  const result = await h.api.addComment("285A", "保存するコメント");
  expect(result.status).toBe("error");
  expect(result.message).toBeTruthy();
  expect(result.message).not.toContain(internalError);
  expect(h.state.inserts).toHaveLength(1);
  expect(h.state.revalidated).toEqual([]);
});

test("client, authentication, and insertion transport failures resolve to safe errors", async () => {
  for (const throwAt of ["client", "auth", "insert"] as const) {
    const h = harness({ throwAt });
    const result = await h.api.addComment("285A", "保存するコメント");
    expect(result.status, throwAt).toBe("error");
    expect(result.message).toBeTruthy();
    expect(result.message).not.toContain(internalError);
    expect(h.state.revalidated).toEqual([]);
    if (throwAt !== "insert") expect(h.state.inserts).toEqual([]);
  }
});
