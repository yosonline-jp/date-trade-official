import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Star,
} from "lucide-react";
import { JOURNAL_PAGE_SIZE, type JournalTab } from "@/lib/profile-journal";

type Trade = {
  id: number;
  stock_code: string;
  stock_name: string;
  buy_price: number | null;
  sell_price: number | null;
  quantity: number | null;
  profit: number | null;
  trade_date: string | null;
  memo: string | null;
  trade_type: string | null;
  entry_reason?: string;
  reflection?: string;
  tags?: string[];
  screenshot_path?: string | null;
  visibility?: string;
};
type Watch = { id: number; stock_code: string; stock_name: string };
type Props = {
  basePath: string;
  tab: JournalTab;
  page: number;
  pages: number;
  total: number;
  counts: Record<JournalTab, number>;
  records: Trade[];
  watchlist: Watch[];
  error: boolean;
};
const number = (value: number | null) =>
  value == null ? "—" : value.toLocaleString("ja-JP");
function date(value: string | null) {
  if (!value) return "取引日未設定";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "取引日未設定"
    : parsed.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
}
export function ProfileJournal({
  basePath,
  tab,
  page,
  pages,
  total,
  counts,
  records,
  watchlist,
  error,
}: Props) {
  const href = (target: number, selected: JournalTab = tab) =>
    basePath + "?tab=" + selected + "&page=" + target + "#trading-journal";
  const pageNumbers = Array.from(
    new Set(
      [1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages),
    ),
  ).sort((a, b) => a - b);
  return (
    <section className="profile-trade-section journal" id="trading-journal">
      <div className="journal-heading">
        <div>
          <p className="eyebrow">TRADING JOURNAL</p>
          <h2>トレード記録</h2>
          <p className="journal-description">
            日々の取引と、相場に向き合う記録。
          </p>
        </div>
        <span className="journal-heading-icon">
          <NotebookPen size={24} />
        </span>
      </div>
      <nav className="journal-tabs" aria-label="記録の種類">
        {(
          [
            { value: "real", label: "リアルトレード" },
            { value: "demo", label: "デモトレード" },
            { value: "favorites", label: "ウォッチリスト" },
          ] as const
        ).map((item) => (
          <Link
            key={item.value}
            href={href(1, item.value)}
            aria-current={tab === item.value ? "page" : undefined}
            className={tab === item.value ? "is-active" : ""}
          >
            {item.label}
            <span>{number(counts[item.value])}</span>
          </Link>
        ))}
      </nav>
      <div className="journal-list-heading">
        <span>{tab === "favorites" ? "WATCHLIST" : "TRADE HISTORY"}</span>
        <p>
          {error
            ? "取得エラー"
            : total
              ? number((page - 1) * JOURNAL_PAGE_SIZE + 1) +
                "–" +
                number(Math.min(page * JOURNAL_PAGE_SIZE, total)) +
                " / " +
                number(total) +
                "件"
              : "0件"}
          <span>新しい順</span>
        </p>
      </div>
      {error ? (
        <p className="journal-empty" role="alert">
          記録を取得できませんでした。時間をおいて再読み込みしてください。
        </p>
      ) : total === 0 ? (
        <div className="journal-empty">
          <NotebookPen size={28} />
          <h3>
            {tab === "favorites"
              ? "登録された銘柄はありません"
              : "トレード記録はまだありません"}
          </h3>
          <p>
            {tab === "favorites"
              ? "注目している銘柄がここに表示されます。"
              : "この種類のトレードが記録されると、ここに表示されます。"}
          </p>
        </div>
      ) : tab === "favorites" ? (
        <div className="journal-watch-grid">
          {watchlist.map((item) => (
            <Link
              key={item.id}
              href={"/stocks/" + encodeURIComponent(item.stock_code)}
              className="journal-watch-card"
            >
              <Star size={18} />
              <div>
                <small>{item.stock_code}</small>
                <h3>{item.stock_name}</h3>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="journal-grid">
          {records.map((record) => {
            const tone =
              record.profit == null || record.profit === 0
                ? "flat"
                : record.profit > 0
                  ? "gain"
                  : "loss";
            return (
              <article className={"journal-card " + tone} key={record.id}>
                <div className="journal-card-top">
                  <span>
                    <CalendarDays size={13} />
                    <time dateTime={record.trade_date || undefined}>
                      {date(record.trade_date)}
                    </time>
                  </span>
                  <span className="journal-trade-type">
                    {record.trade_type || "区分未設定"}
                  </span>
                </div>
                <Link
                  className="journal-stock"
                  href={"/stocks/" + encodeURIComponent(record.stock_code)}
                >
                  <div>
                    <span>{record.stock_code}</span>
                    <h3>{record.stock_name}</h3>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
                <div className="journal-profit">
                  <span>実現損益</span>
                  <strong>
                    {record.profit != null && record.profit > 0 ? "+" : ""}
                    {number(record.profit)}
                    <small>{record.profit == null ? "" : "円"}</small>
                  </strong>
                </div>
                <dl className="journal-details">
                  <div>
                    <dt>買値</dt>
                    <dd>
                      {number(record.buy_price)}
                      <small>円</small>
                    </dd>
                  </div>
                  <div>
                    <dt>売値</dt>
                    <dd>
                      {number(record.sell_price)}
                      <small>円</small>
                    </dd>
                  </div>
                  <div>
                    <dt>数量</dt>
                    <dd>
                      {number(record.quantity)}
                      <small>株</small>
                    </dd>
                  </div>
                </dl>
                {record.tags?.length ? <p>{record.tags.join(" / ")}</p> : null}
                {record.entry_reason && (
                  <details className="journal-memo">
                    <summary>エントリー理由</summary>
                    <p>{record.entry_reason}</p>
                  </details>
                )}
                {record.reflection && (
                  <details className="journal-memo">
                    <summary>振り返り</summary>
                    <p>{record.reflection}</p>
                  </details>
                )}
                {record.screenshot_path && (
                  <a
                    href={"/api/journal/image/" + record.id}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    チャート画像を見る
                  </a>
                )}
                {record.visibility === "private" && (
                  <small>非公開（本人のみ表示）</small>
                )}
                {record.memo && (
                  <details className="journal-memo">
                    <summary>トレードメモ</summary>
                    <p>{record.memo}</p>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!error && pages > 1 && (
        <nav
          className="journal-pagination"
          aria-label="トレード記録のページ切り替え"
        >
          <div>
            {page > 1 ? (
              <Link href={href(page - 1)} aria-label="前のページ">
                <ChevronLeft size={16} />
                前へ
              </Link>
            ) : (
              <span className="is-disabled">
                <ChevronLeft size={16} />
                前へ
              </span>
            )}
          </div>
          <div className="journal-page-numbers">
            {pageNumbers.map((n, i) => (
              <span key={n}>
                {i > 0 && n - pageNumbers[i - 1] > 1 && (
                  <span className="journal-ellipsis">…</span>
                )}
                <Link
                  href={href(n)}
                  aria-label={n + "ページ目"}
                  aria-current={page === n ? "page" : undefined}
                >
                  {n}
                </Link>
              </span>
            ))}
          </div>
          <div>
            {page < pages ? (
              <Link href={href(page + 1)} aria-label="次のページ">
                次へ
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span className="is-disabled">
                次へ
                <ChevronRight size={16} />
              </span>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
