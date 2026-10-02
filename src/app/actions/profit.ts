// app/actions/profit.ts
"use server";
import { createClient } from "@/utils/supabase/server";
import { toDateKey } from "@/utils/utils";

export async function loadMonthlyProfits({
	year,
	month,
}: {
	year: number;
	month: number;
}) {
	const supabase = await createClient();

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("未ログインです");
	}

	// 月初と月末をUTCで生成
	const from = toDateKey(new Date(Date.UTC(year, month, 1)));
	const to = toDateKey(new Date(Date.UTC(year, month + 1, 0)));

	const { data, error } = await supabase
		.from("daily_profit")
		.select("*")
		.eq("user_id", user.id)
		.gte("date", from)
		.lte("date", to);

	if (error) throw error;

	return data || [];
}

export async function getProfit(date: Date) {
	const supabase = await createClient();
	const d = toDateKey(date);

	const { data } = await supabase
		.from("daily_profit")
		.select("*")
		.eq("date", d)
		.maybeSingle();

	return data;
}

export async function addProfit(date: string, amount: number) {
	const supabase = await createClient();

	const { error } = await supabase
		.from("daily_profit")
		.insert({ date: new Date(date), amount });

	if (error) throw error;
}

export async function updateProfit(id: number, amount: number) {
	const supabase = await createClient();
	const { error } = await supabase.from("daily_profit").update({ amount }).eq("id", id);
	if (error) throw error;
}

export async function deleteProfit(id: number) {
	const supabase = await createClient();
	const { error } = await supabase.from("daily_profit").delete().eq("id", id);
	if (error) throw error;
}
