"use client";
import WatchNoteEditor, {
  type WatchNote,
} from "@/components/journal/watch-note-editor";
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
  notes = [],
}: {
  watchlist: WatchItem[];
  candlesList: Record<string, CandleRaw[]>;
  prices: Price[];
  notes?: WatchNote[];
}) {
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<WatchItem | null>(null);
  const notesByCode = new Map(notes.map((n) => [n.stock_code, n]));
  const categories = [...new Set(notes.map((n) => n.category).filter(Boolean))];
  const filtered = watchlist.filter(
    (item) =>
      !category ||
      (notesByCode.get(item.stock_code)?.category || "未分類") === category,
  );
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
    <section className="terminal-panel watchlist-panel">
      <div className="journal-filters watchlist-toolbar">
        <label>
          分類で絞り込み
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">すべて</option>
            <option value="未分類">未分類</option>
            {categories
              .filter((c) => c !== "未分類")
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <span className="watchlist-count" role="status">
          {filtered.length}銘柄
        </span>
      </div>
      {editing && (
        <WatchNoteEditor
          code={editing.stock_code}
          name={editing.stock_name}
          initial={notesByCode.get(editing.stock_code)}
          onClose={() => setEditing(null)}
        />
      )}
      {error && (
        <p className="data-notice" role="alert">
          {error}
        </p>
      )}
      {watchlist.length === 0 ? (
        <p className="empty-copy">登録した銘柄はまだありません。</p>
      ) : (
        <div className="watchlist-table-wrap">
          <table className="watchlist-table">
            <caption className="sr-only">
              登録銘柄の株価、チャートと注目メモ
            </caption>
            <colgroup>
              <col />
              <col className="watchlist-price-column" />
              <col className="watchlist-change-column" />
              <col className="watchlist-chart-column" />
              <col className="watchlist-date-column" />
              <col className="watchlist-actions-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">銘柄</th>
                <th scope="col">株価</th>
                <th scope="col">前日比</th>
                <th scope="col">チャート</th>
                <th scope="col">データ日付</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const price = byCode.get(item.stock_code);
                const change = price?.regular_market_change_percent;
                const latestTrade = candlesList[item.stock_code]?.at(-1)?.ts;
                const note = notesByCode.get(item.stock_code);
                return (
                  <tr key={item.id}>
                    <td className="watchlist-stock-cell">
                      <Link
                        className="watchlist-stock-link"
                        href={`/stocks/${item.stock_code}`}
                      >
                        <span>{item.stock_name}</span>{" "}
                        <span className="stock-tag">{item.stock_code}</span>
                      </Link>
                      <p className="watchlist-category">
                        {note?.category || "未分類"}
                      </p>
                      {note?.note && (
                        <p className="journal-watch-note">{note.note}</p>
                      )}
                      {note?.target_price != null && (
                        <small className="watchlist-target-price">
                          想定価格 ¥
                          {Number(note.target_price).toLocaleString("ja-JP")}
                        </small>
                      )}
                    </td>
                    <td
                      className="watchlist-quote tabular-nums"
                      data-label="株価"
                    >
                      {price?.regular_market_price == null
                        ? "—"
                        : `¥${price.regular_market_price.toLocaleString("ja-JP")}`}
                    </td>
                    <td
                      data-change="true"
                      data-label="前日比"
                      className={
                        change == null || change === 0
                          ? "neutral"
                          : change < 0
                            ? "negative"
                            : "positive"
                      }
                    >
                      {change == null
                        ? "—"
                        : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                    </td>
                    <td className="watchlist-chart-cell" data-label="チャート">
                      {candlesList[item.stock_code]?.length ? (
                        <Link
                          className="watchlist-chart-link"
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
                    <td className="watchlist-date-cell" data-label="データ日付">
                      {latestTrade
                        ? new Date(latestTrade * 1000).toLocaleDateString(
                            "ja-JP",
                            { timeZone: "Asia/Tokyo" },
                          )
                        : "—"}
                    </td>
                    <td className="watchlist-actions-cell">
                      <div className="watchlist-actions">
                        <button
                          className="terminal-button secondary compact watchlist-note-button"
                          type="button"
                          onClick={() => setEditing(item)}
                        >
                          メモ
                        </button>
                        <button
                          type="button"
                          className="watchlist-delete-button"
                          disabled={busy}
                          onClick={() => remove(item.stock_code)}
                          aria-label={`${item.stock_name}を削除`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="watchlist-empty">
                    この分類に該当する銘柄はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
