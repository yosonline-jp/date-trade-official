import { createClient } from "@/utils/supabase/server";

export const JOURNAL_PAGE_SIZE = 12;
export type JournalTab = "real" | "demo" | "favorites";
export async function getProfileJournal(
  userId: string,
  search: Record<string, string | string[] | undefined>,
) {
  const tab: JournalTab =
    search.tab === "demo" || search.tab === "favorites" ? search.tab : "real";
  const requested = typeof search.page === "string" ? Number(search.page) : 1;
  const db = await createClient();
  const [real, demo, favorites] = await Promise.all([
    db
      .from("trade_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "real"),
    db
      .from("trade_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "demo"),
    db
      .from("watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  const counts = {
    real: real.count ?? 0,
    demo: demo.count ?? 0,
    favorites: favorites.count ?? 0,
  };
  const total = counts[tab];
  const pages = Math.max(1, Math.ceil(total / JOURNAL_PAGE_SIZE));
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, pages)
      : 1;
  const from = (page - 1) * JOURNAL_PAGE_SIZE;
  const common = { tab, page, pages, total, counts };
  const countError = Boolean(real.error || demo.error || favorites.error);
  if (tab === "favorites") {
    const result = await db
      .from("watchlist")
      .select("id, stock_code, stock_name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + JOURNAL_PAGE_SIZE - 1);
    return {
      ...common,
      records: [],
      watchlist: result.data ?? [],
      error: countError || Boolean(result.error),
    };
  }
  const result = await db
    .from("trade_records")
    .select(
      "id, stock_code, stock_name, buy_price, sell_price, quantity, profit, trade_date, memo, type, trade_type, entry_reason, reflection, tags, screenshot_path, visibility",
    )
    .eq("user_id", userId)
    .eq("type", tab)
    .order("trade_date", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + JOURNAL_PAGE_SIZE - 1);
  return {
    ...common,
    records: result.data ?? [],
    watchlist: [],
    error: countError || Boolean(result.error),
  };
}
