"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import type { CandleRaw } from "./stock-candle-chart";
import type { VolumeChartData } from "./volume-chart";
import type { Candle, Interval } from "@/lib/analysis/types";
import {
  technicalLevels,
  technicalSeries,
  type StockTechnicalData,
  type TechnicalPoint,
} from "@/lib/analysis/stock-technicals";
import type { TechnicalChartKind } from "./stock-technical-chart";
import styles from "./stock-technical-panel.module.css";

const TechnicalChart = dynamic(() => import("./stock-technical-chart"), {
  ssr: false,
  loading: () => <p className={styles.note}>指標チャートを準備しています…</p>,
});
type Timeframe = Interval | "1d";
const EMPTY_POINTS: TechnicalPoint[] = [];
type Metric = { label: string; value: string; hint: string; state?: string };
const labels: Record<Timeframe, string> = {
  "1m": "1分足",
  "5m": "5分足",
  "15m": "15分足",
  "1d": "日足",
};
const chartChoices: [TechnicalChartKind, string][] = [
  ["rsi", "RSI"],
  ["rci", "RCI"],
  ["macd", "MACD"],
  ["price", "株価・移動平均・ボリンジャー"],
  ["stochastic", "ストキャスティクス"],
  ["kdj", "KDJ"],
  ["dmi", "ADX・DMI"],
  ["atr", "ATR"],
  ["cci", "CCI"],
  ["mfi", "MFI"],
  ["williams", "Williams %R"],
  ["volume", "出来高・平均比"],
  ["obv", "OBV"],
  ["roc", "ROC"],
];
const format = (value: number | null | undefined, suffix = "", digits = 2) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : `${value.toLocaleString("ja-JP", { maximumFractionDigits: digits })}${suffix}`;
const pair = (a: number | null, b: number | null) =>
  `${format(a)} / ${format(b)}`;
const zone = (value: number | null, low: number, high: number) =>
  value == null
    ? "データ不足"
    : value <= low
      ? "低水準"
      : value >= high
        ? "高水準"
        : "中間帯";
const marketLabels = {
  OPEN: "取引時間中",
  CLOSED: "取引時間外",
  BREAK: "昼休み",
  STALE: "データが古い",
};

