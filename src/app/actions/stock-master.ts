"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createRoleClient } from "@/utils/supabase/server";
import { fetchCurrentJpxStocks } from "@/lib/jpx/source";
import { compareStocks, stockRowsForChanges } from "@/lib/jpx/diff";
import { readAllStocks } from "@/lib/jpx/stocks";
import { readStoredJpx, saveStoredJpx } from "@/lib/jpx/storage";
import { ensurePrivateBucket } from "@/lib/nikkei/storage";

export async function syncStockMaster() {
  await requireAdmin();
  const source = await fetchCurrentJpxStocks();
  const db = await createRoleClient();
  const [previous, current] = await Promise.all([
    readStoredJpx(db),
    readAllStocks(db),
  ]);
  if (previous && source.sourceDate < previous.sourceDate)
    throw new Error("保存済みより古いJPX一覧です。更新を中止しました。");
  const previousCodes = new Set(
    previous?.stocks.map((item) => item.code) ?? [],
  );
  const currentCodes = new Set(source.stocks.map((item) => item.code));
  const delisted = [...previousCodes].filter((code) => !currentCodes.has(code));
  if (previous && delisted.length > Math.max(30, previous.stocks.length * 0.01))
    throw new Error("上場廃止の差分が多すぎます。JPX一覧を確認してください。");
  const changes = compareStocks(source.stocks, current);
  const added = changes.filter((item) => item.kind === "new").length;
  const changed = changes.filter((item) => item.kind === "changed").length;
  const importedAt = new Date().toISOString();
  const record = {
    ...source,
    importedAt,
    added,
    changed,
    markedDelisted: delisted.length,
  };
  if (Buffer.byteLength(JSON.stringify(record), "utf8") > 950_000)
    throw new Error("保存する一覧のサイズが上限を超えました。");
  await ensurePrivateBucket(db);

  const rows = stockRowsForChanges(changes, current, importedAt);
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const { data, error } = await db
      .from("stocks")
      .upsert(batch, { onConflict: "code" })
      .select("code");
    if (error || data?.length !== batch.length)
      throw new Error(
        "銘柄マスタの保存に失敗しました。再実行すると差分から再開できます。",
      );
  }
  for (let offset = 0; offset < delisted.length; offset += 100) {
    const batch = delisted.slice(offset, offset + 100);
    const { data, error } = await db
      .from("stocks")
      .update({ market: "上場廃止", updated_at: importedAt })
      .in("code", batch)
      .select("code");
    if (error || data?.length !== batch.length)
      throw new Error(
        "上場廃止の反映に失敗しました。再実行すると差分から再開できます。",
      );
  }
  await saveStoredJpx(db, record);
  revalidatePath("/dashboard/stock-master");
  revalidatePath("/dashboard/nikkei225");
  revalidatePath("/stocks");
  return {
    sourceDate: source.sourceDate,
    importedAt,
    total: source.stocks.length,
    added,
    changed,
    markedDelisted: delisted.length,
  };
}
