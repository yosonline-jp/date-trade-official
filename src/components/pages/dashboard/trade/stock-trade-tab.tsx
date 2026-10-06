"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CirclePercent,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LockKeyhole,
  MessageSquareText,
  NotebookPen,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPagination } from "@/lib/pagination";
import type {
  PersonalTradeSummary,
  TradeSummaryMetrics,
} from "@/lib/stock-trade-summary";
import styles from "./stock-trade-tab.module.css";

type NumberValue = number | string | null;
export type TradeAuthor = {
  id: string;
  account: string | null;
  nickname: string | null;
  avatar: string | null;
};
export type TradeRecord = {
  id: number;
  stock_code: string;
  stock_name: string;
  buy_price: NumberValue;
  sell_price: NumberValue;
  quantity: NumberValue;
  profit: NumberValue;
  trade_date: string | null;
  memo: string | null;
  trade_type: string | null;
  type: "real" | "demo";
  created_at: string | null;
  visibility?: "public" | "private";
  users?: TradeAuthor | null;
};
export type WatchItem = {
  id?: number;
  users: TradeAuthor | null;
};
type TradeTab = "real" | "demo" | "favorites";

const PAGE_SIZE = 6;

const numberFormat = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function numeric(value: unknown) {
  if (
    value == null ||
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  )
    return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
function number(value: unknown) {
  const parsed = numeric(value);
  return parsed == null ? "—" : numberFormat.format(parsed);
}
function profit(value: unknown) {
  const parsed = numeric(value);
  return parsed == null
    ? "—"
    : (parsed > 0 ? "+" : parsed < 0 ? "−" : "") +
        "¥" +
        numberFormat.format(Math.abs(parsed));
}
function tone(value: unknown) {
  const parsed = numeric(value);
  return parsed == null || parsed === 0
    ? styles.neutral
    : parsed > 0
      ? styles.positive
      : styles.negative;
}
function date(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : dateFormat.format(parsed);
}
function profileHref(author: TradeAuthor | null | undefined) {
  const account = author?.account?.trim() || author?.id?.trim();
  return account ? "/traders/" + encodeURIComponent(account) : null;
}
function Author({ author }: { author: TradeAuthor | null | undefined }) {
  const name = author
    ? author.nickname?.trim() || "ノーネーム"
    : "トレーダー情報未登録";
  const href = profileHref(author);
  const content = (
    <>
      <Avatar className={styles.avatar}>
        <AvatarImage src={author?.avatar || undefined} alt="" />
        <AvatarFallback className={styles.avatarFallback}>
          {author ? Array.from(name)[0] : <Users size={17} />}
        </AvatarFallback>
      </Avatar>
      <span className={styles.authorText}>
        <strong>{name}</strong>
        <small>{href ? "トレーダー" : "プロフィール情報なし"}</small>
      </span>
    </>
  );
  return href ? (
    <Link className={styles.author} href={href}>
      {content}
      <ArrowUpRight size={14} className={styles.authorArrow} />
    </Link>
  ) : (
    <div className={styles.author}>{content}</div>
  );
}
function EmptyState({
  watchlist = false,
  stockCode,
}: {
  watchlist?: boolean;
  stockCode?: string;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        {watchlist ? <Star size={26} /> : <NotebookPen size={26} />}
      </span>
      <h3>
        {watchlist
          ? "ウォッチ中のトレーダーはまだいません"
          : "公開トレードはまだありません"}
      </h3>
      <p>
        {watchlist
          ? "この銘柄をウォッチリストに登録したトレーダーがここに表示されます。"
          : "この種類の公開トレードが追加されると、損益やトレードメモをここで確認できます。"}
      </p>
      {stockCode && (
        <Link
          className={styles.emptyLink}
          href={"/stocks/" + encodeURIComponent(stockCode)}
        >
          銘柄詳細を見る <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}

function TradeSummary({ summary }: { summary: TradeSummaryMetrics }) {
  const stats = [
    {
      label: "記録数",
      value: number(summary.recordCount),
      unit: "件",
      icon: NotebookPen,
    },
    {
      label: "合計損益",
      value: profit(summary.totalProfit),
      unit: "",
      icon: Wallet,
      tone: tone(summary.totalProfit),
    },
    {
      label: "勝率",
      value: number(summary.winRate),
      unit: summary.winRate !== null ? "%" : "",
      icon: CirclePercent,
    },
    {
      label: "平均損益",
      value: profit(summary.averageProfit),
      unit: "",
      icon: BarChart3,
      tone: tone(summary.averageProfit),
    },
  ];
  return (
    <>
      <div className={styles.personalHeading}>
        <h3>
          <LockKeyhole size={14} aria-hidden="true" />
          あなたのトレード成績
        </h3>
        <span>本人のみ</span>
      </div>
      <div className={styles.summary} aria-label="あなたのトレード成績">
        {stats.map((item) => (
          <div key={item.label} className={styles.stat}>
            <span className={styles.statLabel}>
              <item.icon size={14} />
              {item.label}
            </span>
            <strong className={item.tone || styles.neutral}>
              {item.value}
              <small>{item.unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <p className={styles.summaryNote}>
        この銘柄のあなたの全トレード（公開・非公開）を集計しています。履歴のページを切り替えても集計は変わりません。
        {summary.missingProfitCount > 0 && (
          <span>
            損益未登録の {summary.missingProfitCount}{" "}
            件は、損益・勝率の集計から除外しています。
          </span>
        )}
      </p>
    </>
  );
}

function TradeCard({ record }: { record: TradeRecord }) {
  const tradeDate = date(record.trade_date);
  const postedDate = date(record.created_at);
  const short = record.trade_type === "売建";
  const fields = [
    [short ? "建値・売建" : "建値・買付", record.buy_price, "円"],
    [short ? "決済値・買返済" : "決済値・売却", record.sell_price, "円"],
    ["数量", record.quantity, "株"],
  ] as const;
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.tradeDate}>
          <CalendarDays size={14} />
          {tradeDate ? (
            <time dateTime={record.trade_date || undefined}>{tradeDate}</time>
          ) : (
            "取引日未設定"
          )}
        </span>
        <div className={styles.badges}>
          {record.visibility === "private" && (
            <span className={styles.privateBadge}>
              <LockKeyhole size={11} />
              本人のみ
            </span>
          )}
          <span className={short ? styles.shortBadge : styles.typeBadge}>
            {record.trade_type || "区分未設定"}
          </span>
        </div>
      </div>
      <div className={styles.cardMain}>
        <Author author={record.users} />
        <div className={styles.profit}>
          <span>実現損益</span>
          <strong className={tone(record.profit)}>
            {profit(record.profit)}
          </strong>
        </div>
      </div>
      <dl className={styles.details}>
        {fields.map(([label, value, unit]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {number(value)}
              <small>{numeric(value) != null ? unit : ""}</small>
            </dd>
          </div>
        ))}
      </dl>
      {record.memo && (
        <div className={styles.memo}>
          <span>
            <MessageSquareText size={13} />
            トレードメモ
          </span>
          <p>{record.memo}</p>
        </div>
      )}
      <div className={styles.cardFoot}>
        <Link href={"/stocks/" + encodeURIComponent(record.stock_code)}>
          <span>
            {record.stock_name || record.stock_code}
            <small>{record.stock_code}</small>
          </span>
          <ArrowUpRight size={13} />
        </Link>
        {postedDate && <small>記録日 {postedDate}</small>}
      </div>
    </article>
  );
}

function RecordPagination({
  pagination,
  label,
  onPageChange,
}: {
  pagination: ReturnType<typeof getPagination>;
  label: string;
  onPageChange: (page: number) => void;
}) {
  if (pagination.pageCount <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label={label + "のページ切り替え"}>
      <p className={styles.pageStatus} aria-live="polite" aria-atomic="true">
        <strong>{number(pagination.page)}</strong> /{" "}
        {number(pagination.pageCount)} ページ
      </p>
      <div className={styles.pageControls}>
        <button
          type="button"
          className={styles.pageDirection}
          aria-label="前のページ"
          disabled={pagination.page === 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>前へ</span>
        </button>
        {pagination.pages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              className={styles.pageEllipsis}
              key={"ellipsis-" + index}
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={page}
              className={styles.pageNumber}
              aria-label={page + "ページへ"}
              aria-current={page === pagination.page ? "page" : undefined}
              onClick={() => onPageChange(page)}
            >
              {number(page)}
            </button>
          ),
        )}
        <button
          type="button"
          className={styles.pageDirection}
          aria-label="次のページ"
          disabled={pagination.page === pagination.pageCount}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          <span>次へ</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export function TradeRecordsTab({
  initialRecords,
  watchlist,
  stockCode,
  personalSummary = null,
  summaryUnavailable = false,
  historyUnavailable = false,
}: {
  initialRecords: TradeRecord[];
  watchlist: WatchItem[];
  stockCode?: string;
  personalSummary?: PersonalTradeSummary | null;
  summaryUnavailable?: boolean;
  historyUnavailable?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TradeTab>("real");
  const records = useMemo(
    () => ({
      real: initialRecords.filter(
        (record) => record.type === "real" && record.visibility === "public",
      ),
      demo: initialRecords.filter(
        (record) => record.type === "demo" && record.visibility === "public",
      ),
    }),
    [initialRecords],
  );

  const [pages, setPages] = useState<Record<TradeTab, number>>({
    real: 1,
    demo: 1,
    favorites: 1,
  });
  const listHeadings = useRef<Record<TradeTab, HTMLHeadingElement | null>>({
    real: null,
    demo: null,
    favorites: null,
  });
  const watchPagination = getPagination(
    watchlist.length,
    pages.favorites,
    PAGE_SIZE,
  );
  function changePage(type: TradeTab, requestedPage: number) {
    const total =
      type === "favorites" ? watchlist.length : records[type].length;
    const current = getPagination(total, pages[type], PAGE_SIZE);
    const next = getPagination(total, requestedPage, PAGE_SIZE);
    if (current.page === next.page) return;
    setPages((previous) => ({ ...previous, [type]: next.page }));
    const heading = listHeadings.current[type];
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  const tabs = [
    {
      value: "real",
      label: "リアルトレード",
      icon: Wallet,
      count: records.real.length,
    },
    {
      value: "demo",
      label: "デモトレード",
      icon: FlaskConical,
      count: records.demo.length,
    },
    {
      value: "favorites",
      label: "ウォッチリスト",
      icon: Star,
      count: watchlist.length,
    },
  ] as const;
  return (
    <section
      className={styles.section}
      id="stock-trade-records"
      aria-label="銘柄別トレード記録"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "real" || value === "demo" || value === "favorites")
            setActiveTab(value);
        }}
      >
        <TabsList className={styles.tabsList} aria-label="記録の種類">
          {tabs.map((tab) => (
            <TabsTrigger
              className={styles.tab}
              key={tab.value}
              value={tab.value}
            >
              <tab.icon size={15} className={styles.tabIcon} />
              <span>{tab.label}</span>
              <span className={styles.count}>{number(tab.count)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(["real", "demo"] as const).map((type) => {
          const pagination = getPagination(
            records[type].length,
            pages[type],
            PAGE_SIZE,
          );
          const label = type === "real" ? "リアルトレード" : "デモトレード";
          return (
            <TabsContent className={styles.content} key={type} value={type}>
              {personalSummary && (
                <TradeSummary summary={personalSummary[type]} />
              )}
              {summaryUnavailable && (
                <p className={styles.unavailable} role="status">
                  あなたのトレード成績を読み込めませんでした。ページを再読み込みしてください。
                </p>
              )}
              <div className={styles.listHeading}>
                <h3
                  tabIndex={-1}
                  aria-label={label + "の公開トレード一覧"}
                  ref={(element) => {
                    listHeadings.current[type] = element;
                  }}
                >
                  TRADE HISTORY{" "}
                  <span className={styles.publicLabel}>公開トレード</span>
                </h3>
                <small>
                  {pagination.from > 0
                    ? number(pagination.from) +
                      "–" +
                      number(pagination.to) +
                      " / "
                    : ""}
                  {number(records[type].length)} 件の公開トレード
                </small>
              </div>
              {historyUnavailable ? (
                <p className={styles.unavailable} role="status">
                  公開トレードを読み込めませんでした。ページを再読み込みしてください。
                </p>
              ) : records[type].length ? (
                <>
                  <div className={styles.cards}>
                    {records[type]
                      .slice(pagination.startIndex, pagination.endIndex)
                      .map((record) => (
                        <TradeCard key={record.id} record={record} />
                      ))}
                  </div>
                  <RecordPagination
                    pagination={pagination}
                    label={label}
                    onPageChange={(page) => changePage(type, page)}
                  />
                </>
              ) : (
                <EmptyState stockCode={stockCode} />
              )}
            </TabsContent>
          );
        })}
        <TabsContent className={styles.content} value="favorites">
          <div className={styles.listHeading}>
            <h3
              tabIndex={-1}
              aria-label="ウォッチ中のトレーダーの一覧"
              ref={(element) => {
                listHeadings.current.favorites = element;
              }}
            >
              WATCHING TRADERS
            </h3>
            <small>
              {watchPagination.from > 0
                ? number(watchPagination.from) +
                  "–" +
                  number(watchPagination.to) +
                  " / "
                : ""}
              {number(watchlist.length)} 人がウォッチ中
            </small>
          </div>
          {watchlist.length ? (
            <>
              <div className={styles.watchGrid}>
                {watchlist
                  .slice(watchPagination.startIndex, watchPagination.endIndex)
                  .map((item, index) => (
                    <article
                      className={styles.watchCard}
                      key={
                        item.id ??
                        (item.users?.id || "missing") +
                          "-" +
                          (watchPagination.startIndex + index)
                      }
                    >
                      <Author author={item.users} />
                      <span className={styles.watching}>
                        <Star size={12} />
                        この銘柄をウォッチ中
                      </span>
                    </article>
                  ))}
              </div>
              <RecordPagination
                pagination={watchPagination}
                label="ウォッチリスト"
                onPageChange={(page) => changePage("favorites", page)}
              />
            </>
          ) : (
            <EmptyState watchlist stockCode={stockCode} />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
