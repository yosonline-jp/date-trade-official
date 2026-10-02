"use server";

import { createClient } from "@/utils/supabase/server";

export async function getStocksAction({
	search = "",
	page = 1,
}: {
	search?: string;
	page?: number;
}) {
	const supabase = await createClient();

	const limit = 20;
	const offset = search ? 0 : (page - 1) * limit;

	const { data, error } = await supabase
		.from("stocks")
		.select("*", { count: "exact" })
		.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
		.order("code", { ascending: true })
		.range(offset, offset + limit - 1); // ← 修正：limit数に合わせる

	if (error) {
		console.error("❌ Server Action getStocksAction error:", error);
		throw new Error("データ取得に失敗しました");
	}

	return data;
}

export async function searchStocksAction(query: string) {
	if (!query) return [];

	const supabase = await createClient();

	const { data, error } = await supabase
		.from("stocks")
		.select("id, code, name, market")
		.or(`name.ilike.%${query}%,code.ilike.%${query}%`)
		.order("code", { ascending: true })
		.limit(5);

	if (error) {
		console.error("Stock search error:", error);
		return [];
	}

	return data;
}
