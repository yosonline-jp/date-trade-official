"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import "./trade-records-responsive.css";
import { TradeAddModal } from "./trade-add-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import TradeProgressClient, {
  type DayProfit,
  type MonthProfit,
} from "./trade-progress-client";

interface TradeRecord {
  id: number;
  stock_code: string;
  stock_name: string;
  buy_price: number;
  sell_price: number;
  quantity: number;
  profit: number;
  trade_date: string;
  trade_type: string;
  memo: string | null;
  type: "real" | "demo";
}

type TradeMode = "real" | "demo";
type ResultFilter = "all" | "wins" | "losses";
const yen = (value: number) =>
  `¥${Math.abs(value).toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
const signedYen = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${yen(value)}`;
const profitOf = (record: TradeRecord) => Number(record.profit) || 0;

export function TradeRecordsClient({
  initialRecords,
  userId,
}: {
  initialRecords: TradeRecord[];
  userId: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [mode, setMode] = useState<TradeMode>("real");
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TradeRecord | null>(null);

  const modeRecords = useMemo(
    () => records.filter((record) => record.type === mode),
    [records, mode],
  );
  const stats = useMemo(() => {
    const wins = modeRecords.filter((record) => profitOf(record) > 0);
    const losses = modeRecords.filter((record) => profitOf(record) < 0);
    const total = modeRecords.reduce(
      (sum, record) => sum + profitOf(record),
      0,
    );
    return {
      total,
      count: modeRecords.length,
      wins: wins.length,
      losses: losses.length,
      winRate: modeRecords.length
        ? Math.round((wins.length / modeRecords.length) * 100)
        : 0,
      average: modeRecords.length ? total / modeRecords.length : 0,
      best: wins.length ? Math.max(...wins.map(profitOf)) : 0,
    };
  }, [modeRecords]);

  const { daySeries, monthSeries, year } = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const daily = new Map<string, number>();
    const monthly = new Map<string, number>();
    for (const record of modeRecords) {
      const amount = profitOf(record);
      daily.set(
        record.trade_date,
        (daily.get(record.trade_date) ?? 0) + amount,
      );
      const month = record.trade_date.slice(0, 7);
      monthly.set(month, (monthly.get(month) ?? 0) + amount);
    }
    let cumulative = 0;
    const daySeries: DayProfit[] = Array.from({ length: 30 }, (_, index) => {
      const date = format(subDays(today, 29 - index), "yyyy-MM-dd");
      const profit = daily.get(date) ?? 0;
      cumulative += profit;
      return { date, profit, cumulative };
    });
    const monthSeries: MonthProfit[] = Array.from(
      { length: today.getMonth() + 1 },
      (_, index) => {
        const month = `${year}-${String(index + 1).padStart(2, "0")}`;
        return { month, profit: monthly.get(month) ?? 0 };
      },
    );
    return { daySeries, monthSeries, year };
  }, [modeRecords]);

  const visibleRecords = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return modeRecords.filter((record) => {
      const resultMatches =
        filter === "all" ||
        (filter === "wins" ? profitOf(record) > 0 : profitOf(record) < 0);
      const searchMatches =
        !term ||
        `${record.stock_name} ${record.stock_code} ${record.memo ?? ""}`
          .toLocaleLowerCase()
          .includes(term);
      return resultMatches && searchMatches;
    });
  }, [modeRecords, filter, query]);

  async function refreshRecords() {
    setLoading(true);
    try {
      const { data, error } = await createClient()
        .from("trade_records")
        .select(
          "id, stock_code, stock_name, buy_price, sell_price, quantity, profit, trade_date, trade_type, memo, type",
        )
        .eq("user_id", userId)
        .order("trade_date", { ascending: false });
      if (error) throw error;
      setRecords(data ?? []);
    } catch (error) {
      console.error("Failed to refresh trade records:", error);
      toast.error("記録を更新できませんでした。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      const { error } = await createClient()
        .from("trade_records")
        .delete()
        .eq("id", target.id)
        .eq("user_id", userId);
      if (error) throw error;
      setRecords((current) =>
        current.filter((record) => record.id !== target.id),
      );
      setDeleteTarget(null);
      toast.success("取引記録を削除しました。");
    } catch (error) {
      console.error("Failed to delete trade record:", error);
      toast.error("削除できませんでした。もう一度お試しください。");
    }
  }

  return (
    <div className="trade-journal">
      <div className="trade-journal-heading">
        <div>
          <p className="eyebrow">MY WORKSPACE / TRADE JOURNAL</p>
          <h1>
            取引記録<span className="heading-dot">.</span>
          </h1>
          <p>数字と振り返りを、次のトレードに活かす。</p>
        </div>
        <button
          className="terminal-button trade-add-button"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={17} /> 取引を記録
        </button>
      </div>

      <div className="trade-mode-bar" aria-label="取引モード">
        <div className="trade-mode-switch">
          <button
            className={mode === "real" ? "active" : ""}
            onClick={() => {
              setMode("real");
              setFilter("all");
            }}
            aria-pressed={mode === "real"}
          >
            リアルトレード
          </button>
          <button
            className={mode === "demo" ? "active" : ""}
            onClick={() => {
              setMode("demo");
              setFilter("all");
            }}
            aria-pressed={mode === "demo"}
          >
            デモトレード
          </button>
        </div>
        <span>
          <span className="trade-live-dot" />{" "}
          {mode === "real" ? "REAL ACCOUNT" : "PAPER ACCOUNT"}
        </span>
      </div>

      <section className="trade-stat-grid" aria-label="取引サマリー">
        <div className="trade-stat-card trade-stat-primary">
          <div className="trade-stat-top">
            <span>累計損益</span>
            <TrendingUp size={18} />
          </div>
          <strong className={stats.total < 0 ? "negative" : "positive"}>
            {signedYen(stats.total)}
          </strong>
          <small>{stats.count}件の取引から集計</small>
        </div>
        <div className="trade-stat-card">
          <div className="trade-stat-top">
            <span>勝率</span>
            <Target size={18} />
          </div>
          <strong>
            {stats.winRate}
            <em>%</em>
          </strong>
          <small>
            {stats.wins}勝 <span className="trade-stat-separator">/</span>{" "}
            {stats.losses}敗
          </small>
        </div>
        <div className="trade-stat-card">
          <div className="trade-stat-top">
            <span>平均損益</span>
            <ArrowUpRight size={18} />
          </div>
          <strong className={stats.average < 0 ? "negative" : ""}>
            {signedYen(stats.average)}
          </strong>
          <small>1取引あたり</small>
        </div>
        <div className="trade-stat-card">
          <div className="trade-stat-top">
            <span>最大利益</span>
            <CalendarDays size={18} />
          </div>
          <strong>{signedYen(stats.best)}</strong>
          <small>ベストトレード</small>
        </div>
      </section>

      <TradeProgressClient
        daySeries={daySeries}
        monthSeries={monthSeries}
        year={year}
        hasRecords={modeRecords.length > 0}
      />

      <section className="trade-history-panel">
        <div className="trade-history-heading">
          <div>
            <p className="eyebrow">TRADE HISTORY</p>
            <h2>
              取引履歴 <span>{modeRecords.length}</span>
            </h2>
            <p>エントリーから決済までの記録を振り返る</p>
          </div>
          <div className="trade-history-tools">
            <label className="trade-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="銘柄・コード・メモで検索"
                aria-label="取引履歴を検索"
              />
            </label>
            <div className="trade-result-filter" aria-label="損益で絞り込み">
              {(
                [
                  ["all", "すべて"],
                  ["wins", "利益"],
                  ["losses", "損失"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <p className="trade-refreshing" role="status">
            取引記録を更新しています…
          </p>
        )}
        {visibleRecords.length === 0 ? (
          <div className="trade-empty">
            <span>
              <BookOpenText size={25} />
            </span>
            <h3>
              {modeRecords.length === 0
                ? "まだ取引記録がありません"
                : "条件に一致する取引がありません"}
            </h3>
            <p>
              {modeRecords.length === 0
                ? "最初の取引を記録して、あなたのトレードを可視化しましょう。"
                : "検索キーワードや絞り込み条件を変更してください。"}
            </p>
            {modeRecords.length === 0 && (
              <button
                className="terminal-button"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} /> 最初の取引を記録
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="trade-mobile-list">
              {visibleRecords.map((record) => (
                <article className="trade-mobile-card" key={record.id}>
                  <div className="trade-mobile-card-heading">
                    <div>
                      <small>
                        {record.trade_date} · {record.stock_code}
                      </small>
                      <h3>{record.stock_name || record.stock_code}</h3>
                    </div>
                    <button
                      className="trade-delete"
                      onClick={() => setDeleteTarget(record)}
                      aria-label={`${record.stock_name || record.stock_code}の取引を削除`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="trade-mobile-result">
                    <span className="trade-type-pill">
                      {record.trade_type || "現物"}
                    </span>
                    <strong
                      className={profitOf(record) < 0 ? "negative" : "positive"}
                    >
                      {signedYen(profitOf(record))}
                    </strong>
                  </div>
                  <dl>
                    <div>
                      <dt>買値</dt>
                      <dd>{yen(Number(record.buy_price))}</dd>
                    </div>
                    <div>
                      <dt>売値</dt>
                      <dd>{yen(Number(record.sell_price))}</dd>
                    </div>
                    <div>
                      <dt>株数</dt>
                      <dd>
                        {Number(record.quantity).toLocaleString("ja-JP")}株
                      </dd>
                    </div>
                  </dl>
                  {record.memo && (
                    <p className="trade-mobile-memo">{record.memo}</p>
                  )}
                </article>
              ))}
            </div>
            <div className="trade-table-scroll">
              <table className="trade-table">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>銘柄 / コード</th>
                    <th>区分</th>
                    <th>買値 → 売値</th>
                    <th>株数</th>
                    <th className="align-right">損益</th>
                    <th>メモ</th>
                    <th>
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.map((record) => {
                    const profit = profitOf(record);
                    return (
                      <tr key={record.id}>
                        <td className="trade-date">
                          {format(
                            new Date(`${record.trade_date}T12:00:00`),
                            "yyyy.MM.dd",
                            { locale: ja },
                          )}
                        </td>
                        <td>
                          <strong>
                            {record.stock_name || record.stock_code}
                          </strong>
                          <small>{record.stock_code}</small>
                        </td>
                        <td>
                          <span className="trade-type-pill">
                            {record.trade_type || "現物"}
                          </span>
                        </td>
                        <td className="trade-price">
                          {yen(Number(record.buy_price))} <span>→</span>{" "}
                          {yen(Number(record.sell_price))}
                        </td>
                        <td className="trade-quantity">
                          {Number(record.quantity).toLocaleString("ja-JP")}
                        </td>
                        <td
                          className={`trade-profit align-right ${profit < 0 ? "negative" : profit > 0 ? "positive" : ""}`}
                        >
                          {profit < 0 ? (
                            <ArrowDownRight size={15} />
                          ) : (
                            <ArrowUpRight size={15} />
                          )}
                          {signedYen(profit)}
                        </td>
                        <td
                          className="trade-memo"
                          title={record.memo ?? undefined}
                        >
                          {record.memo || "—"}
                        </td>
                        <td>
                          <button
                            className="trade-delete"
                            onClick={() => setDeleteTarget(record)}
                            aria-label={`${record.stock_name || record.stock_code}の取引を削除`}
                            title="削除"
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
          </>
        )}
        {visibleRecords.length > 0 && (
          <div className="trade-history-footer">
            {visibleRecords.length} / {modeRecords.length} 件を表示{" "}
            <span>損益は登録した約定価格と株数から算出</span>
          </div>
        )}
      </section>

      <TradeAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        type={mode}
        onSuccess={refreshRecords}
      />
      {deleteTarget && (
        <DeleteConfirmModal
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          record={deleteTarget}
        />
      )}
    </div>
  );
}
