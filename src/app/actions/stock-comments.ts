"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { StockCommentSchema } from "@/validations/stock-comment";
import type { StockCommentResult } from "@/lib/stock-comment";

export async function addComment(
  stockCode: string,
  comment: string,
): Promise<StockCommentResult> {
  try {
    const supabase = await createClient();
    // Verify again on submission, including sessions that expired after render.
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) {
      return {
        status: "auth-required",
        message:
          "コメントを投稿するにはログインが必要です。再度ログインしてください。",
      };
    }

    const parsed = StockCommentSchema.safeParse({ stockCode, comment });
    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues[0].message,
      };
    }
    const { error } = await supabase.from("stock_comments").insert({
      stock_code: parsed.data.stockCode,
      user_id: data.user.id,
      comment: parsed.data.comment,
    });
    if (error) {
      return {
        status: "error",
        message:
          "コメントを投稿できませんでした。時間をおいて再度お試しください。",
      };
    }

    revalidatePath("/stocks/" + parsed.data.stockCode);
    revalidatePath("/dashboard/stocks/" + parsed.data.stockCode);
    return { status: "success", message: "コメントを投稿しました。" };
  } catch {
    return {
      status: "error",
      message: "通信に失敗しました。入力内容を確認して、再度お試しください。",
    };
  }
}

export async function deleteComment(id: string) {
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("未ログイン");
  const { error } = await supabase
    .from("stock_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath(`/stocks/${id}`);
}
