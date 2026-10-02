import fs from "node:fs/promises";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token)
  throw new Error(
    "SUPABASE_ACCESS_TOKEN を設定するか、お問い合わせ非公開化SQLをSQL Editorで実行してください。",
  );
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
if (!/^[a-z0-9]{20}$/.test(ref))
  throw new Error("SupabaseのプロジェクトIDを確認してください。");
const query = await fs.readFile(
  "supabase/migrations/202610020003_contact_privacy.sql",
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
if (!response.ok)
  throw new Error(
    "DB更新に失敗しました（HTTP " +
      response.status +
      "）。変更はトランザクション内でロールバックされます。DB更新スクリプトと管理権限を確認してください。",
  );
console.log("Contact privacy update completed (no contact records deleted).");
