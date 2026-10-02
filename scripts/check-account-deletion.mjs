import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token)
  throw new Error("外部キーの確認には SUPABASE_ACCESS_TOKEN が必要です。");
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(
  ".",
)[0];
const query =
  "select conrelid::regclass::text as child, conname, pg_get_constraintdef(oid) as definition from pg_constraint where contype='f' and confrelid in ('auth.users'::regclass,'public.users'::regclass) order by 1,2";
const response = await fetch(
  "https://api.supabase.com/v1/projects/" + ref + "/database/query",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, read_only: true }),
  },
);
if (!response.ok)
  throw new Error(
    "スキーマ確認に失敗しました（HTTP " + response.status + "）。",
  );
const rows = await response.json();
for (const table of ["trade_records", "daily_profit", "fundamental_analysis"]) {
  const row = rows.find(
    (r) =>
      [table, "public." + table].includes(r.child) &&
      r.definition.includes("REFERENCES auth.users(id)"),
  );
  if (!row?.definition.includes("ON DELETE CASCADE"))
    throw new Error(table + ": アカウント削除用DB更新が必要です。");
}
const checks =
  "select to_regprocedure('public.account_deletion_objects(uuid)') is not null as rpc_ready, exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='account_deletion_objects' and has_function_privilege('authenticated',p.oid,'EXECUTE')) as authenticated_access, exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='account_deletion_objects' and has_function_privilege('anon',p.oid,'EXECUTE')) as anonymous_access";
const rpcResponse = await fetch(
  "https://api.supabase.com/v1/projects/" + ref + "/database/query",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: checks, read_only: true }),
  },
);
if (!rpcResponse.ok) throw new Error("RPC権限の読み取り確認に失敗しました。");
const [rpc] = await rpcResponse.json();
if (!rpc.rpc_ready || rpc.authenticated_access || rpc.anonymous_access)
  throw new Error("削除用RPCの準備または権限を確認してください。");
console.log(
  "Account deletion schema: cascading user data and server-only Storage RPC ready.",
);
