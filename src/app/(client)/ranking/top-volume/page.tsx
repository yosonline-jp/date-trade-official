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

export const metadata = {
	title: "株式ランキング - 出来高銘柄情報",
	description:
		"出来高株式ランキングをチェック！上位50銘柄の株価、変動率、詳細リンクを提供。初心者から上級者まで役立つ情報をお届けします。",
};

export default async function RankingPage() {
	const supabase = createClient();

	// 🔹 ランキングデータを取得（最新 scraped_at のものを優先）
	const { data, error } = await supabase
		.from("most_active_stocks_ranking")
		.select("*")
		.eq("type", "top-volume")
		.order("rank", { ascending: true })
		.limit(50);

	if (error) {
		console.error(error);
		return (
			<p className="text-center text-red-500 py-20">
				ランキングデータの取得に失敗しました。
			</p>
		);
	}

	if (!data || data.length === 0) {
		return (
			<p className="text-center text-muted-foreground py-20">
				ランキングデータがありません。
			</p>
		);
	}

	// 最新データの取得日時
	const latestTime = data[0]?.scraped_at
		? new Date(data[0].scraped_at).toLocaleString("ja-JP", {
				timeZone: "Asia/Tokyo",
				hour12: false,
		  })
		: null;

	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-2 text-center">株式ランキング</h1>
			<h2 className="text-2xl font-bold mb-6 text-center">（出来高）</h2>
			{/* 幅によって、次のラインに行くようにする */}
			<div className="flex justify-center space-x-4 mb-4 border p-4 rounded-md bg-muted flex-wrap gap-2">
				<Link href="/ranking" className="text-blue-600 hover:underline">
					人気ランキング
				</Link>
				<Link href="/ranking/search" className="text-blue-600 hover:underline">
					検索数ランキング
				</Link>
				<Link
					href="/ranking/top-market-cap"
					className="text-blue-600 hover:underline"
				>
					時価総額ランキング
				</Link>
				<Link
					href="/ranking/top-volume"
					className="text-blue-600 hover:underline"
				>
					出来高ランキング
				</Link>
				<Link
					href="/ranking/top-turnover"
					className="text-blue-600 hover:underline"
				>
					売買代金ランキング
				</Link>
				<Link
					href="/ranking/top-gainers"
					className="text-blue-600 hover:underline"
				>
					上昇ランキング
				</Link>
				<Link
					href="/ranking/top-losers"
					className="text-blue-600 hover:underline"
				>
					下落ランキング
				</Link>
			</div>
			{latestTime && (
				<p className="text-sm text-center text-muted-foreground mb-6">
					更新日時：{latestTime}
				</p>
			)}

			<div className="border rounded-md overflow-hidden shadow-sm">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-16 text-center">順位</TableHead>
							<TableHead>銘柄名</TableHead>
							<TableHead className="w-32 text-right">株価</TableHead>
							<TableHead className="w-32 text-right">変動率</TableHead>
							<TableHead className="w-32 text-center">リンク</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((stock) => (
							<TableRow key={`top-volume-${stock.rank}-${stock.symbol}`}>
								<TableCell className="text-center font-medium">
									{stock.rank}
								</TableCell>
								<TableCell>{stock.name ?? stock.symbol}</TableCell>
								<TableCell className="text-right">
									{stock.price
										? `${Number(stock.price).toLocaleString()} 円`
										: "-"}
								</TableCell>
								<TableCell
									className={`text-right ${
										stock.change_ratio?.includes("-")
											? "text-red-500"
											: "text-green-600"
									}`}
								>
									{stock.change_ratio ?? "-"}
								</TableCell>
								<TableCell className="text-center">
									<Link
										href={`/stocks/${stock.symbol}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:underline"
									>
										詳細 →
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* <p className="text-xs text-muted-foreground mt-4 text-center">
				※ 本データは最新のスクレイピング結果に基づいています。
			</p> */}
		</div>
	);
}
