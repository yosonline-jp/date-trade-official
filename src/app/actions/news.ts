"use server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
type NewsInput = {
  id?: number;
  header: { title: string; description: string };
  content: unknown;
};
export async function saveNews({ id, header, content }: NewsInput) {
  const { db } = await requireAdmin();
  if (
    !header.title.trim() ||
    header.title.length > 200 ||
    header.description.length > 1000
  )
    throw new Error(
      "タイトルは1〜200文字、説明は1000文字以内で入力してください。",
    );
  if (!Array.isArray(content) || JSON.stringify(content).length > 1000000)
    throw new Error("記事本文を確認してください。");
  const query = id
    ? db.from("news").update({ header, content }).eq("id", id)
    : db.from("news").insert({ header, content });
  const { data, error } = await query.select("id").single();
  if (error || !data)
    throw new Error(
      "保存できませんでした。権限または接続状態を確認してください。",
    );
  revalidatePath("/news");
  revalidatePath(`/news/${data.id}`);
  revalidatePath("/dashboard/cms");
  revalidatePath("/dashboard/news");
  revalidatePath("/");
  return data.id;
}
export async function addNews(formData: FormData) {
  const text = String(formData.get("comment") || "").trim();
  return saveNews({
    header: { title: text.slice(0, 200), description: "" },
    content: [{ type: "p", children: [{ text }] }],
  });
}
export async function deleteNews(id: number) {
  const { db } = await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("記事IDが不正です。");
  const { data, error } = await db
    .from("news")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data) throw new Error("削除できませんでした。");
  revalidatePath("/news");
  revalidatePath(`/news/${id}`);
  revalidatePath("/dashboard/cms");
  revalidatePath("/dashboard/news");
  revalidatePath("/");
}
