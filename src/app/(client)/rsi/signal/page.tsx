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
	const type = sp.type || "";
	const table = type === "US" ? "rsi_signals_us" : "rsi_signals";

	// 🔹 最新のランキングデータを取得（最新 scraped_at のものを優先）
	const { data, error } = await supabase.from(table).select("*");

	if (error) {
		console.error(error);
		return (
			<p className="text-center text-red-500 py-20">
				シグナルの取得に失敗しました。
			</p>
		);
	}

	// 最新データの取得日時
	const latestTime = data[0]?.created_at
		? new Date(data[0].created_at).toLocaleString("ja-JP", {
				timeZone: "Asia/Tokyo",
				hour12: false,
		  })
		: null;

	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-6 text-center">
				{type === "" ? "日本" : "アメリカ"}のシグナル一覧
			</h1>
			{/* {latestTime && ( */}
			<p className="text-sm text-center text-muted-foreground mb-6">
				更新日時：{latestTime || "-"}
			</p>
			{/* )} */}

			{/* search param typeをBUYとSELLで切り開けるボタン */}
			<div className="flex justify-center mb-6 space-x-4">
				<Link
					href="/rsi/signal"
					className={`px-4 py-2 rounded-md font-medium ${
						type === "BUY"
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-800 hover:bg-gray-300"
					}`}
				>
					日本
				</Link>
				<Link
					href="/rsi/signal?type=US"
					className={`px-4 py-2 rounded-md font-medium ${
						type === "SELL"
							? "bg-blue-600 text-white"
							: "bg-gray-200 text-gray-800 hover:bg-gray-300"
					}`}
				>
					アメリカ
				</Link>
			</div>

			{data.length === 0 && (
				<p className="text-center text-muted-foreground py-20">
					シグナルデータがありません。
				</p>
			)}

			{
				/* テーブル表示 */
				data.length > 0 && (
					<div className="border rounded-md overflow-hidden shadow-sm">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-16 text-center">コード</TableHead>
									<TableHead>銘柄名</TableHead>
									<TableHead className="text-center">シグナル</TableHead>
									<TableHead className="text-right">価格</TableHead>
									<TableHead className="text-right">RSI</TableHead>
									<TableHead className="text-right">SMA5</TableHead>
									<TableHead className="text-right">MACD</TableHead>
									<TableHead className="text-right">MACD SIGNAL</TableHead>
									<TableHead className="text-right">VOLUME</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.map((stock) => (
									<TableRow key={stock.symbol}>
										<TableCell className="text-center font-medium">
											{stock.symbol}
										</TableCell>
										<TableCell>{stock.name}</TableCell>
										<TableCell className="text-center">
											{stock.signal}
										</TableCell>
										<TableCell className="text-right">
											{type == "US"
												? `$${Number(stock.price).toLocaleString()}`
												: `${Number(stock.price).toLocaleString()} 円`}
										</TableCell>
										<TableCell className="text-right">
											{stock.rsi
												? `${Number(stock.rsi).toFixed(2).toLocaleString()}`
												: "-"}
										</TableCell>
										<TableCell className="text-right">
											{stock.sma5
												? `${Number(stock.sma5).toFixed(2).toLocaleString()}`
												: "-"}
										</TableCell>
										<TableCell className="text-right">
											{stock.macd
												? `${Number(stock.macd).toFixed(2).toLocaleString()}`
												: "-"}
										</TableCell>
										<TableCell className="text-right">
											{stock.macd_signal
												? `${Number(stock.macd_signal)
														.toFixed(2)
														.toLocaleString()}`
												: "-"}
										</TableCell>
										<TableCell className="text-right">
											{stock.volume
												? `${Number(stock.volume).toFixed(2).toLocaleString()}`
												: "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)
			}
		</div>
	);
}
