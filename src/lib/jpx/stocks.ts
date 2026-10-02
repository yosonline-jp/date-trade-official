import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CurrentStock } from "./diff";

export async function readAllStocks(
  db: SupabaseClient,
): Promise<CurrentStock[]> {
  const rows: CurrentStock[] = [];
  for (let offset = 0; offset < 10_000; offset += 1000) {
    const { data, error } = await db
      .from("stocks")
      .select("code,name,market,category,industry")
      .order("code")
      .range(offset, offset + 999);
    if (error || !data)
      throw new Error("Supabaseの銘柄マスタを確認できませんでした。");
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
  throw new Error("銘柄マスタの件数が想定外です。");
}
