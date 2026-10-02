import Link from "next/link";
import { Button } from "@/components/ui/button";
import RecordList from "@/components/pages/record-list";

export const revalidate = 0;

export const metadata = {
	title: "みんなのトレード | デイトレード.net",
	description:
		"みんなのリアルなデイトレード記録をチェックできるページです。他のトレーダーの記録から学び、自分のトレードスタイルを磨きましょう。",
};

export default function TradeTimelinePage() {
	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-6 text-center">みんなのトレード</h1>
			<p className="mx-auto my-12 text-center">
				みんなのリアルなデイトレード記録をチェックしよう!
				<br />
				実際にどんな銘柄を売買しているのか、どんなタイミングで利益を出しているのかがわかります。
				<br />
				他のトレーダーの記録から学んだり、自分のトレードスタイルと比較してみるのもおすすめです。
			</p>
			<div className="mt-8 flex items-center justify-center">
				<Link href={`/dashboard/trade-records`}>
					<Button>トレードを記録する</Button>
				</Link>
			</div>
			<RecordList />
		</div>
	);
}
