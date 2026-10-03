import { getStockDetail } from "@/lib/market/stock-detail";
import WatchlistButton from "@/components/watchlist-btn";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, TrendingUp, TrendingDown, BarChart3, MessageSquare, Clock3 } from "lucide-react";
import CandleChart, { CandleRaw } from "@/components/stock-candle-chart";
import VolumeChart, { VolumeChartData } from "@/components/volume-chart";
import { CommentForm, CommentList } from "@/components/pages/stock-comments";
import StockCloseAnalysisPanel from "@/components/stock-close-analysis";

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

  const number = (value: number | null | undefined, digits?: number) =>
    value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits ?? 2, ...(digits != null ? { minimumFractionDigits: digits } : {}) });
  const change = price.regular_market_change_percent;
  const amount = price.regular_market_price != null && price.regular_market_previous_close != null ? price.regular_market_price - price.regular_market_previous_close : null;
  const direction = change == null || change === 0 ? "neutral" : change > 0 ? "positive" : "negative";
  const stats = [
    ["前日終値", number(price.regular_market_previous_close), "円"],
    ["始値", number(price.regular_market_open), "円"],
    ["高値", number(price.regular_market_high), "円"],
    ["安値", number(price.regular_market_low), "円"],
  ];
  const metrics = [
    ["PER", number(price.trailing_pe, 2), "倍"],
    ["PBR", number(price.price_to_book, 2), "倍"],
    ["配当利回り", number(price.dividend_yield, 2), "%"],
    ["時価総額", price.market_cap == null ? "—" : number(price.market_cap / 100_000_000, 2), "億円"],
    ["出来高", number(price.regular_market_volume), "株"],
  ];
  return (
    <div className="stock-detail">
      <Link href="/stocks" className="stock-back"><ArrowLeft size={15} />銘柄一覧に戻る</Link>
      <header className="stock-detail-heading">
        <div><p className="eyebrow">EQUITY OVERVIEW</p>
          <div className="stock-identity"><span className="stock-code">{stock.code}</span><span className="stock-market">{stock.market || "市場未登録"}</span></div>
          <h1>{stock.name}<span className="heading-dot">.</span></h1>
        </div>
        <div className="stock-heading-actions"><WatchlistButton stockCode={stock.code} stockName={stock.name} /></div>
      </header>
      <section className="stock-quote-panel" aria-label="株価情報">
        <div className="stock-main-quote">
          <p className="stock-section-label">現在値 <span>JPY</span></p>
          <div className="stock-price"><span className="stock-currency">¥</span>{number(price.regular_market_price)}</div>
          <div className={"stock-change " + direction}>
            {change != null && (change < 0 ? <TrendingDown size={17} /> : <TrendingUp size={17} />)}
            <strong>{amount != null && amount > 0 ? "+" : ""}{number(amount)} 円</strong>
            <span>({change != null && change > 0 ? "+" : ""}{number(change, 2)}%)</span><small>前日比</small>
          </div>
          {price.updated_at && <p className="stock-updated"><Clock3 size={12} />更新 {new Date(price.updated_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>}
        </div>
        <dl className="stock-quote-stats">{stats.map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{value}<small>{value !== "—" && unit}</small></dd></div>)}</dl>
      </section>
      <StockCloseAnalysisPanel key={stock.code} stockCode={stock.code} />
      <div className="stock-detail-grid">
        <div className="stock-chart-column">
          <div className="stock-section-heading"><h2><BarChart3 size={18} />株価チャート</h2><span>日足 / JPY</span></div>
          {candles.length > 0 ? <CandleChart data={candles} /> : <div className="terminal-panel stock-empty">チャートデータがありません。</div>}
          <div className="stock-section-heading stock-volume-heading"><h2>出来高</h2><span>株</span></div>
          {volumesData.timestamps.length > 0 ? <VolumeChart VolumeData={volumesData} height={190} /> : <div className="terminal-panel stock-empty">出来高データがありません。</div>}
        </div>
        <aside className="stock-sidebar">
          <section className="terminal-panel stock-metrics"><p className="eyebrow">FUNDAMENTALS</p><h2>指標・統計</h2><dl>{metrics.map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{value}<small>{value !== "—" && unit}</small></dd></div>)}</dl></section>
          <Link className="stock-trades-link" href={`/stocks/${stock.code}/trades`}><BarChart3 size={23} /><span><strong>トレード記録</strong><small>この銘柄の取引を振り返る</small></span><ArrowUpRight size={19} /></Link>
          <section className="terminal-panel stock-external"><p className="eyebrow">RESEARCH</p><h2>銘柄をもっと調べる</h2>{[["ミンカブ", `https://minkabu.jp/stock/${stock.code}`], ["Yahoo!ファイナンス", `https://finance.yahoo.co.jp/quote/${stock.code}.T`], ["Googleファイナンス", `https://www.google.com/finance/quote/${stock.code}:TYO`]].map(([label, href]) => <Link key={label} href={href} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={15} /></Link>)}</section>
        </aside>
      </div>
      <section className="terminal-panel stock-discussion"><div className="stock-section-heading"><h2><MessageSquare size={18} />銘柄コメント</h2><span>{comments.length} 件</span></div><CommentForm stockCode={stock.code} /><CommentList comments={comments} user={user?.user} /></section>
    </div>
  );
}
