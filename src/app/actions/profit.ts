"use server";
import { z } from "zod";
import { journalClient, allTrades } from "@/lib/journal-server";
import { validDate } from "@/lib/journal";
import { revalidatePath } from "next/cache";
const amountSchema = z.number().finite().min(-1e12).max(1e12);
const dateSchema = z.string().refine(validDate);
export async function loadMonthlyProfits({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  z.number().int().min(1900).max(2200).parse(year);
  z.number().int().min(0).max(11).parse(month);
  const { db, user } = await journalClient();
  const from = year + "-" + String(month + 1).padStart(2, "0") + "-01";
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  const [daily, setting, trades] = await Promise.all([
    db
      .from("daily_profit")
      .select("id,date,amount,adjustment_amount")
      .eq("user_id", user.id)
      .gte("date", from)
      .lte("date", end),
    db
      .from("journal_settings")
      .select("calendar_source")
      .eq("user_id", user.id)
      .maybeSingle(),
    allTrades(user.id),
  ]);
  if (daily.error || setting.error)
    throw new Error("収支を取得できませんでした。");
  return {
    rows: daily.data,
    source: (setting.data?.calendar_source || "manual") as "manual" | "trades",
    trades: trades.filter(
      (t) => t.type === "real" && t.trade_date >= from && t.trade_date <= end,
    ),
  };
}
export async function getProfit(date: Date) {
  const { db, user } = await journalClient();
  const key =
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0");
  const { data, error } = await db
    .from("daily_profit")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", key)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function addProfit(date: string, amount: number) {
  dateSchema.parse(date);
  amountSchema.parse(amount);
  const { db, user } = await journalClient();
  const { error } = await db
    .from("daily_profit")
    .insert({ user_id: user.id, date, amount });
  if (error) throw new Error("収支を保存できませんでした。");
  revalidatePath("/dashboard/profit-calendar");
}
export async function updateProfit(id: number, amount: number) {
  amountSchema.parse(amount);
  const { db, user } = await journalClient();
  const { error } = await db
    .from("daily_profit")
    .update({ amount })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error("収支を保存できませんでした。");
  revalidatePath("/dashboard/profit-calendar");
}
export async function deleteProfit(id: number) {
  const { db, user } = await journalClient();
  const { error } = await db
    .from("daily_profit")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error("収支を削除できませんでした。");
  revalidatePath("/dashboard/profit-calendar");
}
export async function saveProfitAdjustment(date: string, amount: number) {
  dateSchema.parse(date);
  amountSchema.parse(amount);
  const { db, user } = await journalClient();
  const { data, error: lookup } = await db
    .from("daily_profit")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();
  if (lookup) throw new Error("調整額を取得できませんでした。");
  const result = data
    ? await db
        .from("daily_profit")
        .update({ adjustment_amount: amount })
        .eq("id", data.id)
        .eq("user_id", user.id)
    : await db
        .from("daily_profit")
        .insert({
          user_id: user.id,
          date,
          amount: 0,
          adjustment_amount: amount,
        });
  if (result.error) throw new Error("調整額を保存できませんでした。");
  revalidatePath("/dashboard/profit-calendar");
}
