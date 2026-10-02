"use server";

import { createClient } from "@/utils/supabase/server";

type AddTradeInput = {
  stock_code: string;
  stock_name: string;
  buy_price: number;
  sell_price: number;
  quantity: number;
  type: "real" | "demo";
  trade_date: string; // YYYY-MM-DD
  memo?: string;
  trade_type: string; // 追加：現物・買建・売建
};

export async function addTradeRecord(input: AddTradeInput) {
  const { saveJournalTrade } = await import("./journal");
  await saveJournalTrade({ ...input, visibility: "private" });
  return { success: true };
}

export async function fetchTradesAction(page: number) {
  const supabase = await createClient();
  const limit = 20;

  const { data, error } = await supabase
    .from("trade_records")
    .select(
      "id, type, stock_code, stock_name, buy_price, sell_price, quantity, profit, memo, trade_date, created_at, users(id, account, nickname, avatar)",
    )
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + (limit - 1));

  if (error) {
    console.error(error);
    return { data: [], hasMore: false };
  }

  return {
    data,
    hasMore: data.length === limit,
  };
}
