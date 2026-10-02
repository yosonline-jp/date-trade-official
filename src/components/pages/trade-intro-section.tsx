import Link from "next/link";
import { Button } from "../ui/button";

// components/pages/home/trade-intro-section.tsx
export default function TradeIntroSection() {
	return (
		<section className="py-16">
			<div className="mx-auto">
				<h2 className="text-center text-3xl font-bold">
					デイトレード記録をもっと簡単に、もっと見やすく
				</h2>

				<p className="mt-6 text-center">
					デイトレード.netでは、毎日のトレードをリアルとデモで切り分けて記録できます。
					成績は自動でグラフ化され、月ごと・年間ごとにあなたの成長をひと目で確認できます。
				</p>

				<div className="mt-12 grid gap-8 md:grid-cols-3">
					{/* リアル/デモ切替 */}
					<div className="rounded-2xl bg-secondary p-6 shadow-lg">
						<h3 className="text-lg font-bold">リアル / デモを切替管理</h3>
						<p className="mt-3 text-sm">
							本番トレードと練習トレードを完全に区別して記録できます。
							実際の実力を正しく把握し、無駄な混乱を防ぎます。
						</p>
					</div>

					{/* 月次グラフ */}
					<div className="rounded-2xl bg-secondary p-6 shadow-lg">
						<h3 className="text-lg font-bold">月ごとの進捗をグラフで可視化</h3>
						<p className="mt-3 text-sm">
							1ヶ月の利益推移や勝率を自動でチャート化。
							毎日の積み重ねがどれだけ成長につながっているかがすぐにわかります。
						</p>
					</div>

					{/* 年間成績 */}
					<div className="rounded-2xl bg-secondary p-6 shadow-lg">
						<h3 className="text-lg font-bold ">年間成績もひと目で把握</h3>
						<p className="mt-3 text-sm">
							今年1年間のトレード実績をまとめて確認できます。
							利益の推移、勝敗、傾向がわかるのでトレード改善にも最適です。
						</p>
					</div>
				</div>

				{/* CTA */}
				<div className="mt-12 text-center">
					<p className="text-lg mb-6">
						あなたのトレードの軌跡が、次の成長につながります。
					</p>
					<Link href="/dashboard/trade-records">
						<Button>記録をはじめる</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
