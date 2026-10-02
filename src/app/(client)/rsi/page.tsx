import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default async function RSIPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const supabase = createClient();

	// URLパラメータから初期値を取得
	const sp = await searchParams;
	const status = sp.status || "BUY";

	// 🔹 最新のランキングデータを取得（最新 scraped_at のものを優先）
	const { data, error } = await supabase
		.from("rsi_check")
		.select("*")
		.eq("status", status);

	if (error) {
		console.error(error);
		return (
			<p className="text-center text-red-500 py-20">
				売られ過ぎデータの取得に失敗しました。
			</p>
		);
	}

	if (!data || data.length === 0) {
		return (
			<p className="text-center text-muted-foreground py-20">
				売られ過ぎデータがありません。
			</p>
		);
	}

	// 最新データの取得日時
	const latestTime = data[0]?.checked_at
		? new Date(data[0].checked_at).toLocaleString("ja-JP", {
				timeZone: "Asia/Tokyo",
				hour12: false,
		  })
		: null;

	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-6 text-center">
				{status === "BUY" ? "売られ過ぎ" : "買われ過ぎ"}ランキング（RSI）
			</h1>
			{/* {latestTime && ( */}
			<p className="text-sm text-center text-muted-foreground mb-6">
				更新日時：{latestTime}
			</p>
			{/* )} */}

			{/* search param statusをBUYとSELLで切り開けるボタン */}
			<div className="flex justify-center mb-6 space-x-4">
				<Link
					href="/rsi?status=BUY"
					className={`px-4 py-2 rounded-md font-medium ${
						status === "BUY"
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-800 hover:bg-gray-300"
					}`}
				>
					売られ過ぎ（BUY）
				</Link>
				<Link
					href="/rsi?status=SELL"
					className={`px-4 py-2 rounded-md font-medium ${
						status === "SELL"
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-800 hover:bg-gray-300"
					}`}
				>
					買われ過ぎ（SELL）
				</Link>
			</div>

			<div className="border rounded-md overflow-hidden shadow-sm">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-16 text-center">コード</TableHead>
							<TableHead>銘柄名</TableHead>
							<TableHead className="w-32 text-right">RSI</TableHead>
							<TableHead className="w-32 text-right">価格</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((stock) => (
							<TableRow
								key={stock.symbol}
								className={stock.type !== "JP" ? "bg-blue-50" : ""}
							>
								<TableCell className="text-center font-medium">
									{stock.symbol}
								</TableCell>
								<TableCell>{stock.name}</TableCell>
								<TableCell className="text-right">
									{stock.rsi
										? `${Number(stock.rsi).toFixed(2).toLocaleString()}`
										: "-"}
								</TableCell>
								{/* price convert yen and dollar */}
								<TableCell className="text-right">
									{stock.type == "JP"
										? `${Number(stock.price).toLocaleString()} 円`
										: `$${Number(stock.price).toLocaleString()}`}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
