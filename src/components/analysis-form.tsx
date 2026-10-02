/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { StockSearchField } from "./pages/dashboard/trade/stock-search-field";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Label } from "./ui/label";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { analyzeFundamentals } from "@/app/actions/analyze-fundamentals"; // ← Server Action
import Image from "next/image";

const AnalysisForm = () => {
	const router = useRouter();
	const [stockData, setStockData] = useState({
		stockName: "",
		stockCode: "",
	});

	const [result, setResult] = useState<string>("");
	const [loading, setLoading] = useState(false);

	const sendRequest = async () => {
		if (!stockData.stockCode) return;

		setLoading(true);
		setResult("");

		try {
			// --- Server Action を直接実行 ---
			const res = await analyzeFundamentals({
				code: stockData.stockCode,
				name: stockData.stockName,
				messages: `${stockData.stockName} ${stockData.stockCode}`,
			});

			// --- エラーハンドリング ---
			if (res.status === 401) {
				toast({
					title: "認証エラー",
					description: "サインインが必要です。サインインページに移動します。",
					variant: "destructive",
				});
				router.push("/sign-in");
				setLoading(false);
				return;
			}

			if (res.status === 429) {
				toast({
					title: "制限に達しました",
					description:
						"本日の分析回数の上限に達しました。明日以降に再度お試しください。",
					variant: "destructive",
				});
				setLoading(false);
				return;
			}

			if (res.error) {
				toast({
					title: "サーバーエラー",
					description:
						"サーバーでエラーが発生しました。後ほど再度お試しください。",
					variant: "destructive",
				});
				setLoading(false);
				return;
			}

			// --- 成功時 ---
			setResult(
				res.text || "ファンダメンタル分析の結果が取得できませんでした。"
			);
			setLoading(false);
		} catch (error: any) {
			console.error("Error fetching analysis:", error);
			setLoading(false);
		}
	};

	return (
		<Card className="shadow-sm border border-gray-100 hover:shadow-md transition-all">
			<CardHeader>
				<h2 className="text-2xl font-semibold">ファンダメンタル分析を行う</h2>
			</CardHeader>
			<CardContent>
				{!loading && result.length == 0 && (
					<>
						<Label>銘柄検索</Label>
						<StockSearchField
							onSelect={(stock) => {
								stockData.stockCode = stock.code;
								stockData.stockName = stock.name;
								setStockData({ ...stockData });
							}}
						/>
					</>
				)}

				{stockData.stockCode && (
					<p className="text-sm text-muted-foreground mt-1">
						選択中：{stockData.stockName}（{stockData.stockCode}）
					</p>
				)}

				{!loading && result.length == 0 && (
					<Button className="mt-4 w-full" onClick={sendRequest}>
						分析する
					</Button>
				)}

				{loading && (
					<div className="flex py-10 flex-col items-center justify-center space-y-4">
						<div className="flex flex-col justify-center space-y-8 items-center">
							<Image
								src="/analysis.png"
								alt="分析中"
								width={200}
								height={200}
								className="animate-pulse animate-slow"
							/>
							<p>分析中です…</p>
							{/* analysis.png (human is analyzing image) with animation */}

							<p className="text-sm">更新しないでください</p>
						</div>
					</div>
				)}

				{!loading && result && (
					<div className="mt-6 whitespace-pre-wrap">
						<Markdown>{result}</Markdown>
						<Button
							className="mt-4"
							variant="outline"
							onClick={() => {
								setResult("");
								setStockData({ stockName: "", stockCode: "" });
							}}
						>
							別の銘柄を分析する
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default AnalysisForm;
