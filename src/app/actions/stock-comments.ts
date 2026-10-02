"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addComment(stockCode: string, comment: string) {
	const supabase = await createClient();
	const user = (await supabase.auth.getUser()).data.user;
	if (!user) throw new Error("未ログイン");
	const { error } = await supabase.from("stock_comments").insert({
		stock_code: stockCode,
		user_id: user.id,
		comment,
	});
	if (error) throw error;

	revalidatePath(`/stocks/${stockCode}`);
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
