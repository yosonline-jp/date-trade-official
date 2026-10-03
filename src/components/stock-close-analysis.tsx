"use client";

import { useId, useState } from "react";
import { ChartNoAxesCombined, Loader2 } from "lucide-react";
import type { StockCloseAnalysis } from "@/lib/market/close-forecast";
import styles from "./stock-close-analysis.module.css";

const number = (value: number, digits = 2) =>
  value.toLocaleString("ja-JP", { maximumFractionDigits: digits });
const signed = (value: number, digits = 2) =>
  `${value > 0 ? "+" : ""}${number(value, digits)}`;

export default function StockCloseAnalysisPanel({
  stockCode,
}: {
  stockCode: string;
}) {
  const headingId = useId();
  const [result, setResult] = useState<StockCloseAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(
        `/api/stocks/${encodeURIComponent(stockCode)}/close-analysis`,
        {
          method: "POST",
          cache: "no-store",
        },
      );
      const data: StockCloseAnalysis | { error: string } =
        await response.json();
      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "終値を分析できませんでした。",
        );
      }
      setResult(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "終値を分析できませんでした。再度お試しください。",
      );
    } finally {
      setLoading(false);
    }
  }

  const direction = result
    ? result.score > 0
      ? "上昇予想"
      : result.score < 0
        ? "下落予想"
        : "横ばい予想"
    : "";
  const tone = result
    ? result.score > 0
      ? "positive"
      : result.score < 0
        ? "negative"
        : ""
    : "";

  return (
    <section
      className={`terminal-panel ${styles.panel}`}
      aria-labelledby={headingId}
    >
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">CLOSING PRICE ANALYSIS</p>
          <h2 id={headingId}>
            <ChartNoAxesCombined size={18} />
            終値予測
          </h2>
          <p className={styles.description}>
            始値と直近の日足から、対象日の終値を分析します。
          </p>
        </div>
        <button
          type="button"
          className="terminal-button secondary"
          onClick={analyze}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ChartNoAxesCombined size={16} />
          )}
          {loading ? "分析中…" : result ? "再分析する" : "終値を分析"}
        </button>
      </div>
      {loading && (
        <p className={styles.status} role="status">
          最新の日足データを取得し、終値を計算しています。
        </p>
      )}
      {error && (
        <p className="data-notice" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div aria-live="polite">
          <div className={styles.meta}>
            <span>
              対象取引日 <strong>{result.tradingDate}</strong>（JST）
            </span>
            <span className={tone}>
              {direction} · スコア {signed(result.score, 0)}
            </span>
          </div>
          {!result.isCurrentDate && (
            <p className={styles.notice}>
              当日の日足がまだないため、直近取引日（{result.tradingDate}
              ）のデータで再計算しています。
            </p>
          )}
          {result.startPriceSource === "close" && (
            <p className={styles.notice}>
              始値が未取得のため、分析時点の価格を基準に計算しています。
            </p>
          )}
          <dl className={styles.values}>
            <div>
              <dt>
                {result.startPriceSource === "open"
                  ? "始値"
                  : "基準価格（始値未取得）"}
              </dt>
              <dd>¥{number(result.startPrice)}</dd>
            </div>
            <div>
              <dt>予想終値</dt>
              <dd className={tone}>¥{number(result.predictedClose)}</dd>
            </div>
            <div>
              <dt>
                {result.startPriceSource === "open"
                  ? "始値からの予想変化"
                  : "基準価格からの予想変化"}
              </dt>
              <dd className={tone}>
                {signed(result.changePercent)}
                <small>%</small>
              </dd>
            </div>
          </dl>
          <details className={styles.details}>
            <summary>計算の根拠を見る</summary>
            <dl className={styles.indicators}>
              <div>
                <dt>EMA5 / EMA20</dt>
                <dd>
                  {number(result.indicators.ema5)} /{" "}
                  {number(result.indicators.ema20)} 円
                </dd>
                <p>トレンド点数 {signed(result.ruleScores.trend, 0)}</p>
              </div>
              <div>
                <dt>RSI（14）</dt>
                <dd>{number(result.indicators.rsi14, 1)}</dd>
                <p>RSI点数 {signed(result.ruleScores.rsi, 0)}</p>
              </div>
              <div>
                <dt>MACD / シグナル</dt>
                <dd>
                  {number(result.indicators.macd, 4)} /{" "}
                  {number(result.indicators.macdSignal, 4)}
                </dd>
                <p>MACD点数 {signed(result.ruleScores.macd, 0)}</p>
              </div>
              <div>
                <dt>ATR（14）</dt>
                <dd>
                  {result.indicators.atr14 === null
                    ? "—"
                    : `${number(result.indicators.atr14)} 円`}
                </dd>
                <p>価格比 {number(result.indicators.atrPercent)}%</p>
              </div>
              <div>
                <dt>分析時点の価格</dt>
                <dd>{number(result.analysisClose)} 円</dd>
                <p>取引中は日足の途中値</p>
              </div>
              <div>
                <dt>分析期間</dt>
                <dd>
                  {result.historyRange === "1mo" ? "1か月" : "3か月"} /{" "}
                  {result.dataPoints} 本
                </dd>
                <p>18本未満の場合は3か月を取得</p>
              </div>
            </dl>
          </details>
          <p className={styles.footnote}>
            分割・配当調整後の価格を使用。分析時点の高値・安値・終値（取引中は途中値）も計算に含みます。取引終了後の実行は対象日の再分析です。
          </p>
          <p className={styles.footnote}>
            分析日時{" "}
            {new Date(result.analyzedAt).toLocaleString("ja-JP", {
              timeZone: "Asia/Tokyo",
            })}{" "}
            JST
          </p>
        </div>
      )}
    </section>
  );
}
