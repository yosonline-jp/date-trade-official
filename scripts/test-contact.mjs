import fs from "node:fs/promises";
import assert from "node:assert/strict";
import ts from "typescript";
import { z } from "zod";
const schemaText = await fs.readFile("src/validations/contact.ts", "utf8");
const schemaCode = ts.transpileModule(
  schemaText.replace(/^import .*;$/gm, ""),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
globalThis.contactTestZ = z;
const { ContactSchema, contactResolver } = await import(
  "data:text/javascript;base64," +
    Buffer.from("const z=globalThis.contactTestZ;" + schemaCode).toString(
      "base64",
    )
);
const valid = {
  name: " テスト ",
  email: " person@example.com ",
  email_confirm: "person@example.com",
  title: " 保存について ",
  content: " 詳細なお問合せ内容 ",
  consent: true,
  website: "",
};
assert.equal(ContactSchema.parse(valid).name, "テスト");
for (const invalid of [
  { consent: false },
  { email_confirm: "other@example.com" },
  { content: "   " },
  { content: "x".repeat(5001) },
  { website: "bot.example" },
  { name: "x".repeat(81) },
  { email: "not-email" },
])
  assert.equal(
    ContactSchema.safeParse({ ...valid, ...invalid }).success,
    false,
  );
const resolver = contactResolver;
const clientInvalid = await resolver(
  { ...valid, name: "" },
  {},
  { fields: {}, shouldUseNativeValidation: false },
);
assert.equal(clientInvalid.errors.name.message, "お名前を入力してください。");
const clientValid = await resolver(
  valid,
  {},
  { fields: {}, shouldUseNativeValidation: false },
);
assert.deepEqual(clientValid.errors, {});
const actionText = await fs.readFile("src/app/actions/contact.ts", "utf8");
const actionCode = ts.transpileModule(
  actionText.replace(/^import .*;$/gm, ""),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
globalThis.contactTestSchema = ContactSchema;
const prefix =
  "const ContactSchema=globalThis.contactTestSchema;const createClient=(...args)=>globalThis.contactTestClient(...args);";
const { submitContact } = await import(
  "data:text/javascript;base64," +
    Buffer.from(prefix + actionCode).toString("base64")
);
let saved = null,
  table = null,
  calls = 0;
globalThis.contactTestClient = async () => {
  calls++;
  return {
    from: (name) => {
      table = name;
      return {
        insert: async (value) => {
          saved = value;
          return { error: null };
        },
      };
    },
  };
};
assert.equal((await submitContact({ ...valid, consent: false })).ok, false);
assert.equal(calls, 0);
assert.deepEqual(await submitContact(valid), { ok: true });
assert.equal(table, "contact");
assert.deepEqual(saved, {
  name: "テスト",
  email: "person@example.com",
  title: "保存について",
  content: "詳細なお問合せ内容",
});
globalThis.contactTestClient = async () => ({
  from: () => ({
    insert: async () => ({ error: { message: "private database detail" } }),
  }),
});
const failure = await submitContact(valid);
assert.equal(failure.ok, false);
assert.ok(!failure.error.includes("private database detail"));
globalThis.contactTestClient = async () => {
  throw new Error("network error");
};
assert.equal((await submitContact(valid)).ok, false);
delete globalThis.contactTestClient;
delete globalThis.contactTestZ;
delete globalThis.contactTestSchema;
console.log(
  "Contact: validation, consent, honeypot, trimming, INSERT-only payload, and error handling passed. No messages sent.",
);
