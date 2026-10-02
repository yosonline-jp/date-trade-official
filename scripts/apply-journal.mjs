import fs from "node:fs/promises";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKENを.envに設定するか、supabase/migrations/202610020001_journal.sqlをSupabase SQL Editorで実行してください。service_roleキーではDBスキーマを変更できません。",
  );
  process.exit(1);
}
const ref =
  process.env.SUPABASE_PROJECT_REF || new URL(url).hostname.split(".")[0];
if (!/^[a-z0-9]{20}$/.test(ref)) {
  console.error("SUPABASE_PROJECT_REFを確認してください。");
  process.exit(1);
}
const query = await fs.readFile(
  "supabase/migrations/202610020001_journal.sql",
  "utf8",
);
const response = await fetch(
  "https://api.supabase.com/v1/projects/" + ref + "/database/query",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, read_only: false }),
  },
);
if (!response.ok) {
  console.error(
    "DB更新に失敗しました（HTTP " +
      response.status +
      "）。Supabaseのプロジェクトと管理トークンの権限をご確認ください。",
  );
  process.exit(1);
}
console.log("Journal DB update completed.");
