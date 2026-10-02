import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JpxSource } from "./parse";
import { ensurePrivateBucket } from "@/lib/nikkei/storage";

const BUCKET = "daytrade-admin";
const CURRENT = "stock-master/current.json";
export type StoredJpx = JpxSource & {
  importedAt: string;
  added: number;
  changed: number;
  markedDelisted: number;
};

export async function readStoredJpx(
  db: SupabaseClient,
): Promise<StoredJpx | null> {
  const { data, error } = await db.storage.from(BUCKET).download(CURRENT);
  if (error || !data) return null;
  try {
    const value = JSON.parse(await data.text()) as StoredJpx;
    return value.stocks?.length >= 3500 ? value : null;
  } catch {
    return null;
  }
}

export async function saveStoredJpx(db: SupabaseClient, record: StoredJpx) {
  await ensurePrivateBucket(db);
  const bytes = Buffer.from(JSON.stringify(record), "utf8");
  if (bytes.length > 950_000)
    throw new Error("銘柄マスタの保存サイズが上限を超えました。");
  const history = `stock-master/history/${record.importedAt.replace(/[:.]/g, "-")}.json`;
  const { error: historyError } = await db.storage
    .from(BUCKET)
    .upload(history, bytes, { contentType: "application/json", upsert: false });
  if (historyError) throw new Error("全銘柄の更新履歴を保存できませんでした。");
  const { error } = await db.storage
    .from(BUCKET)
    .upload(CURRENT, bytes, { contentType: "application/json", upsert: true });
  if (error) throw new Error("全銘柄の最新一覧を保存できませんでした。");
}

export async function listJpxHistory(db: SupabaseClient) {
  const { data, error } = await db.storage
    .from(BUCKET)
    .list("stock-master/history", {
      limit: 10,
      sortBy: { column: "name", order: "desc" },
    });
  if (error) return [];
  return (data ?? []).map((item) => ({
    name: item.name,
    createdAt: item.created_at,
  }));
}
