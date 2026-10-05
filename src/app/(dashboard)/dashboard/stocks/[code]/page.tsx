import { getStockDetail } from "@/lib/market/stock-detail";
import WatchlistButton from "@/components/watchlist-btn";
import Link from "next/link";
import BackBtn from "@/components/back-btn";
import CandleChart, { CandleRaw } from "@/components/stock-candle-chart";
import VolumeChart, { VolumeChartData } from "@/components/volume-chart";
import { CommentForm, CommentList } from "@/components/pages/stock-comments";
import StockCloseAnalysisPanel from "@/components/stock-close-analysis";
import StockTechnicalPanel from "@/components/stock-technical-panel";

type StockPageParams = {
	// Match Next's generated PageProps where `params` is a Promise-wrapped SegmentParams
	params?: Promise<Record<string, string | string[] | undefined>>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	searchParams?: Promise<any>;
};

export default async function StockDetailPage({ params }: StockPageParams) {
	// `params` may be a Promise in Next's generated types; awaiting is safe for both Promise and plain object
	const resolvedParams = (await params) as Record<string, string>;
	const { code } = resolvedParams;
	const { user, stock, stockError, price, priceError, chartData, chartError } =
		await getStockDetail(code);

	if (stockError || priceError || !stock || !price) {
		return (
			<p className="text-center text-red-500">銘柄情報が見つかりません。</p>
		);
	}

	const comments = stock.comments || [];
	let candles: CandleRaw[] = [];
	const volumesData: VolumeChartData = { timestamps: [], volumes: [] };
	if (!chartError && chartData) {
		const timestamps = chartData.data.timestamp;
		const indicators = chartData.data.indicators;
		candles = timestamps.map((ts: number, i: number) => ({
			ts,
			open: indicators.quote[0].open[i],
			high: indicators.quote[0].high[i],
			low: indicators.quote[0].low[i],
			close: indicators.quote[0].close[i],
		}));
		// null チェックを追加
		candles = candles.filter(
			(candle) =>
				candle.open !== null &&
				candle.high !== null &&
				candle.low !== null &&
				candle.close !== null
		);

		timestamps.map((ts: number, i: number) => {
			if (indicators.quote[0].volume[i] !== null) {
				volumesData.timestamps.push(ts);
				volumesData.volumes.push(indicators.quote[0].volume[i]);
			}
		});
	}

	return (
		<div className="max-w-5xl mx-auto py-10 overflow-hidden">
			<h1 className="text-4xl font-bold mb-6 text-center">{stock.name}</h1>
			<BackBtn />
			<div className="text-muted-foreground my-6 flex flex-col lg:flex-row space-between items-center justify-between">
				<p>
					銘柄コード：{stock.code}　／　市場：{stock.market}
				</p>
				<div className="mt-4 lg:mt-0">
					<WatchlistButton stockCode={stock.code} stockName={stock.name} />
				</div>
			</div>

			{/* 💹 株価情報 */}
			{price ? (
				<div className="grid md:grid-cols-2 gap-6 border rounded-lg p-6 bg-muted/30 mb-8">
					<div>
						<h2 className="font-semibold mb-3 text-lg">株価情報</h2>
						<dl className="grid grid-cols-2 gap-y-2 text-sm">
							<dt>現在値</dt>
							<dd>{price.regular_market_price?.toLocaleString()} 円</dd>
							<dt>前日終値</dt>
							<dd>
								{price.regular_market_previous_close?.toLocaleString()} 円
							</dd>
							<dt>始値</dt>
							<dd>{price.regular_market_open?.toLocaleString()} 円</dd>
							<dt>高値</dt>
							<dd>{price.regular_market_high?.toLocaleString()} 円</dd>
							<dt>安値</dt>
							<dd>{price.regular_market_low?.toLocaleString()} 円</dd>
							<dt>出来高</dt>
							<dd>{price.regular_market_volume?.toLocaleString()} 株</dd>
						</dl>
					</div>

					<div>
						<h2 className="font-semibold mb-3 text-lg">指標・統計</h2>
						<dl className="grid grid-cols-2 gap-y-2 text-sm">
							<dt>変化率</dt>
							<dd>
								{price.regular_market_change_percent
									? `${price.regular_market_change_percent.toFixed(2)}%`
									: "-"}
							</dd>
							<dt>PER</dt>
							<dd>{price.trailing_pe?.toFixed(2) ?? "-"} 倍</dd>
							<dt>PBR</dt>
							<dd>{price.price_to_book?.toFixed(2) ?? "-"} 倍</dd>
							<dt>配当利回り</dt>
							<dd>
								{price.dividend_yield
									? `${price.dividend_yield.toFixed(2)}%`
									: "-"}
							</dd>
							<dt>時価総額</dt>
							<dd>
								{price.market_cap
									? `${(price.market_cap / 1_000_000_000).toFixed(2)} 億円`
									: "-"}
							</dd>
						</dl>
					</div>
				</div>
			) : (
				<p className="text-muted-foreground">
					株価データがまだ登録されていません。
				</p>
			)}

			<Link className="terminal-button secondary mb-5" href={`/stock-analysis?code=${stock.code}`}>マルチタイムフレーム分析</Link>
			<StockCloseAnalysisPanel key={stock.code} stockCode={stock.code} />
			{/* 📈 チャート */}
			{candles.length > 0 ? (
				<CandleChart data={candles} />
			) : (
				<div className="py-4 flex items-center justify-center bg-muted/30 rounded-lg border">
					<p>チャートデータがありません。</p>
				</div>
			)}

			{volumesData.timestamps.length > 0 ? (
				<VolumeChart VolumeData={volumesData} />
			) : (
				<div className="py-4 flex items-center justify-center bg-muted/30 rounded-lg border">
					<p>出来高データがありません。</p>
				</div>
			)}

			<StockTechnicalPanel key={`technicals-${stock.code}`} stockCode={stock.code} dailyCandles={candles} dailyVolumes={volumesData} />
			{/* 出来高チャート */}

			{/* 最終更新日  */}
			{price && price.updated_at && (
				<p className="text-xs text-muted-foreground mt-4 text-center">
					最終更新日:{" "}
					{new Date(price.updated_at).toLocaleDateString("ja-JP", {
						timeZone: "Asia/Tokyo",
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</p>
			)}

			{/* 🔗 外部リンク */}
			<div className="flex flex-wrap gap-3 mt-8">
				<Link
					href={`https://minkabu.jp/stock/${stock.code}`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-600 underline text-sm"
				>
					ミンカブ →
				</Link>
				<Link
					href={`https://finance.yahoo.co.jp/quote/${stock.code}.T`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-600 underline text-sm"
				>
					Yahoo!ファイナンス →
				</Link>
				<Link
					href={`https://www.google.com/finance/quote/${stock.code}:TYO`}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-600 underline text-sm"
				>
					Googleファイナンス →
				</Link>
			</div>
			<CommentForm stockCode={stock.code} />
			<CommentList comments={comments} user={user?.user} />
		</div>
	);
}
