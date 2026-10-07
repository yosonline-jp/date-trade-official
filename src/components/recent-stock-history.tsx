"use client";

import { useState } from "react";
import { Clock3, History, Trash2, X } from "lucide-react";

import {
  HISTORY_LIMIT,
  type HistoryEntry,
  type HistoryKind,
  type HistoryTimeframe,
} from "@/lib/stock-history";

import styles from "./recent-stock-history.module.css";

type Props = {
  kind: HistoryKind;
  entries: HistoryEntry[];
  ready: boolean;
  storageAvailable: boolean;
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (code: string) => void;
  onClear: () => void;
  disabled?: boolean;
  currentCode?: string;
};

const timeframeLabels: Record<HistoryTimeframe, string> = {
  "1m": "1分足",
  "5m": "5分足",
  "15m": "15分足",
  daily: "日足",
  weekly: "週足",
};
const presetLabels = {
  standard: "標準",
  daytrade: "デイトレード",
  trend: "トレンド",
};
const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function RecentStockHistory({
  kind,
  entries,
  ready,
  storageAvailable,
  onSelect,
  onRemove,
  onClear,
  disabled = false,
  currentCode,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const visibleEntries = expanded ? entries : entries.slice(0, 4);
  const label =
    kind === "chart" ? "チャートの閲覧履歴" : "デイトレード分析の履歴";

  return (
    <section className={styles.panel + " " +  (kind === "chart" ? styles.chart : styles.analysis)} aria-label={label}>
      <div className={styles.header}>
        <div className={styles.title}>
          <History size={16} aria-hidden="true" />
          <h2>{kind === "chart" ? "最近見たチャート" : "最近の分析"}</h2>
          <span
            className={styles.count}
            aria-label={entries.length + "件の履歴"}
          >
            {entries.length} / {HISTORY_LIMIT}
          </span>
        </div>
        {entries.length > 0 && (
          <button
            className={styles.clear}
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label={
              kind === "chart"
                ? "チャートの履歴をすべて削除"
                : "デイトレード分析の履歴をすべて削除"
            }
          >
            <Trash2 size={13} aria-hidden="true" />
            すべて削除
          </button>
        )}
      </div>

      {!ready ? (
        <p className={styles.empty}>履歴を読み込んでいます…</p>
      ) : entries.length === 0 ? (
        <p className={styles.empty}>
          {kind === "chart"
            ? "表示した銘柄がここに残ります。次回は履歴からすぐ開けます。"
            : "分析した銘柄がここに残ります。履歴を選ぶとすぐに再分析できます。"}
        </p>
      ) : (
        <>
          <ul className={styles.list}>
            {visibleEntries.map((entry) => (
              <li
                key={entry.code}
                className={styles.item}
                data-current={entry.code === currentCode || undefined}
              >
                <button
                  className={styles.open}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(entry)}
                  aria-label={
                    entry.name + "（" + entry.code + "）を履歴から開く"
                  }
                >
                  <span className={styles.stock}>
                    <span className={styles.code}>{entry.code}</span>
                    <span className={styles.name} title={entry.name}>
                      {entry.name}
                    </span>
                  </span>
                  <span className={styles.settings}>
                    <span>{timeframeLabels[entry.timeframe]}</span>
                    <span className={styles.separator} aria-hidden="true">
                      ·
                    </span>
                    <span>
                      {kind === "chart"
                        ? presetLabels[entry.preset]
                        : entry.chartOpen
                          ? "チャート表示"
                          : "分析結果"}
                    </span>
                  </span>
                  <span className={styles.date}>
                    <Clock3 size={11} aria-hidden="true" />
                    <time dateTime={new Date(entry.viewedAt).toISOString()}>
                      {dateFormatter.format(entry.viewedAt)}
                    </time>
                  </span>
                </button>
                <button
                  className={styles.remove}
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(entry.code)}
                  aria-label={entry.name + "（" + entry.code + "）の履歴を削除"}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {entries.length > 4 && (
            <button
              className={styles.expand}
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              {expanded ? "履歴を折りたたむ" : "履歴をすべて表示"}
              {!expanded && <span>（{entries.length}件）</span>}
            </button>
          )}
        </>
      )}

      <p className={styles.note}>
        このブラウザーに最大{HISTORY_LIMIT}
        銘柄を保存。再表示した銘柄は先頭に移り、 古い履歴から削除されます。
      </p>
      {!storageAvailable && (
        <p className={styles.unavailable} role="status">
          このブラウザーでは履歴を保存できません。今開いているページ内では利用できます。
        </p>
      )}
    </section>
  );
}
