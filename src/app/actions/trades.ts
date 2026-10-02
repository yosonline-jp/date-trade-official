"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

type AddTradeInput = {
	stock_code: string;
	stock_name: string;
	buy_price: number;
	sell_price: number;
	quantity: number;
	type: "real" | "demo";
	trade_date: string; // YYYY-MM-DD
	memo?: string;
	trade_type: string; // 追加：現物・買建・売建
};

export async function addTradeRecord(input: AddTradeInput) {
	const supabase = await createClient();

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("未ログインです");
	}

	// calculate profit
	let profit = (input.sell_price - input.buy_price) * input.quantity;
	// 売建の場合は逆になる
	if (input.trade_type === "売建") {
		profit = (input.buy_price - input.sell_price) * input.quantity;
	}

	const { error } = await supabase.from("trade_records").insert({
		user_id: user.id,
		...input,
		profit,
	});

	if (error) {
		console.error("❌ Supabase insert error:", error);
		throw new Error("トレードの登録に失敗しました");
	}

	// ✅ キャッシュクリア（必要に応じて）
	revalidatePath("/dashboard/trade-records");
	return { success: true };
}

export async function fetchTradesAction(page: number) {
	const supabase = await createClient();
	const limit = 20;

	const { data, error } = await supabase
		.from("trade_records")
		.select(
			"id, type, stock_code, stock_name, buy_price, sell_price, quantity, profit, memo, trade_date, created_at, users(id, account, nickname, avatar)"
		)
		.order("created_at", { ascending: false })
		.range(page * limit, page * limit + (limit - 1));

	if (error) {
		console.error(error);
		return { data: [], hasMore: false };
	}

	return {
		data,
		hasMore: data.length === limit,
	};
}
