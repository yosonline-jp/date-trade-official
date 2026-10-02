import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type OwnedObject = { bucket_id: string; name: string };

/** Storage is removed through its API, then Auth atomically cascades DB rows. */
export async function removeAccount(admin: SupabaseClient, userId: string) {
  let imagesRemoved = false;
  for (;;) {
    // Always fetch the first page: removing rows changes subsequent offsets.
    const { data, error } = await admin.rpc("account_deletion_objects", {
      target_user_id: userId,
    });
    if (error || !Array.isArray(data)) {
      return {
        error: imagesRemoved
          ? "画像の削除が途中で停止しました。アカウントは残っています。再度お試しください。"
          : "削除の準備ができませんでした。管理者にお問い合わせください。アカウントは削除されていません。",
      };
    }
    if (data.length === 0) break;
    const buckets = new Map<string, string[]>();
    for (const object of data as OwnedObject[]) {
      const names = buckets.get(object.bucket_id) ?? [];
      names.push(object.name);
      buckets.set(object.bucket_id, names);
    }
    for (const [bucket, names] of buckets) {
      const { error: storageError } = await admin.storage
        .from(bucket)
        .remove(names);
      if (storageError) {
        return {
          error:
            "画像を削除できませんでした。アカウントは残っています。一部の画像が削除済みの場合があります。再度お試しください。",
        };
      }
      imagesRemoved = true;
    }
  }
  const { error } = await admin.auth.admin.deleteUser(userId, false);
  if (error) {
    return {
      error: imagesRemoved
        ? "画像は削除されましたが、アカウントを削除できませんでした。再度お試しください。"
        : "アカウントを削除できませんでした。時間をおいて再度お試しください。",
    };
  }
  return { success: true as const };
}
