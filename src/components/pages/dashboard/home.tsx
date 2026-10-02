import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import DashboardTradeSummary from "./trade/trade-summary";
import { notFound } from "next/navigation";

type MainDataItem = {
	name: string;
	price: string;
	change: string;
	percentChange: string;
};

export default async function DashboardPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		notFound();
	}

	const { data: main, error } = await supabase
		.from("useful_data")
		.select("*")
		.eq("id", 1)
		.single();

	if (error || !main) {
		throw new Error("市場データの取得に失敗しました");
	}

	const { data } = main;

	const nikkei: MainDataItem | undefined = data.find(
		(item: MainDataItem) => item.name === "日経225"
	);
	const nikkei400: MainDataItem | undefined = data.find(
		(item: MainDataItem) => item.name === "JPX日経400"
	);
	const topix: MainDataItem | undefined = data.find(
		(item: MainDataItem) => item.name === "TOPIX"
	);

	const last_updated = main.updated_at
		? new Date(main.updated_at).toLocaleString("ja-JP", {
				timeZone: "Asia/Tokyo",
				hour12: false,
		  })
		: null;

	return (
		<div className="max-w-6xl mx-auto">
			{/* 市場情報 */}
			<div className="grid md:grid-cols-2 gap-6 mb-10">
				<Card>
					<CardHeader>
						<CardTitle>📊 今日の日本市場</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3 text-lg">
							{nikkei && (
								<div>
									<strong>日経平均：</strong> {nikkei.price.toLocaleString()}円{" "}
									<span
										className={
											nikkei.change.startsWith("+")
												? "text-green-500"
												: "text-red-500"
										}
									>
										{nikkei.change}
									</span>
									<span
										className={`ml-4 text-sm ${
											nikkei.change.includes("+")
												? "text-green-500"
												: "text-red-500"
										}`}
									>
										{nikkei.percentChange}
									</span>
								</div>
							)}

							{nikkei400 && (
								<div>
									<strong>JPX日経400：</strong>{" "}
									{nikkei400.price.toLocaleString()}円{" "}
									<span
										className={
											nikkei400.change.startsWith("+")
												? "text-green-500"
												: "text-red-500"
										}
									>
										{nikkei400.change}
									</span>
									<span
										className={`ml-4 text-sm ${
											nikkei400.change.includes("+")
												? "text-green-500"
												: "text-red-500"
										}`}
									>
										{nikkei400.percentChange}
									</span>
								</div>
							)}

							{topix && (
								<div>
									<strong>TOPIX：</strong> {topix.price.toLocaleString()}円{" "}
									<span
										className={
											topix.change.startsWith("+")
												? "text-green-500"
												: "text-red-500"
										}
									>
										{topix.change}
									</span>
									<span
										className={`ml-4 text-sm ${
											topix.change.includes("+")
												? "text-green-500"
												: "text-red-500"
										}`}
									>
										{topix.percentChange}
									</span>
								</div>
							)}
						</div>
						{last_updated && (
							<p className="text-sm text-muted-foreground mt-4">
								最終更新日時：{last_updated}
							</p>
						)}
					</CardContent>
				</Card>

				<DashboardTradeSummary userId={user.id} />
			</div>

			{/* 学習リンク */}
			<div className="grid md:grid-cols-3 gap-6 mb-10">
				<Card className="hover:shadow-lg transition">
					<CardHeader>
						<CardTitle>📘 デイトレード基礎</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-3">
							初心者のための基礎知識を学びましょう。
						</p>
						<Link href="/dashboard/learn/basics">
							<Button variant="outline" className="w-full">
								学ぶ
							</Button>
						</Link>
					</CardContent>
				</Card>

				<Card className="hover:shadow-lg transition">
					<CardHeader>
						<CardTitle>⚡ トレード戦略</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-3">
							スキャルピングや順張りなど実践的な戦略を紹介。
						</p>
						<Link href="/dashboard/learn/strategies">
							<Button variant="outline" className="w-full">
								学ぶ
							</Button>
						</Link>
					</CardContent>
				</Card>

				<Card className="hover:shadow-lg transition">
					<CardHeader>
						<CardTitle>🧠 メンタル管理</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground mb-3">
							デイトレに欠かせない心理面を鍛えよう。
						</p>
						<Link href="/dashboard/learn/psychology">
							<Button variant="outline" className="w-full">
								学ぶ
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>

			{/* 株一覧へのリンク */}
			<div className="text-center">
				<Link href="/dashboard/stocks">
					<Button size="lg" className="px-10">
						📈 日本株一覧を見る
					</Button>
				</Link>
			</div>
		</div>
	);
}
