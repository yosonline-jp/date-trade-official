import { expect, test } from "@playwright/test";
import { safeRedirectPath, signInUrl } from "../src/lib/auth/redirect";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function serverModule<T>(file: string, auth: Record<string, unknown>): T {
  const exported = {};
  runInNewContext(
    ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports: exported,
      URL,
      URLSearchParams,
      process: { env: {} },
      require(name: string) {
        if (name === "@/lib/auth/redirect")
          return { safeRedirectPath, signInUrl };
        if (name === "@/utils/supabase/server")
          return { createClient: async () => ({ auth }) };
        if (name === "next/navigation")
          return {
            redirect(destination: string) {
              throw Object.assign(new Error("Redirect"), { destination });
            },
          };
        if (name === "next/server")
          return {
            NextResponse: {
              redirect(destination: URL) {
                return { destination: destination.toString() };
              },
            },
          };
        if (
          [
            "@/utils/utils",
            "next/headers",
            "zod",
            "@/validations/signup",
          ].includes(name)
        )
          return {};
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  return exported as T;
}

test("login returns to a local stock page with its query and fragment", () => {
  const target = "/stocks/285A?view=comments#stock-discussion";
  expect(safeRedirectPath(target)).toBe(target);
  const login = new URL(signInUrl(target), "https://daytrade.invalid");
  expect(login.pathname).toBe("/sign-in");
  expect(login.searchParams.get("redirect_to")).toBe(target);
});

test("login rejects destinations that can escape the application origin", () => {
  for (const target of [
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\t/example.com",
    "/%2f%2fexample.com",
    "/%5cexample.com",
    "/%0aexample.com",
    "/stocks/%ZZ",
    "javascript:alert(1)",
    "stocks/285A",
    "",
    undefined,
    null,
    ["/stocks/285A"],
  ])
    expect(safeRedirectPath(target)).toBe("/dashboard");
});

test("failed login keeps the local destination and encodes the error safely", () => {
  const target = "/stocks/285A?view=comments#stock-discussion";
  const message = "メールアドレスを確認してください & 再試行";
  const login = new URL(signInUrl(target, message), "https://daytrade.invalid");
  expect(login.searchParams.get("redirect_to")).toBe(target);
  expect(login.searchParams.get("error")).toBe(message);
  expect([...login.searchParams.keys()]).toEqual(["redirect_to", "error"]);
  expect(safeRedirectPath(undefined)).toBe("/dashboard");
});

test("password login returns to the stock page and preserves it on failure", async () => {
  let error: { message: string } | null = null;
  const { signInAction } = serverModule<{
    signInAction(form: FormData): Promise<never>;
  }>("src/app/actions.ts", {
    signInWithPassword: async () => ({ error }),
  });
  const form = new FormData();
  form.set("email", "test@example.invalid");
  form.set("password", "test-only");
  form.set("redirect_to", "/stocks/285A#stock-discussion");
  await expect(Promise.resolve(signInAction(form))).rejects.toMatchObject({
    destination: "/stocks/285A#stock-discussion",
  });
  error = { message: "Invalid login credentials" };
  await expect(Promise.resolve(signInAction(form))).rejects.toMatchObject({
    destination: signInUrl(
      "/stocks/285A#stock-discussion",
      "メールアドレスまたはパスワードが間違っています",
    ),
  });
  error = null;
  form.delete("redirect_to");
  await expect(Promise.resolve(signInAction(form))).rejects.toMatchObject({
    destination: "/dashboard",
  });
});

test("OAuth callback retains the destination after success, rejection or outage", async () => {
  let failure: "none" | "rejected" | "outage" = "none";
  const { GET } = serverModule<{
    GET(request: Request): Promise<{ destination: string }>;
  }>("src/app/auth/callback/route.ts", {
    exchangeCodeForSession: async () => {
      if (failure === "outage") throw new Error("Test exchange unavailable");
      return { error: failure === "rejected" ? { message: "Rejected" } : null };
    },
  });
  const request = new Request(
    "https://daytrade.invalid/auth/callback?code=test&redirect_to=%2Fstocks%2F285A%23stock-discussion",
  );
  expect((await GET(request)).destination).toBe(
    "https://daytrade.invalid/stocks/285A#stock-discussion",
  );
  for (const state of ["rejected", "outage"] as const) {
    failure = state;
    const result = new URL((await GET(request)).destination);
    expect(result.pathname).toBe("/sign-in");
    expect(result.searchParams.get("redirect_to")).toBe(
      "/stocks/285A#stock-discussion",
    );
    expect(result.searchParams.get("error")).toBe(
      "認証リンクを確認してください",
    );
  }
  failure = "none";
  expect(
    (
      await GET(
        new Request(
          "https://daytrade.invalid/auth/callback?code=test&redirect_to=https%3A%2F%2Fexample.com",
        ),
      )
    ).destination,
  ).toBe("https://daytrade.invalid/dashboard");
});
