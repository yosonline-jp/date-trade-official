"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import TradingChart from "./trading-chart";
import type { CandleRaw } from "./stock-candle-chart";
import {
  savedChartPoints,
  weeklyChartPoints,
} from "@/lib/analysis/chart-workspace";
import {
  technicalLevels,
  type StockTechnicalData,
  type TechnicalLevels,
  type TechnicalPoint,
} from "@/lib/analysis/stock-technicals";
import type { Interval } from "@/lib/analysis/types";
import styles from "./chart-workspace.module.css";

type Timeframe = Interval | "daily" | "weekly";
type ChartDataset = {
  points: TechnicalPoint[];
  interval: Timeframe;
  levels: TechnicalLevels;
};
const labels: Record<Timeframe, string> = {
  "1m": "1分足",
  "5m": "5分足",
  "15m": "15分足",
  daily: "日足",
  weekly: "週足",
};
const marketLabels = {
  OPEN: "取引時間中",
  CLOSED: "取引時間外",
  BREAK: "昼休み",
  STALE: "データが古い",
};
const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const minuteFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ChartWorkspace({
  stockCode,
  dailyCandles,
}: {
  stockCode: string;
  dailyCandles: Array<CandleRaw & { volume?: number | null }>;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [intraday, setIntraday] = useState<StockTechnicalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const cache = useRef(
    new Map<Interval, { data: StockTechnicalData; expires: number }>(),
  );
  useEffect(() => () => request.current?.abort(), []);

  const saved = useMemo(() => {
    const daily = savedChartPoints(dailyCandles);
    const weekly = weeklyChartPoints(daily);
    return {
      daily: {
        points: daily,
        interval: "daily" as const,
        levels: technicalLevels(
          daily.map((point) => ({ ...point, volume: point.volume ?? NaN })),
          "daily",
        ),
      },
      weekly: {
        points: weekly,
        interval: "weekly" as const,
        levels: technicalLevels(
          weekly.map((point) => ({ ...point, volume: point.volume ?? NaN })),
          "daily",
        ),
      },
    };
  }, [dailyCandles]);
  const [dataset, setDataset] = useState<ChartDataset>(saved.daily);
  useEffect(() => {
    setDataset((previous) =>
      previous.interval === "daily" || previous.interval === "weekly"
        ? saved[previous.interval]
        : previous,
    );
  }, [saved]);
  const local = timeframe === "daily" || timeframe === "weekly";

  async function selectTimeframe(next: Timeframe, refresh = false) {
    request.current?.abort();
    request.current = null;
    setTimeframe(next);
    setError("");
    if (next === "daily" || next === "weekly") {
      setDataset(saved[next]);
      setLoading(false);
      return;
    }
    const previous = cache.current.get(next);
    if (!refresh && previous && previous.expires > Date.now()) {
      setIntraday(previous.data);
      setDataset({
        points: previous.data.points,
        interval: next,
        levels: previous.data.levels,
      });
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setIntraday(null);
    try {
      const response = await fetch(
        `/api/stocks/${encodeURIComponent(stockCode)}/technicals?interval=${next}&limit=1200`,
        {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(75_000),
          ]),
        },
      );
      const result: StockTechnicalData | { error: string } =
        await response.json();
      if (!response.ok || "error" in result)
        throw new Error(
          "error" in result
            ? result.error
            : "分足の株価を取得できませんでした。",
        );
      if (
        result.symbol !== stockCode ||
        result.interval !== next ||
        !Array.isArray(result.points)
      )
        throw new Error("選択した銘柄・時間足のデータを取得できませんでした。");
      if (!controller.signal.aborted) {
        const now = Date.now();
        cache.current.set(next, {
          data: result,
          expires: Math.min(
            now + 60_000,
            (Math.floor(now / 60_000) + 1) * 60_000,
          ),
        });
        setIntraday(result);
        setDataset({
          points: result.points,
          interval: next,
          levels: result.levels,
        });
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error && /timeout|abort/i.test(cause.name)
            ? "分足の取得がタイムアウトしました。再度お試しください。"
            : cause instanceof Error
              ? cause.message
              : "分足の株価を取得できませんでした。",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const latestSaved = saved.daily.points.at(-1);
  return (
    <section className={styles.workspace} aria-label="チャートワークスペース">
      <div className={styles.toolbar}>
        <div
          role="group"
          aria-label="チャートの時間足"
          className={styles.timeframes}
        >
          {(["1m", "5m", "15m", "daily", "weekly"] as Timeframe[]).map(
            (value) => (
              <button
                type="button"
                key={value}
                aria-pressed={timeframe === value}
                onClick={() => selectTimeframe(value)}
              >
                {labels[value]}
              </button>
            ),
          )}
        </div>
        <div className={styles.source}>
          <span>
            {local ? "保存済みの日足" : "Yahoo Finance · 遅延の可能性あり"}
          </span>
          {!local && (
            <button
              type="button"
              className="terminal-button secondary"
              disabled={loading}
              onClick={() => selectTimeframe(timeframe, true)}
            >
              <RefreshCw size={14} aria-hidden="true" />
              分足を更新
            </button>
          )}
        </div>
      </div>
      {loading && (
        <div className={styles.placeholder} role="status">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          {labels[timeframe]}のデータを取得しています…
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="terminal-button secondary"
            onClick={() => selectTimeframe(timeframe, true)}
          >
            再試行
          </button>
        </div>
      )}
      <div hidden={loading || Boolean(error)}>
        <TradingChart
          points={dataset.points}
          interval={dataset.interval}
          levels={dataset.levels}
          height={480}
        />
      </div>
      {!loading && !error && local && latestSaved && (
        <div className={styles.footnote}>
          <p>
            最終データ {dateFormat.format(new Date(latestSaved.time * 1000))}{" "}
            JST · 保存済み日足{saved.daily.points.length}本
            {timeframe === "weekly"
              ? `を週足${saved.weekly.points.length}本へ集計`
              : ""}{" "}
            · リアルタイム配信ではありません。
          </p>
          <p>
            {timeframe === "weekly"
              ? "進行中の週は途中値を含みます。支持・抵抗の目安は前週の高値・安値・終値を基準にします。"
              : "取引中の日足は途中値を含む場合があります。指標は保存された期間から計算します。"}
          </p>
        </div>
      )}
      {!loading && !error && !local && intraday && (
        <div className={styles.footnote}>
          <p>
            確定足の終了時刻 {minuteFormat.format(new Date(intraday.dataAt))}{" "}
            JST · {marketLabels[intraday.source.marketState]} ·{" "}
            {intraday.source.provider} · {intraday.source.delay}
          </p>
          <p>
            確定足{intraday.source.bars.toLocaleString("ja-JP")}
            本から指標を計算し、直近
            {intraday.points.length.toLocaleString("ja-JP")}
            本を表示します。取得データは短時間キャッシュされます。前取引日の高安値・ピボットは分足の取得範囲を基準にします。
          </p>
          {intraday.source.warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}
