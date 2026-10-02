import Link from "next/link";
import { SHOW_BOT_MONITOR, SHOW_MARKET_NEWS } from "@/lib/features";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Bot,
  ChartCandlestick,
  Radar,
} from "lucide-react";
import { PriceChart } from "@/components/workspace/price-chart";
import { getMarketOverview } from "@/lib/market/overview";
export const dynamic = "force-dynamic";
export default async function Home() {
  const market = await getMarketOverview();
  const last = market.points.at(-1);
  return (
    <div className="overview-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE MARKET, IN FOCUS</p>
          <h1>
            マーケット概要<span className="heading-dot">.</span>
          </h1>
          <p>相場を俯瞰する。チャンスを見つける。次の一手を、ここから。</p>
        </div>
        <Link href="/stocks" className="terminal-button secondary">
          銘柄を探す <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="market-meta">
        <span>
          <i />
          日本株マーケット
        </span>
        <span>
          {market.updatedAt
            ? `指数更新 ${new Date(market.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} JST`
            : "指数の更新情報はありません"}
        </span>
      </div>
      {market.unavailable && (
        <p className="data-notice" role="status">
          一部のデータを取得できませんでした。時間をおいて再読み込みしてください。
        </p>
      )}
      <section className="index-grid" aria-label="主要指数">
        {["日経225", "TOPIX", "JPX日経400"].map((name, i) => {
          const item = market.indices.find((x) => x.name === name);
          const down = item?.change?.includes("-");
          return (
            <Link href="/chart" className="index-card" key={name}>
              <div>
                <span>{name}</span>
                <span className="index-code">
                  {["NIKKEI 225", "TOKYO STOCK PRICE", "JPX-NIKKEI 400"][i]}
                </span>
              </div>
              <strong>{item?.price || "—"}</strong>
              <div className={down ? "negative" : "positive"}>
                {down ? (
                  <ArrowDownRight size={16} />
                ) : (
                  <ArrowUpRight size={16} />
                )}
                <span>
                  {item
                    ? `${item.change} (${item.percentChange})`
                    : "データ未取得"}
                </span>
                <span className="index-period">前日比</span>
              </div>
            </Link>
          );
        })}
      </section>
      <div className="overview-grid">
        <section className="terminal-panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">MARKET CHART</p>
              <h2>
                トヨタ自動車 <span className="stock-tag">7203</span>
              </h2>
            </div>
            <Link href="/stocks/7203" aria-label="トヨタ自動車の詳細">
              <ArrowUpRight size={21} />
            </Link>
          </div>
          <div className="chart-value">
            {last ? `¥${last.close.toLocaleString("ja-JP")}` : "—"}
            <span>
              {last
                ? `${new Date(last.time * 1000).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })} 終値`
                : "データ未取得"}
            </span>
          </div>
          <PriceChart points={market.points} />
        </section>
        <section className="terminal-panel focus-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">QUICK ACCESS</p>
              <h2>注目銘柄</h2>
            </div>
            <Radar size={19} />
          </div>
          <div className="focus-list">
            {market.stocks.length ? (
              market.stocks.map((stock, i) => (
                <Link href={`/stocks/${stock.code}`} key={stock.code}>
                  <span className={`stock-avatar tone-${i}`}>
                    {stock.code.slice(0, 2)}
                  </span>
                  <span>
                    <strong>{stock.name}</strong>
                    <small>
                      {stock.code} · {stock.market}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))
            ) : (
              <p className="empty-copy">銘柄データを取得できませんでした。</p>
            )}
          </div>
          <Link className="panel-link" href="/watchlist">
            マイウォッチリストを開く <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      {(SHOW_MARKET_NEWS || SHOW_BOT_MONITOR) && (
        <div
          className="overview-grid lower-grid"
          style={
            SHOW_MARKET_NEWS && SHOW_BOT_MONITOR
              ? undefined
              : { gridTemplateColumns: "1fr" }
          }
        >
          {SHOW_MARKET_NEWS && (
            <section className="terminal-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">LATEST INSIGHTS</p>
                  <h2>マーケットニュース</h2>
                </div>
                <Link href="/news" className="text-link">
                  すべて見る <ArrowRight size={14} />
                </Link>
              </div>
              <div className="news-list">
                {market.news.length ? (
                  market.news.map((item, i) => (
                    <Link href={`/news/${item.id}`} key={item.id}>
                      <span className="news-number">0{i + 1}</span>
                      <div>
                        <small>
                          {new Date(item.created_at).toLocaleDateString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                          })}{" "}
                          <span>MARKET</span>
                        </small>
                        <h3>{item.header?.title || "マーケットニュース"}</h3>
                      </div>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))
                ) : (
                  <p className="empty-copy">ニュースはまだありません。</p>
                )}
              </div>
            </section>
          )}
          {SHOW_BOT_MONITOR && (
            <section className="strategy-card">
              <div className="strategy-icon">
                <Bot size={26} />
              </div>
              <p className="eyebrow">SYSTEMATIC TRADING</p>
              <h2>
                戦略を、
                <br />
                データで確かめる。
              </h2>
              <p>
                Botの運用実績と取引履歴をチェック。
                <br />
                感覚だけに頼らない、トレードへ。
              </p>
              <Link href="/bot-trades">
                Botモニターを開く <ArrowUpRight size={18} />
              </Link>
              <ChartCandlestick className="strategy-decoration" size={140} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
