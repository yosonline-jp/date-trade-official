/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

export async function analyzeFundamentals({
	messages,
	code,
	name,
}: {
	messages: string;
	code: string;
	name: string;
}) {
	try {
		if (!messages) {
			throw new Error("Invalid request");
		}

		const supabase = await createClient();
		const { data: user } = await supabase.auth.getUser();

		if (!user || !user.user) {
			return { error: "Unauthorized", status: 401 };
		}

		// --- get role ---
		const { data: profile, error: profileError } = await supabase
			.from("users")
			.select("role")
			.eq("id", user.user.id)
			.single();

		if (profileError || !profile) {
			return { error: "Unauthorized", status: 401 };
		}

		// --- general users: limit 5 per day ---
		if (profile.role !== "admin") {
			const { data: todayAnalyses, error: fetchError } = await supabase
				.from("fundamental_analysis")
				.select("*", { count: "exact" })
				.gte(
					"created_at",
					new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
				)
				.eq("user_id", user.user.id);

			if (fetchError) {
				console.log(fetchError);
				return { error: "Internal Server Error", status: 500 };
			}

			if ((todayAnalyses?.length || 0) >= 5) {
				return { error: "Daily limit reached", status: 429 };
			}
		}

		// すでに同じ銘柄で分析済みか確認、同じ日付け(YYYY/MM/DD Timezone日本時間)
		const { data: existingAnalysis } = await supabase
			.from("fundamental_analysis")
			.select("result")
			.eq("code", code)
			.gte(
				"created_at",
				new Date(new Date().setHours(0, 0, 0, 0)).toLocaleString("ja-JP", {
					timeZone: "Asia/Tokyo",
				})
			)
			.maybeSingle();

		if (existingAnalysis) {
			return { text: existingAnalysis.result, status: 200 };
		}

		const client = new OpenAI();

		// ---- AI Response ----
		const response = await client.responses.create({
			model: "gpt-5",
			tools: [{ type: "web_search" }],
			input: messages,
			instructions: `あなたはプロの株アナリストです。ユーザーが指定した銘柄について最新情報をウェブ検索し、以下を含む「株のファンダメンタル分析レポート」を丁寧に作成してください。
● 企業概要  
● 業績の推移  
● 財務健全性  
● 成長性  
● 割安性（PER/PBRなど）  
● 株主還元  
● リスク要因  
● 総合評価（買い/中立/注意 など）
最後に必ず「※本レポートはXXXX年XX月時点の情報に基づいて作成しています。」を付けてください。
文字数は1500文字以内でお願いします。`,
		});

		const text = response.output_text;

		// Save result
		const { error } = await supabase.from("fundamental_analysis").insert({
			code,
			name,
			result: text,
			user_id: user.user.id,
		});

		if (error) {
			console.log(error);
			return { error: "Database error", status: 500 };
		}

		return { text, status: 200 };
	} catch (e: any) {
		console.log(e);
		if (e.status === 429) {
			return { error: "Daily limit reached", status: 429 };
		}
		return { error: "Internal Server Error", status: 500 };
	}
}
