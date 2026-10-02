/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartData {
	date: string;
	price: number;
}

function ChartBlock() {
	const [selectedSymbol, setSelectedSymbol] = useState("7203"); // デフォルト：トヨタ
	const [chartData, setChartData] = useState<ChartData[]>([]);
	const [loading, setLoading] = useState(false);

	const watchSymbols = [
		{ code: "7203", name: "トヨタ自動車" },
		{ code: "6758", name: "ソニーグループ" },
		{ code: "9984", name: "ソフトバンクG" },
		{ code: "8306", name: "三菱UFJ" },
	];

	// ダミーデータ or API連携
	useEffect(() => {
		async function fetchChartData() {
			setLoading(true);
			try {
				// 将来的にはAPI（例: /api/chart?code=XXXX）から取得
				const res = await fetch(`/api/chart?code=${selectedSymbol}`);
				if (!res.ok) throw new Error("APIエラー");
				const data = await res.json();
				setChartData(data);
			} catch (e) {
				// デモ用ダミーデータ
				const dummy = Array.from({ length: 30 }, (_, i) => ({
					date: `10/${i + 1}`,
					price: 2500 + Math.sin(i / 3) * 80 + Math.random() * 50,
				}));
				setChartData(dummy);
			} finally {
				setLoading(false);
			}
		}

		fetchChartData();
	}, [selectedSymbol]);

	return (
		<>
			{/* 銘柄セレクター */}
			<div className="flex justify-center gap-2 flex-wrap mb-6">
				{watchSymbols.map((s) => (
					<Button
						key={s.code}
						variant={selectedSymbol === s.code ? "default" : "outline"}
						onClick={() => setSelectedSymbol(s.code)}
					>
						{s.name}
					</Button>
				))}
			</div>

			{/* チャート表示 */}
			<Card className="shadow-md">
				<CardHeader>
					<CardTitle>
						{watchSymbols.find((s) => s.code === selectedSymbol)?.name}（
						{selectedSymbol}）
					</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex justify-center py-20">
							<Loader2 className="animate-spin w-6 h-6" />
						</div>
					) : (
						<ResponsiveContainer width="100%" height={400}>
							<LineChart data={chartData}>
								<XAxis dataKey="date" />
								<YAxis domain={["auto", "auto"]} />
								<Tooltip />
								<Line
									type="monotone"
									dataKey="price"
									stroke="#2563eb"
									strokeWidth={2}
									dot={false}
									animationDuration={500}
								/>
							</LineChart>
						</ResponsiveContainer>
					)}
				</CardContent>
			</Card>
		</>
	);
}

export default ChartBlock;
