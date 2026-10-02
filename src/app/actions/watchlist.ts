"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addToWatchlist(stock: { code: string; name: string }) {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("ログインが必要です。");
	}

	const { error } = await supabase.from("watchlist").insert({
		user_id: user.id,
		stock_code: stock.code,
		stock_name: stock.name,
	});

	if (error) throw new Error(error.message);

	revalidatePath("/dashboard/watchlist");
}

export async function removeFromWatchlist(stockCode: string) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("ログインが必要です。");
	}

	const { error } = await supabase
		.from("watchlist")
		.delete()
		.eq("user_id", user.id)
		.eq("stock_code", stockCode);

	if (error) throw new Error(error.message);

	// revalidate watchlist page, dashboard watchlist section
	revalidatePath("/watchlist");
	revalidatePath("/dashboard/watchlist");
}

export async function checkWatchlist(stockCode: string): Promise<boolean> {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return false;

	const { data, error } = await supabase
		.from("watchlist")
		.select("id")
		.eq("user_id", user.id)
		.eq("stock_code", stockCode)
		.single();

	if (error) return false;
	return !!data;
}