export default function StockTechnicalPanel({
  stockCode,
  dailyCandles,
  dailyVolumes,
}: {
  stockCode: string;
  dailyCandles: CandleRaw[];
  dailyVolumes: VolumeChartData;
}) {
  const headingId = useId(),
    chartId = useId();
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [intraday, setIntraday] = useState<StockTechnicalData | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [chartOpen, setChartOpen] = useState(false);
  const [chartKind, setChartKind] = useState<TechnicalChartKind>("rsi");
  const request = useRef<AbortController | null>(null);
  const cache = useRef(
    new Map<Interval, { expires: number; data: StockTechnicalData }>(),
  );
  useEffect(() => () => request.current?.abort(), []);

  const daily = useMemo(() => {
    // Match volume by timestamp: either original series may contain missing values.
    const volumeByTime = new Map(
      dailyVolumes.timestamps.map((time, i) => [time, dailyVolumes.volumes[i]]),
    );
    const unique = new Map<number, Candle>();
    for (const bar of dailyCandles) {
      const rawVolume = volumeByTime.get(bar.ts);
      const volume =
        typeof rawVolume === "number" &&
        Number.isFinite(rawVolume) &&
        rawVolume >= 0
          ? rawVolume
          : NaN;
      if (
        ![bar.ts, bar.open, bar.high, bar.low, bar.close].every(
          Number.isFinite,
        ) ||
        bar.low <= 0 ||
        bar.high < Math.max(bar.open, bar.close) ||
        bar.low > Math.min(bar.open, bar.close)
      )
        continue;
      unique.set(bar.ts, {
        time: bar.ts,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume,
      });
    }
    const bars = [...unique.values()].sort((a, b) => a.time - b.time);
    return {
      points: technicalSeries(bars),
      levels: technicalLevels(bars, "daily"),
    };
  }, [dailyCandles, dailyVolumes]);

  async function selectTimeframe(next: Timeframe, refresh = false) {
    request.current?.abort();
    setTimeframe(next);
    setError("");
    if (next === "1d") {
      setLoading(false);
      return;
    }
    const saved = cache.current.get(next);
    if (!refresh && saved && saved.expires > Date.now()) {
      setIntraday(saved.data);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setIntraday(null);
    try {
      const response = await fetch(
        `/api/stocks/${encodeURIComponent(stockCode)}/technicals?interval=${next}`,
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
            : "分足の指標を取得できませんでした。",
        );
      if (!controller.signal.aborted) {
        cache.current.set(next, { data: result, expires: Date.now() + 60_000 });
        setIntraday(result);
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error && /timeout|abort/i.test(cause.name)
            ? "分足の取得がタイムアウトしました。再度お試しください。"
            : cause instanceof Error
              ? cause.message
              : "分足を取得できませんでした。",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const points =
    timeframe === "1d" ? daily.points : (intraday?.points ?? EMPTY_POINTS);
  const current = points.at(-1),
    previous = points.at(-2);
  const levels = timeframe === "1d" ? daily.levels : intraday?.levels;
  const groups = current
    ? metricGroups(current, previous, timeframe !== "1d")
    : [];
  const chartPoints = useMemo(() => points.slice(-120), [points]);
  return (
    <section
      className={`terminal-panel ${styles.panel}`}
      aria-labelledby={headingId}
    >
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">TECHNICAL INDICATORS</p>
          <h2 id={headingId}>
            <Activity size={18} aria-hidden="true" />
            デイトレード指標
          </h2>
          <p className={styles.note}>
            勢い・トレンド・値動き・出来高・支持抵抗を、時間足ごとに確認できます。
          </p>
        </div>
        {timeframe !== "1d" && (
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
      </header>
      <div className={styles.toolbar}>
        <div
          role="group"
          aria-label="テクニカル指標の時間足"
          className={styles.tabs}
        >
          {(["1m", "5m", "15m", "1d"] as Timeframe[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={timeframe === value}
              onClick={() => selectTimeframe(value)}
            >
              {labels[value]}
            </button>
          ))}
        </div>
        <span className={styles.source}>
          {timeframe === "1d"
            ? "保存済みの日足"
            : "Yahoo Finance · 遅延の可能性あり"}
        </span>
      </div>
      {loading && (
        <p className={styles.loading} role="status">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          {labels[timeframe]}のデータと指標を取得しています…
        </p>
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
      {!loading && !error && current && (
        <>
          <div className={styles.meta}>
            <span>
              <strong>{labels[timeframe]}</strong> · 終値{" "}
              {format(current.close, "円")}
            </span>
            <span>
              {timeframe === "1d" ? "最終データ日" : "確定足の終了時刻"}{" "}
              {new Date(
                timeframe === "1d" ? current.time * 1000 : intraday!.dataAt,
              ).toLocaleString("ja-JP", {
                timeZone: "Asia/Tokyo",
                ...(timeframe === "1d"
                  ? { year: "numeric", month: "2-digit", day: "2-digit" }
                  : {}),
              })}{" "}
              JST
            </span>
            {timeframe !== "1d" && (
              <span className={styles.marketState}>
                {marketLabels[intraday!.source.marketState]}
              </span>
            )}
          </div>
          <div className={styles.summary}>
            <div>
              <span>RSI(14)</span>
              <strong>{format(current.rsi, "", 1)}</strong>
              <small>{zone(current.rsi, 30, 70)}</small>
            </div>
            <div>
              <span>RCI(7)</span>
              <strong>{format(current.rci, "", 1)}</strong>
              <small>{zone(current.rci, -80, 80)}</small>
            </div>
            <div>
              <span>MACDヒストグラム</span>
              <strong>{format(current.macdHistogram)}</strong>
              <small>
                {current.macdHistogram == null
                  ? "データ不足"
                  : current.macdHistogram > 0
                    ? "MACDがシグナルより上"
                    : current.macdHistogram < 0
                      ? "MACDがシグナルより下"
                      : "シグナルと同水準"}
              </small>
            </div>
            <div>
              <span>ADX(14)</span>
              <strong>{format(current.adx, "", 1)}</strong>
              <small>
                {current.adx == null
                  ? "データ不足"
                  : current.adx >= 25
                    ? "トレンド強度が高い"
                    : current.adx < 20
                      ? "トレンド強度が低い"
                      : "中間帯"}
              </small>
            </div>
          </div>
          <div className={styles.groups}>
            {groups.map((group) => (
              <section className={styles.group} key={group.title}>
                <h3>{group.title}</h3>
                <dl>
                  {group.metrics.map((metric) => (
                    <div key={metric.label}>
                      <dt>{metric.label}</dt>
                      <dd>
                        {metric.value}
                        <small>
                          {metric.state ??
                            (metric.value.includes("—")
                              ? "データ不足"
                              : metric.hint)}
                        </small>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            {levels && (
              <section className={styles.group}>
                <h3>支持・抵抗の目安</h3>
                <dl>
                  {(
                    [
                      [
                        "直近20本 高値 / 安値",
                        pair(current.recentHigh, current.recentLow),
                        "選択した時間足の直近20本",
                      ],
                      [
                        "前取引日高値 / 安値",
                        pair(levels.previousHigh, levels.previousLow),
                        "前の取引日の値動き",
                      ],
                      [
                        "対象日高値 / 安値",
                        pair(levels.dayHigh, levels.dayLow),
                        "取得済みの当日データ",
                      ],
                      [
                        "ピボット",
                        format(levels.pivot, "円"),
                        "前取引日の取得データから計算",
                      ],
                      [
                        "R1 / R2",
                        pair(levels.r1, levels.r2),
                        "ピボット由来の上側の目安",
                      ],
                      [
                        "S1 / S2",
                        pair(levels.s1, levels.s2),
                        "ピボット由来の下側の目安",
                      ],
                    ] as string[][]
                  ).map(([label, value, hint]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        {value}
                        <small>
                          {value.includes("—") ? "データ不足" : hint}
                        </small>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
          <div className={styles.chartArea}>
            <div className={styles.chartToolbar}>
              <button
                type="button"
                className="terminal-button secondary"
                aria-expanded={chartOpen}
                onClick={() => setChartOpen(!chartOpen)}
              >
                {chartOpen ? "指標チャートを閉じる" : "指標チャートを表示"}
              </button>
              {chartOpen && (
                <div className={styles.chartSelect}>
                  <label htmlFor={chartId}>表示する指標</label>
                  <select
                    id={chartId}
                    value={chartKind}
                    onChange={(event) =>
                      setChartKind(event.target.value as TechnicalChartKind)
                    }
                  >
                    {chartChoices.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {chartOpen && (
              <TechnicalChart
                points={chartPoints}
                kind={chartKind}
                intraday={timeframe !== "1d"}
              />
            )}
          </div>
          <p className={styles.note}>
            {timeframe === "1d"
              ? `保存済み日足${daily.points.length}本から計算。取引中の日足は途中値を含む場合があります。VWAPは分足で表示します。`
              : `確定足${intraday!.source.bars.toLocaleString("ja-JP")}本から計算。取引時間外・昼休み・遅延時も直近データを表示します。分足は短時間キャッシュされます。`}
          </p>
          {timeframe === "1d" &&
            daily.points.some((p) => p.volume === null) && (
              <p className={styles.note}>
                出来高が欠けた足も価格指標の計算に含めます。出来高を必要とする指標は、必要な情報が揃わない部分を「—」で表示します。
              </p>
            )}
          {timeframe !== "1d" && (
            <p className={styles.note}>
              前取引日の高安値・ピボットは取得した分足を基準に計算するため、公式の日足値と異なる場合があります。
            </p>
          )}
          {timeframe !== "1d" &&
            intraday?.source.warnings.map((warning, i) => (
              <p className={styles.note} key={i}>
                {warning}
              </p>
            ))}
        </>
      )}
      {!loading && !error && !current && (
        <p className={styles.note}>
          テクニカル指標を計算できる日足データがありません。分足の時間足を選ぶと取得できます。
        </p>
      )}
      <p className={styles.footnote}>
        指標は選択した時間足の本数で計算します。高水準・低水準は売買の確定条件ではありません。期間不足や分母が0の指標は「—」で表示します。
      </p>
    </section>
  );
}

function metricGroups(
  p: TechnicalPoint,
  previous: TechnicalPoint | undefined,
  intraday: boolean,
): { title: string; metrics: Metric[] }[] {
  return [
    {
      title: "勢い・過熱感",
      metrics: [
        {
          label: "RSI(14)",
          value: format(p.rsi),
          hint: "30 / 70を目安に相対的な強さを確認",
        },
        {
          label: "RCI(7) / RCI(26)",
          value: pair(p.rci, p.rci26),
          hint: "±80を目安に短期と長めの勢いを比較",
        },
        {
          label: "MACD / シグナル",
          value: pair(p.macd, p.macdSignal),
          hint: "EMA12−EMA26 / MACDのEMA9",
        },
        {
          label: "MACDヒストグラム",
          value: format(p.macdHistogram),
          hint: "MACD−シグナル",
        },
        {
          label: "ストキャスティクス %K / %D",
          value: pair(p.stochasticK, p.stochasticD),
          hint: "9本の高安に対する終値 / 3本平均",
        },
        {
          label: "KDJ K / D / J",
          value: `${pair(p.k, p.d)} / ${format(p.j)}`,
          hint: "K・Dの交差とJの変化を確認",
        },
        {
          label: "Williams %R(14)",
          value: format(p.williamsR),
          hint: "−80 / −20を目安に終値の位置を確認",
        },
        {
          label: "CCI(20)",
          value: format(p.cci),
          hint: "典型価格の平均からの乖離 / ±100が目安",
        },
        {
          label: "ROC(10)",
          value: format(p.roc, "%"),
          hint: "10本前の終値からの変化率",
        },
      ],
    },
    {
      title: "トレンド",
      metrics: [
        {
          label: "EMA9 / EMA20",
          value: pair(p.ema9, p.ema20),
          hint: "直近価格を重くする短期移動平均",
        },
        {
          label: "EMA50 / EMA100",
          value: pair(p.ema50, p.ema100),
          hint: "長めの流れとの位置関係を確認",
        },
        {
          label: "SMA5 / SMA25 / SMA75",
          value: `${pair(p.sma5, p.sma25)} / ${format(p.sma75)}`,
          hint: "終値の単純平均",
        },
        {
          label: "ADX(14)",
          value: format(p.adx),
          hint: "方向ではなくトレンドの強度",
        },
        {
          label: "+DI / −DI(14)",
          value: pair(p.plusDI, p.minusDI),
          hint: "上方向・下方向の値動きの比較",
        },
        {
          label: "EMA20乖離率",
          value:
            p.ema20 == null || p.ema20 === 0
              ? "—"
              : format((p.close / p.ema20 - 1) * 100, "%"),
          hint: "終値がEMA20からどれだけ離れているか",
        },
      ],
    },
    {
      title: "値動き・ボラティリティ",
      metrics: [
        {
          label: "ATR(14)",
          value: format(p.atr, "円"),
          hint: "ギャップを含む値幅のWilder平均",
        },
        {
          label: "ATR / 終値",
          value: p.atr == null ? "—" : format((p.atr / p.close) * 100, "%"),
          hint: "価格に対する平均的な値幅",
        },
        {
          label: "BB上限 / 中心 / 下限",
          value: `${pair(p.bbUpper, p.bbMiddle)} / ${format(p.bbLower)}`,
          hint: "20本単純平均 ± 2標準偏差",
        },
        {
          label: "ボリンジャー %B",
          value: format(p.bbPercentB, "%"),
          hint: "下限0%・上限100%に対する終値の位置",
        },
        {
          label: "バンド幅",
          value: format(p.bbBandwidth, "%"),
          hint: "（上限−下限）÷中心線",
        },
      ],
    },
    {
      title: "出来高・資金の動き",
      metrics: [
        {
          label: "出来高",
          value: format(p.volume, "株", 0),
          hint: "選択した足の出来高",
        },
        {
          label: "出来高 / 直前20本平均",
          value: format(p.volumeRatio, "倍"),
          hint: "1倍を基準に出来高の増減を確認",
        },
        {
          label: "MFI(14)",
          value: format(p.mfi),
          hint: "価格と出来高で資金の動きを確認 / 20・80が目安",
        },
        {
          label: "OBV",
          value: format(p.obv, "株", 0),
          hint: "取得期間内の累積出来高 / 絶対値より推移を確認",
        },
        {
          label: "OBV 前の足との差",
          value:
            previous?.obv == null || p.obv == null
              ? "—"
              : format(p.obv - previous.obv, "株", 0),
          hint: "終値の上下で加減した出来高",
        },
        ...(intraday
          ? [
              {
                label: "VWAP",
                value: format(p.vwap, "円"),
                hint: "当日の典型価格を出来高で加重した平均",
              },
              {
                label: "VWAP乖離率",
                value:
                  p.vwap == null || p.vwap === 0
                    ? "—"
                    : format((p.close / p.vwap - 1) * 100, "%"),
                hint: "終値と当日VWAPの位置関係",
              },
            ]
          : []),
      ],
    },
  ];
}
