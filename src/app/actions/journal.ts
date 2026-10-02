"use server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { journalClient, allTrades } from "@/lib/journal-server";
import { tradeFingerprint } from "@/lib/journal-csv";
import { periodRange, tradeProfit, validDate, type Trade } from "@/lib/journal";
const date = z.string().refine(validDate, "日付が不正です。");
const tradeSchema = z.object({
  stock_code: z.string().regex(/^[0-9A-Z]{4}$/),
  stock_name: z.string().trim().min(1).max(120),
  buy_price: z.number().finite().positive().max(1e9),
  sell_price: z.number().finite().positive().max(1e9),
  quantity: z.number().int().positive().max(1e9),
  trade_date: date,
  type: z.enum(["real", "demo"]),
  trade_type: z.enum(["現物", "買建", "売建"]),
  fees: z.number().finite().min(0).max(1e12).default(0),
  memo: z.string().max(5000).default(""),
  entry_reason: z.string().max(5000).default(""),
  reflection: z.string().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  visibility: z.enum(["public", "private"]).default("private"),
  screenshot_path: z.string().max(300).nullable().optional(),
});
function invalidate() {
  for (const path of [
    "/dashboard",
    "/dashboard/trade-records",
    "/dashboard/profit-calendar",
    "/dashboard/analytics",
    "/dashboard/reports",
    "/traders",
    "/trades",
    "/stocks",
  ])
    revalidatePath(path, "layout");
}
export async function saveJournalTrade(input: unknown, id?: number) {
  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success)
    throw new Error("銘柄・日付・価格・株数・タグを確認してください。");
  const data = parsed.data;
  const { db, user } = await journalClient();
  if (data.screenshot_path && !data.screenshot_path.startsWith(user.id + "/"))
    throw new Error("画像の所有者が一致しません。");
  const payload = { ...data, user_id: user.id, profit: tradeProfit(data) };
  const result = id
    ? await db
        .from("trade_records")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single()
    : await db.from("trade_records").insert(payload).select("id").single();
  if (result.error) throw new Error("取引を保存できませんでした。");
  invalidate();
  return result.data.id as number;
}
export async function importJournalTrades(input: unknown) {
  const items = z.array(tradeSchema).min(1).max(500).parse(input);
  const { db } = await journalClient();
  const rows = items.map((t) => ({
    ...t,
    import_key: createHash("sha256")
      .update(tradeFingerprint(t as Trade))
      .digest("hex"),
  }));
  const result = await db.rpc("import_journal_trades", { rows });
  if (result.error)
    throw new Error("取り込みに失敗しました。このバッチは保存されていません。");
  invalidate();
  return result.data as { added: number; skipped: number };
}
export async function uploadTradeScreenshot(form: FormData) {
  const { db, user } = await journalClient();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 3 * 1024 * 1024 || file.size === 0)
    throw new Error("画像は3MB以下にしてください。");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!png && !jpg && !webp)
    throw new Error("PNG・JPEG・WebP画像を選択してください。");
  const extension = png ? "png" : jpg ? "jpg" : "webp",
    mime = png ? "image/png" : jpg ? "image/jpeg" : "image/webp";
  const path = user.id + "/" + crypto.randomUUID() + "." + extension;
  const { error } = await db.storage
    .from("trade-screenshots")
    .upload(path, bytes, { contentType: mime });
  if (error) throw new Error("画像を保存できませんでした。");
  return path;
}
export async function removeTradeScreenshot(path: string) {
  const { db, user } = await journalClient();
  if (!path.startsWith(user.id + "/"))
    throw new Error("画像の所有者が一致しません。");
  const { error } = await db.storage.from("trade-screenshots").remove([path]);
  if (error) throw new Error("画像を削除できませんでした。");
}
export async function saveCalendarSource(source: "manual" | "trades") {
  z.enum(["manual", "trades"]).parse(source);
  const { db, user } = await journalClient();
  const { error } = await db
    .from("journal_settings")
    .upsert({ user_id: user.id, calendar_source: source });
  if (error) throw new Error("集計方法を保存できませんでした。");
  revalidatePath("/dashboard/profit-calendar");
}
export async function saveJournalReport(input: unknown) {
  const data = z
    .object({
      period: z.enum(["week", "month"]),
      start_date: date,
      reflection: z.string().max(5000),
      next_goal: z.string().max(5000),
    })
    .parse(input);
  if (periodRange(data.period, data.start_date).start !== data.start_date)
    throw new Error("期間の開始日が不正です。");
  const { db, user } = await journalClient();
  const { error } = await db
    .from("journal_reports")
    .upsert({ ...data, user_id: user.id });
  if (error) throw new Error("振り返りを保存できませんでした。");
  revalidatePath("/dashboard/reports");
}
export async function saveWatchlistNote(input: unknown) {
  const data = z
    .object({
      stock_code: z.string().regex(/^[0-9A-Z]{4}$/),
      category: z.string().trim().max(50),
      note: z.string().max(3000),
      target_price: z.number().finite().positive().max(1e9).nullable(),
    })
    .parse(input);
  const { db, user } = await journalClient();
  const { data: watch, error: watchError } = await db
    .from("watchlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("stock_code", data.stock_code)
    .limit(1);
  if (watchError || !watch?.length)
    throw new Error("ウォッチリストに銘柄を追加してください。");
  const { error } = await db
    .from("watchlist_notes")
    .upsert({ ...data, user_id: user.id });
  if (error) throw new Error("メモを保存できませんでした。");
  revalidatePath("/watchlist");
  revalidatePath("/dashboard/watchlist");
}

export async function loadOwnJournalTrades() {
  const { user } = await journalClient();
  return allTrades(user.id);
}

export async function deleteJournalTrade(id: number) {
  z.number().int().positive().parse(id);
  const { db, user } = await journalClient();
  const { data, error } = await db
    .from("trade_records")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("screenshot_path")
    .single();
  if (error) throw new Error("取引を削除できませんでした。");
  let imageRemoved = true;
  if (data.screenshot_path) {
    const result = await db.storage
      .from("trade-screenshots")
      .remove([data.screenshot_path]);
    imageRemoved = !result.error;
  }
  invalidate();
  return { imageRemoved };
}
