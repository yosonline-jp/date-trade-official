"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchCurrentNikkei225 } from "@/lib/nikkei/source";
import {
  ensurePrivateBucket,
  readStoredNikkei,
  saveStoredNikkei,
} from "@/lib/nikkei/storage";
import { createRoleClient } from "@/utils/supabase/server";

export async function syncNikkei225() {
  await requireAdmin();
  const source = await fetchCurrentNikkei225();
  const admin = await createRoleClient();
  const previous = await readStoredNikkei(admin);
  if (previous && source.sourceDate < previous.sourceDate)
    throw new Error("保存済みより古い公式一覧です。同期を中止しました。");
  await ensurePrivateBucket(admin);

  const oldCodes = new Set(previous?.components.map((item) => item.code) ?? []);
  const newCodes = new Set(source.components.map((item) => item.code));
  const added = source.components.filter(
    (item) => !oldCodes.has(item.code),
  ).length;
  const removed =
    previous?.components.filter((item) => !newCodes.has(item.code)).length ?? 0;

  const importedAt = new Date().toISOString();
  await saveStoredNikkei(admin, {
    ...source,
    importedAt,
    added,
    removed,
  });
  revalidatePath("/dashboard/nikkei225");
  return {
    importedAt,
    sourceDate: source.sourceDate,
    added,
    removed,
  };
}
