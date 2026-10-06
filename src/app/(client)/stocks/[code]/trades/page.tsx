import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Clock3,
  MessageSquare,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ensureFreshStock } from "@/lib/market/refresh";
import WatchlistButton from "@/components/watchlist-btn";
import StockDetailChart from "@/components/stock-detail-chart";
import type { CandleRaw } from "@/components/stock-candle-chart";
import type { VolumeChartData } from "@/components/volume-chart";
import { TradeRecordsTab } from "@/components/pages/dashboard/trade/stock-trade-tab";
import styles from "./page.module.css";

type StockPageParams = { params: Promise<{ code: string }> };
type SavedChart = {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

function numeric(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function number(value: unknown, digits?: number) {
  const parsed = numeric(value);
  return parsed === null
    ? "—"
    : parsed.toLocaleString("ja-JP", {
        maximumFractionDigits: digits ?? 2,
        ...(digits !== undefined ? { minimumFractionDigits: digits } : {}),
      });
}

function signed(value: number | null, digits?: number) {
  return (value !== null && value > 0 ? "+" : "") + number(value, digits);
}

export default async function StockTradeReviewPage({
  params,
}: StockPageParams) {
  const { code } = await params;
  const supabase = await createClient();
  await ensureFreshStock(code).catch(() => undefined);

  // The viewer's session keeps public/private record visibility governed by RLS.
  const { data: stock, error: stockError } = await supabase
    .from("stocks")
    .select(
      "*, trades: trade_records(*, users(id, account, nickname, avatar)), watchlist(users(id, account, nickname, avatar))",
    )
    .eq("code", code)
    .single();
  const { data: price, error: priceError } = await supabase
    .from("daily_prices")
    .select("*")
    .eq("code", code)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  const { data: chartData, error: chartError } = await supabase
    .from("stock_charts")
    .select("*")
    .eq("code", code)
    .order("id", { ascending: true })
    .single();

  if (stockError || !stock) {
    return (
      <div className={styles.page}>
        <Link href="/stocks" className={styles.back}>
          <ArrowLeft size={15} />
          銘柄一覧へ戻る
        </Link>
        <div className={styles.empty}>
          <BookOpen size={28} />
          <h1>銘柄情報が見つかりません</h1>
          <p>銘柄コードを確認して、もう一度お試しください。</p>
        </div>
      </div>
    );
  }

  const records = stock.trades || [];
  const watchlist = stock.watchlist || [];
  const candles: CandleRaw[] = [];
  const volumes: VolumeChartData = { timestamps: [], volumes: [] };
  const savedChart =
    !chartError && chartData ? (chartData.data as SavedChart | null) : null;
  const timestamps = savedChart?.timestamp;
  const quote = savedChart?.indicators?.quote?.[0];
  if (Array.isArray(timestamps) && quote) {
    timestamps.forEach((ts, index) => {
      const prices = [
        quote.open?.[index],
        quote.high?.[index],
        quote.low?.[index],
        quote.close?.[index],
      ];
      if (
        Number.isFinite(ts) &&
        prices.every(
          (value) => typeof value === "number" && Number.isFinite(value),
        )
      ) {
        candles.push({
          ts,
          open: prices[0]!,
          high: prices[1]!,
          low: prices[2]!,
          close: prices[3]!,
        });
      }
      const volume = quote.volume?.[index];
      if (
        Number.isFinite(ts) &&
        typeof volume === "number" &&
        Number.isFinite(volume) &&
        volume >= 0
      ) {
        volumes.timestamps.push(ts);
        volumes.volumes.push(volume);
      }
    });
  }

  const current = numeric(price?.regular_market_price);
  const previous = numeric(price?.regular_market_previous_close);
  const amount =
    current !== null && previous !== null ? current - previous : null;
  const change = numeric(price?.regular_market_change_percent);
  const directionValue = amount ?? change;
  const direction =
    directionValue === null || directionValue === 0
      ? ""
      : directionValue > 0
        ? "positive"
        : "negative";
  const updated = price?.updated_at ? new Date(price.updated_at) : null;
  const marketCap = numeric(price?.market_cap);
  const stats = [
    ["前日終値", number(previous)],
    ["始値", number(price?.regular_market_open)],
    ["高値", number(price?.regular_market_high)],
    ["安値", number(price?.regular_market_low)],
  ];
  const metrics = [
    ["PER", number(price?.trailing_pe, 2), "倍"],
    ["PBR", number(price?.price_to_book, 2), "倍"],
    ["配当利回り", number(price?.dividend_yield, 2), "%"],
    [
      "時価総額",
      number(marketCap === null ? null : marketCap / 100_000_000, 2),
      "億円",
    ],
    ["出来高", number(price?.regular_market_volume, 0), "株"],
  ];
  const detailHref = "/stocks/" + stock.code;

  return (
    <div className={styles.page}>
      <Link href={detailHref} className={styles.back}>
        <ArrowLeft size={15} />
        銘柄詳細へ戻る
      </Link>
      <header className={styles.heading}>
        <div className={styles.identity}>
          <p className="eyebrow">TRADE REVIEW</p>
          <div className={styles.badges}>
            <span className={styles.code}>{stock.code}</span>
            <span>{stock.market || "市場未登録"}</span>
          </div>
          <h1>
            {stock.name}
            <span className="heading-dot">.</span>
          </h1>
          <p className={styles.subtitle}>
            取引とメモから、判断と結果を振り返る。
          </p>
        </div>
        <div className={styles.actions}>
          <WatchlistButton stockCode={stock.code} stockName={stock.name} />
          <Link
            href={"/chart?code=" + stock.code}
            className="terminal-button secondary"
          >
            チャートを開く
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>

      <section className={styles.quotePanel} aria-label="株価情報">
        <div className={styles.mainQuote}>
          <p className={styles.label}>
            現在値<span>JPY</span>
          </p>
          <div className={styles.price}>
            <small>¥</small>
            {number(current)}
          </div>
          <div className={styles.change + " " + direction}>
            {directionValue !== null &&
              (directionValue < 0 ? (
                <TrendingDown size={16} />
              ) : (
                <TrendingUp size={16} />
              ))}
            <strong>
              {signed(amount)}
              {amount !== null && " 円"}
            </strong>
            {change !== null && <span>({signed(change, 2)}%)</span>}
            <small>前日比</small>
          </div>
          {updated && Number.isFinite(updated.getTime()) && (
            <p className={styles.updated}>
              <Clock3 size={12} />
              更新{" "}
              {updated.toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              JST
            </p>
          )}
          {(priceError || !price) && (
            <p className={styles.updated}>
              株価データはまだ登録されていません。
            </p>
          )}
        </div>
        <dl className={styles.quoteStats}>
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value}
                {value !== "—" && <small>円</small>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        className={styles.journal}
        aria-labelledby="trade-review-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">TRADE JOURNAL</p>
            <h2 id="trade-review-heading">
              <BookOpen size={21} />
              取引を振り返る
            </h2>
          </div>
          <p>この銘柄の閲覧できる記録を、リアル・デモ別に表示します。</p>
        </div>
        <TradeRecordsTab
          key={stock.code}
          stockCode={stock.code}
          initialRecords={records}
          watchlist={watchlist}
        />
      </section>

      <div className={styles.contextGrid}>
        <section
          className={styles.chartColumn}
          aria-labelledby="review-chart-heading"
        >
          <div className={styles.chartHeading}>
            <h2 id="review-chart-heading">
              <BarChart3 size={19} />
              株価の流れ
            </h2>
            <span>日足 / JPY</span>
          </div>
          {candles.length > 0 ? (
            <StockDetailChart
              key={stock.code}
              candles={candles}
              volumes={volumes}
            />
          ) : (
            <div className={styles.empty}>
              <BarChart3 size={28} />
              <h3>チャートデータがありません</h3>
              <p>データが取得されると、株価の推移を確認できます。</p>
            </div>
          )}
        </section>
        <aside className={styles.sidebar} aria-label="銘柄情報と関連リンク">
          <section className={styles.panel}>
            <p className="eyebrow">MARKET SNAPSHOT</p>
            <h2>指標・統計</h2>
            <dl className={styles.metrics}>
              {metrics.map(([label, value, unit]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {value}
                    {value !== "—" && <small>{unit}</small>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <div className={styles.quickLinks}>
            <Link href={detailHref + "#stock-comments"}>
              <MessageSquare size={20} />
              <span>
                <strong>銘柄コメント</strong>
                <small>みんなの視点をチェック</small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
            <Link href={"/stock-analysis?code=" + stock.code}>
              <BarChart3 size={20} />
              <span>
                <strong>デイトレード分析</strong>
                <small>複数の時間足から確認</small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <section className={styles.panel}>
            <p className="eyebrow">RESEARCH</p>
            <h2>銘柄をもっと調べる</h2>
            <div className={styles.externalLinks}>
              {[
                ["ミンカブ", "https://minkabu.jp/stock/" + stock.code],
                [
                  "Yahoo!ファイナンス",
                  "https://finance.yahoo.co.jp/quote/" + stock.code + ".T",
                ],
                [
                  "Googleファイナンス",
                  "https://www.google.com/finance/quote/" + stock.code + ":TYO",
                ],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
