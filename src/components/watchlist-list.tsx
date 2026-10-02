"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import MiniCandleChart, { type CandleRaw } from "./mini-candle-chart";
import { removeFromWatchlist } from "@/app/actions/watchlist";

type WatchItem = {
  id: number;
  stock_code: string;
  stock_name: string;
  created_at: string;
};
type Price = {
  code: string;
  regular_market_price: number | null;
  regular_market_change_percent: number | null;
  updated_at: string;
};

export default function WatchlistTable({
  watchlist,
  candlesList,
  prices,
}: {
  watchlist: WatchItem[];
  candlesList: Record<string, CandleRaw[]>;
  prices: Price[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const byCode = new Map(prices.map((price) => [price.code, price]));
  function remove(code: string) {
    setError("");
    startTransition(async () => {
      try {
        await removeFromWatchlist(code);
        router.refresh();
      } catch {
        setError("削除できませんでした。再度お試しください。");
      }
    });
  }
  return (
    <section className="terminal-panel">
      {error && (
        <p className="data-notice" role="alert">
          {error}
        </p>
      )}
      {watchlist.length === 0 ? (
        <p className="empty-copy">登録した銘柄はまだありません。</p>
      ) : (
        <div className="cms-table-wrap">
          <table className="cms-table watchlist-table">
            <thead>
              <tr>
                <th>銘柄</th>
                <th>株価</th>
                <th>前日比</th>
                <th>チャート</th>
                <th>データ日付</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => {
                const price = byCode.get(item.stock_code);
                const change = price?.regular_market_change_percent;
                const latestTrade = candlesList[item.stock_code]?.at(-1)?.ts;
                return (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/stocks/${item.stock_code}`}>
                        {item.stock_name}{" "}
                        <span className="stock-tag">{item.stock_code}</span>
                      </Link>
                    </td>
                    <td className="tabular-nums">
                      {price?.regular_market_price == null
                        ? "—"
                        : `¥${price.regular_market_price.toLocaleString("ja-JP")}`}
                    </td>
                    <td
                      data-change="true"
                      className={
                        change != null && change < 0 ? "negative" : "positive"
                      }
                    >
                      {change == null
                        ? "—"
                        : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                    </td>
                    <td>
                      {candlesList[item.stock_code]?.length ? (
                        <Link
                          href={`/chart?code=${item.stock_code}`}
                          aria-label={`${item.stock_name}の詳細チャート`}
                        >
                          <MiniCandleChart
                            data={candlesList[item.stock_code]}
                            width={176}
                            height={76}
                          />
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {latestTrade
                        ? new Date(latestTrade * 1000).toLocaleDateString(
                            "ja-JP",
                            { timeZone: "Asia/Tokyo" },
                          )
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(item.stock_code)}
                        aria-label={`${item.stock_name}を削除`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
