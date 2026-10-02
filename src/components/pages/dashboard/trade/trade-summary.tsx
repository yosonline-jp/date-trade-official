"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

interface TradeSummary {
	todayCount: number;
	winRate: number;
	totalProfit: number;
}

export default function DashboardTradeSummary({ userId }: { userId: string }) {
	const [summary, setSummary] = useState<TradeSummary | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!userId) return;
		fetchSummary();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId]);

	async function fetchSummary() {
		const supabase = createClient();
		setLoading(true);

		try {
			const today = new Date().toISOString().split("T")[0];

			// 1️⃣ 今日のトレード
			const { data: todayTrades, error: todayErr } = await supabase
				.from("trade_records")
				.select("profit")
				.eq("user_id", userId)
				.eq("type", "real")
				.eq("trade_date", today);

			if (todayErr) throw todayErr;

			// 2️⃣ 全トレード
			const { data: allTrades, error: allErr } = await supabase
				.from("trade_records")
				.select("profit")
				.eq("type", "real")
				.eq("user_id", userId);

			if (allErr) throw allErr;

			// 📊 集計
			const todayCount = todayTrades.length;
			const totalProfit = allTrades.reduce(
				(sum, t) => sum + (t.profit || 0),
				0
			);
			const winTrades = allTrades.filter((t) => (t.profit || 0) > 0).length;
			const winRate =
				allTrades.length > 0
					? Math.round((winTrades / allTrades.length) * 100)
					: 0;

			setSummary({ todayCount, winRate, totalProfit });
		} catch (err) {
			console.error("❌ 集計エラー:", err);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>💼 あなたのトレード概要</CardTitle>
				</CardHeader>
				<CardContent className="flex justify-center py-10">
					<Loader2 className="w-6 h-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	if (!summary) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>💼 あなたのトレード概要</CardTitle>
				</CardHeader>
				<CardContent className="text-center py-10 text-muted-foreground">
					データを取得できませんでした。
				</CardContent>
			</Card>
		);
	}

	const { todayCount, winRate, totalProfit } = summary;

	return (
		<Card>
			<CardHeader>
				<CardTitle>💼 あなたのトレード概要</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 text-lg">
					<p>
						本日のトレード数：<strong>{todayCount}件</strong>
					</p>
					<p>
						勝率：<strong>{winRate}%</strong>
					</p>
					<p>
						累計利益：
						<strong
							className={totalProfit >= 0 ? "text-green-600" : "text-red-600"}
						>
							{totalProfit >= 0 ? "+" : ""}
							{totalProfit.toLocaleString()}円
						</strong>
					</p>
				</div>
				<Link href="/dashboard/trade-records">
					<Button className="mt-4 w-full">詳細を確認する</Button>
				</Link>
			</CardContent>
		</Card>
	);
}
