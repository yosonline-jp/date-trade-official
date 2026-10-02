import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { Trade } from "./journal";
import { tradeColumns } from "./journal-columns";
export { tradeColumns } from "./journal-columns";
export async function journalClient() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("ログインしてください。");
  return { db, user };
}
export async function allTrades(userId: string) {
  const db = await createClient();
  const rows: Trade[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db
      .from("trade_records")
      .select(tradeColumns)
      .eq("user_id", userId)
      .order("trade_date", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 999);
    if (result.error)
      throw new Error(
        "取引記録を取得できませんでした。DB更新が適用されているか確認してください。",
      );
    rows.push(...(result.data as Trade[]));
    if (result.data.length < 1000) break;
  }
  return rows;
}
