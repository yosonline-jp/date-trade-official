import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Supabase public environment is missing");
const db = createClient(url, anon, { auth: { persistSession: false } });
let failed = false;
for (const [table, columns] of [
  ["stocks", "code,name,market"],
  ["stock_charts", "code,data"],
  ["useful_data", "id,data,updated_at"],
  ["news", "id,header"],
  ["technical_analysis", "id,header"],
]) {
  const { data, error } = await db.from(table).select(columns).limit(1);
  console.log(
    JSON.stringify({
      table,
      ok: !error,
      rows: data?.length ?? 0,
      errorCode: error?.code ?? null,
      columns: data?.[0] ? Object.keys(data[0]) : [],
    }),
  );
  if (error) failed = true;
}
const roleKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ROLE_KEY;
if (roleKey) {
  const admin = createClient(url, roleKey, { auth: { persistSession: false } });
  for (const table of ["bot_performance_snapshots", "bot_trades"]) {
    const { data, error } = await admin.from(table).select("*").limit(1);
    console.log(
      JSON.stringify({
        table,
        ok: !error,
        rows: data?.length ?? 0,
        errorCode: error?.code ?? null,
        columns: data?.[0] ? Object.keys(data[0]) : [],
      }),
    );
    if (error) failed = true;
  }
}
process.exitCode = failed ? 1 : 0;
