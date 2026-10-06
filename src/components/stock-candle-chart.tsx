"use client";
import { useMemo, useState } from "react";
import { BRAND_COLORS } from "@/lib/brand-theme";
export type CandleRaw = {
  high: number;
  low: number;
  open: number;
  close: number;
  ts: number;
  [key: string]: unknown;
};
interface CandleChartProps {
  data?: CandleRaw[];
  width?: number | `${number}%`;
  height?: number;
}
const W = 1000,
  H = 400,
  left = 12,
  right = 85,
  top = 18,
  bottom = 32;
const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Tokyo",
});
const date = (ts: number) => dateFormatter.format(new Date(ts * 1000));
export default function CandleChart({
  data = [],
  height = 400,
}: CandleChartProps) {
  const [period, setPeriod] = useState(90);
  const [hover, setHover] = useState<number | null>(null);
  const [showAverage, setShowAverage] = useState(true);
  const values = useMemo(
    () =>
      data
        .filter((p) =>
          [p.ts, p.open, p.close, p.high, p.low].every(Number.isFinite),
        )
        .sort((a, b) => a.ts - b.ts),
    [data],
  );
  const averages = useMemo(
    () =>
      values.map((_, i) =>
        i < 24
          ? null
          : values.slice(i - 24, i + 1).reduce((sum, c) => sum + c.close, 0) /
            25,
      ),
    [values],
  );
  const chart = useMemo(() => {
    const filtered = period ? values.slice(-period) : values;
    if (!filtered.length) return null;
    const low = Math.min(...filtered.map((p) => p.low));
    const high = Math.max(...filtered.map((p) => p.high));
    const span = Math.max(high - low, 1);
    const min = low - span * 0.08,
      max = high + span * 0.08;
    const plotW = W - left - right,
      plotH = H - top - bottom;
    const y = (v: number) => top + ((max - v) / (max - min)) * plotH;
    const step = plotW / filtered.length;
    const x = (i: number) => left + (i + 0.5) * step;
    const average = averages.slice(-filtered.length);
    const averagePath = average
      .map((v, i) =>
        v === null
          ? ""
          : `${i === 0 || average[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`,
      )
      .join(" ");
    const grid = (
      <>
        {Array.from({ length: 6 }, (_, i) => {
          const value = min + ((max - min) * i) / 5;
          return (
            <g key={i}>
              <line
                x1={left}
                x2={W - right}
                y1={y(value)}
                y2={y(value)}
                stroke={BRAND_COLORS.grid}
                strokeDasharray="3 6"
              />
              <text
                x={W - right + 12}
                y={y(value) + 4}
                fill={BRAND_COLORS.muted}
                fontSize={12}
              >
                {value.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
              </text>
            </g>
          );
        })}
      </>
    );
    const candles = (
      <>
        {filtered.map((p, i) => {
          const color =
            p.close >= p.open ? BRAND_COLORS.positive : BRAND_COLORS.negative;
          return (
            <g key={`${p.ts}-${i}`}>
              <title>
                {`${date(p.ts)} 始値 ${p.open} 高値 ${p.high} 安値 ${p.low} 終値 ${p.close}`}
              </title>
              <line
                x1={x(i)}
                x2={x(i)}
                y1={y(p.high)}
                y2={y(p.low)}
                stroke={color}
              />
              <rect
                x={x(i) - Math.max(step * 0.6, 1) / 2}
                y={Math.min(y(p.open), y(p.close))}
                width={Math.max(step * 0.6, 1)}
                height={Math.max(Math.abs(y(p.open) - y(p.close)), 1)}
                fill={color}
              />
            </g>
          );
        })}
      </>
    );
    const dates = (
      <>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => {
          const idx = Math.min(
            filtered.length - 1,
            Math.floor((filtered.length - 1) * v),
          );
          return (
            <text
              key={i}
              x={x(idx)}
              y={H - 8}
              fill={BRAND_COLORS.muted}
              fontSize={12}
              textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
            >
              {date(filtered[idx].ts)}
            </text>
          );
        })}
      </>
    );
    return { filtered, step, x, averagePath, grid, candles, dates };
  }, [values, period, averages]);
  if (!chart)
    return <div className="chart-empty">チャートデータはありません。</div>;
  const { filtered, step, x, averagePath, grid, candles, dates } = chart;
  const selected =
    filtered[Math.min(hover ?? filtered.length - 1, filtered.length - 1)];
  return (
    <section className="terminal-panel">
      <div className="chart-toolbar">
        <span>
          ローソク足 <small>JPY</small>
        </span>
        <div role="group" aria-label="表示本数">
          {[30, 90, 180, 0].map((p) => (
            <button
              key={p}
              aria-pressed={period === p}
              className={period === p ? "selected" : ""}
              onClick={() => {
                setPeriod(p);
                setHover(null);
              }}
            >
              {p ? `${p}本` : "全期間"}
            </button>
          ))}
        </div>
      </div>
      <div className="candle-legend">
        <span>{date(selected.ts)}</span>
        <span>始 {selected.open.toLocaleString()}</span>
        <span>高 {selected.high.toLocaleString()}</span>
        <span>安 {selected.low.toLocaleString()}</span>
        <span
          className={selected.close >= selected.open ? "positive" : "negative"}
        >
          終 {selected.close.toLocaleString()}
        </span>
        <button
          aria-pressed={showAverage}
          onClick={() => setShowAverage(!showAverage)}
          style={{ color: showAverage ? "#e1b767" : BRAND_COLORS.muted }}
        >
          MA25 {showAverage ? "ON" : "OFF"}
        </button>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%",
          height,
          maxHeight: "55vw",
          minHeight: 230,
          touchAction: "pan-y",
        }}
        role="img"
        aria-label="株価ローソク足チャート。緑は陽線、赤は陰線。"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHover(
            Math.max(
              0,
              Math.min(
                filtered.length - 1,
                Math.floor(
                  (((e.clientX - rect.left) / rect.width) * W - left) / step,
                ),
              ),
            ),
          );
        }}
        onPointerLeave={() => setHover(null)}
      >
        {grid}
        {candles}
        {showAverage && (
          <path
            d={averagePath}
            fill="none"
            stroke="#e1b767"
            strokeWidth={1.5}
          />
        )}
        {dates}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={top}
            y2={H - bottom}
            stroke={BRAND_COLORS.muted}
            strokeDasharray="4 4"
          />
        )}
      </svg>
      <p className="chart-footnote">
        保存済み株価 · 緑：陽線 / 赤：陰線 · MA25：25本単純移動平均
      </p>
    </section>
  );
}
