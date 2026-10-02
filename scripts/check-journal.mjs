import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const tables = {
  trade_records:
    "id,fees,entry_reason,reflection,tags,screenshot_path,visibility,import_key",
  daily_profit: "id,adjustment_amount",
  journal_settings: "user_id,calendar_source",
  journal_reports: "user_id,period,start_date",
  watchlist_notes: "user_id,stock_code",
};
let missing = false;
for (const [table, columns] of Object.entries(tables)) {
  const result = await db.from(table).select(columns).limit(0);
  if (result.error) {
    console.log(
      table +
        ": DB update required (" +
        (result.error.code || result.status) +
        ", " +
        result.error.message +
        ")",
    );
    missing = true;
  } else console.log(table + ": ready");
}
process.exitCode = missing ? 1 : 0;
