"use server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
type TechnicalData = {
  id?: number;
  header: { title: string; description: string; thumbnail?: string | null };
  content: unknown;
};
export async function saveTechnicalAnalysis({
  id,
  header,
  content,
}: TechnicalData) {
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
    ? db.from("technical_analysis").update({ header, content }).eq("id", id)
    : db.from("technical_analysis").insert({ header, content });
  const { data, error } = await query.select("id").single();
  if (error || !data)
    throw new Error(
      "保存できませんでした。権限または接続状態を確認してください。",
    );
  revalidatePath("/dashboard/cms");
  revalidatePath("/dashboard/technical");
  revalidatePath("/technicals");
  revalidatePath(`/technicals/${data.id}`);
  return data.id;
}
export async function deleteTechnicalAnalysis(id: number) {
  const { db } = await requireAdmin();
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("記事IDが不正です。");
  const { data, error } = await db
    .from("technical_analysis")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data) throw new Error("削除できませんでした。");
  revalidatePath("/dashboard/cms");
  revalidatePath("/dashboard/technical");
  revalidatePath("/technicals");
  revalidatePath(`/technicals/${id}`);
}
