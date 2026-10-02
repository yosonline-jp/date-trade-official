import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "typescript";

const source = (
  await fs.readFile("src/lib/account-deletion.ts", "utf8")
).replace('import "server-only";', "");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
const { removeAccount } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);
const uid = "11111111-1111-4111-8111-111111111111";
function fixture(objects = [], fail = {}) {
  const calls = [];
  let remaining = [...objects];
  const admin = {
    rpc: async (name, args) => {
      calls.push(["list", name, args]);
      return {
        data: fail.list ? null : remaining.slice(0, 100),
        error: fail.list ? {} : null,
      };
    },
    storage: {
      from: (bucket) => ({
        remove: async (names) => {
          calls.push(["storage", bucket, names]);
          if (fail.storage) return { error: {} };
          remaining = remaining.filter(
            (o) => o.bucket_id !== bucket || !names.includes(o.name),
          );
          return { error: null };
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: async (id, softDelete) => {
          calls.push(["auth", id, softDelete]);
          return { error: fail.auth ? {} : null };
        },
      },
    },
  };
  return { admin, calls, remaining: () => remaining };
}
// More than one page, multiple buckets, and legacy flat avatar filenames.
const objects = Array.from({ length: 205 }, (_, i) => ({
  bucket_id: i % 2 ? "profile" : "trade-screenshots",
  name: i % 2 ? "profile-" + i : uid + "/" + i + ".png",
}));
const f = fixture(objects);
assert.deepEqual(await removeAccount(f.admin, uid), { success: true });
assert.equal(f.remaining().length, 0);
assert.deepEqual(f.calls.at(-1), ["auth", uid, false]);
assert.equal(f.calls.filter((c) => c[0] === "list").length, 4);
for (const call of f.calls.filter((c) => c[0] === "list"))
  assert.deepEqual(call[2], { target_user_id: uid });
for (const fail of [{ list: true }, { storage: true }]) {
  const f = fixture(objects, fail);
  assert.ok((await removeAccount(f.admin, uid)).error);
  assert.ok(!f.calls.some((c) => c[0] === "auth"));
}
const failedAuth = fixture(objects, { auth: true });
assert.match((await removeAccount(failedAuth.admin, uid)).error, /画像は削除/);
const retry = fixture();
assert.deepEqual(await removeAccount(retry.admin, uid), { success: true });
console.log(
  "Account deletion: pagination, bucket isolation, hard delete, preparation/storage failures, partial-failure message, and retry passed.",
);

// Execute the actual Server Action with controlled session/admin dependencies.
const actionSource = (
  await fs.readFile("src/app/actions/user.ts", "utf8")
).replace(/^import .*;\r?$/gm, "");
const actionOutput = ts.transpileModule(actionSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const prefix =
  "const createClient=(...a)=>globalThis.accountDeletionTest.createClient(...a); const createRoleClient=(...a)=>globalThis.accountDeletionTest.createRoleClient(...a); const removeAccount=(...a)=>globalThis.accountDeletionTest.removeAccount(...a); const revalidatePath=(...a)=>globalThis.accountDeletionTest.revalidatePath(...a);";
const action = await import(
  "data:text/javascript;base64," +
    Buffer.from(prefix + actionOutput).toString("base64")
);
function sessionFixture(user = { id: uid }, authError = null, failure = {}) {
  const f = fixture([], failure);
  const events = [];
  globalThis.accountDeletionTest = {
    createClient: async () => {
      events.push("client");
      return {
        auth: {
          getUser: async () => {
            events.push("getUser");
            return { data: { user }, error: authError };
          },
          signOut: async (options) => {
            events.push(["signOut", options]);
            return { error: null };
          },
        },
      };
    },
    createRoleClient: async () => {
      events.push("role");
      return f.admin;
    },
    removeAccount,
    revalidatePath: (...args) => events.push(["revalidate", ...args]),
  };
  return { ...f, events };
}
const invalid = sessionFixture();
assert.ok(
  (await action.deleteUser({ confirmation: "削除する", userId: uid })).error,
);
assert.equal(invalid.events.length, 0);
for (const [user, error] of [
  [null, null],
  [{ id: uid }, {}],
]) {
  const f = sessionFixture(user, error);
  assert.ok((await action.deleteUser("削除する")).error);
  assert.deepEqual(f.events, ["client", "getUser"]);
}
const actionFailure = sessionFixture({ id: uid }, null, { auth: true });
assert.ok((await action.deleteUser("削除する")).error);
assert.ok(
  !actionFailure.events.some((e) => Array.isArray(e) && e[0] === "signOut"),
);
const actionSuccess = sessionFixture();
assert.deepEqual(
  await action.deleteUser("削除する", "22222222-2222-4222-8222-222222222222"),
  { success: true },
);
assert.deepEqual(actionSuccess.calls.at(-1), ["auth", uid, false]);
assert.deepEqual(actionSuccess.events, [
  "client",
  "getUser",
  "role",
  ["signOut", { scope: "local" }],
  ["revalidate", "/", "layout"],
]);
delete globalThis.accountDeletionTest;
console.log(
  "Server Action: confirmation validation, verified-session target, unauthorized requests, failure preserves login, and success clears cookies passed.",
);
