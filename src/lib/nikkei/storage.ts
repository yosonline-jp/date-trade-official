import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NikkeiSource } from "./parse";

const BUCKET = "daytrade-admin";
const CURRENT = "nikkei225/current.json";

export type StoredNikkei = NikkeiSource & {
  importedAt: string;
  added: number;
  removed: number;
};

export async function readStoredNikkei(
  db: SupabaseClient,
): Promise<StoredNikkei | null> {
  const { data, error } = await db.storage.from(BUCKET).download(CURRENT);
  if (error || !data) return null;
  try {
    const record = JSON.parse(await data.text()) as StoredNikkei;
    return record.components?.length === 225 ? record : null;
  } catch {
    return null;
  }
}

export async function ensurePrivateBucket(db: SupabaseClient) {
  const { data, error } = await db.storage.getBucket(BUCKET);
  if (data?.public)
    throw new Error("保存先が公開設定のため、同期を中止しました。");
  if (data) return;
  if (error && error.statusCode !== "404")
    throw new Error("保存先を確認できませんでした。");
  const { error: createError } = await db.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 1_000_000,
    allowedMimeTypes: ["application/json"],
  });
  if (createError && createError.statusCode !== "409")
    throw new Error("保存先を作成できませんでした。");
}

export async function saveStoredNikkei(
  db: SupabaseClient,
  record: StoredNikkei,
) {
  await ensurePrivateBucket(db);
  const bytes = Buffer.from(JSON.stringify(record), "utf8");
  const history = `nikkei225/history/${record.importedAt.replace(/[:.]/g, "-")}.json`;
  const { error: historyError } = await db.storage
    .from(BUCKET)
    .upload(history, bytes, { contentType: "application/json", upsert: false });
  if (historyError) throw new Error("更新履歴を保存できませんでした。");
  const { error } = await db.storage
    .from(BUCKET)
    .upload(CURRENT, bytes, { contentType: "application/json", upsert: true });
  if (error) throw new Error("最新リストを保存できませんでした。");
}

export async function listNikkeiHistory(db: SupabaseClient) {
  const { data, error } = await db.storage
    .from(BUCKET)
    .list("nikkei225/history", {
      limit: 20,
      sortBy: { column: "name", order: "desc" },
    });
  if (error) return [];
  return (data ?? []).map((file) => ({
    name: file.name,
    createdAt: file.created_at,
  }));
}
