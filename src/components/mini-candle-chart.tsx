"use client";
import { BRAND_COLORS } from "@/lib/brand-theme";

import { useId, useMemo, useState } from "react";

export type CandleRaw = {
  high: number;
  low: number;
  open: number;
  close: number;
  ts: number;
  [key: string]: unknown;
};

type Props = {
  data?: CandleRaw[];
  width?: number;
  height?: number;
};

export default function MiniCandleChart({
  data = [],
  width = 176,
  height = 76,
}: Props) {
  const gradientId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const chart = useMemo(() => {
    const points = data
      .filter((item) => Number.isFinite(item.ts) && Number.isFinite(item.close))
      .sort((a, b) => a.ts - b.ts)
      .slice(-30);
    if (!points.length) return null;
    const closes = points.map((item) => item.close);
    const low = Math.min(...closes);
    const high = Math.max(...closes);
    const padding = Math.max((high - low) * 0.18, Math.abs(high) * 0.005, 0.01);
    const minimum = low - padding;
    const range = high - low + padding * 2;
    const left = 8;
    const right = width - 8;
    const top = 17;
    const bottom = height - 10;
    const coords = points.map((item, index) => ({
      item,
      x: left + (index / Math.max(points.length - 1, 1)) * (right - left),
      y: bottom - ((item.close - minimum) / range) * (bottom - top),
    }));
    const line = coords
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    const area = `${line} L${coords.at(-1)!.x.toFixed(1)} ${bottom} L${left} ${bottom} Z`;
    return {
      coords,
      line,
      area,
      bottom,
      positive: closes.at(-1)! >= closes[0],
    };
  }, [data, width, height]);

  if (!chart) return <span className="sparkline-empty">データなし</span>;
  const color = chart.positive ? "#5ce0bd" : "#fb8394";
  const selected = chart.coords[hover ?? chart.coords.length - 1];
  const latest = chart.coords.at(-1)!;
  const date = new Date(selected.item.ts * 1000).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });

  return (
    <div
      className="watchlist-sparkline"
      style={{ width, height }}
      role="img"
      aria-label={`直近${chart.coords.length}営業日の終値推移。最終値${latest.item.close.toLocaleString("ja-JP")}円。${chart.positive ? "上昇" : "下落"}。`}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * width;
        const nearest = chart.coords.reduce(
          (best, point, i) =>
            Math.abs(point.x - x) < Math.abs(chart.coords[best].x - x)
              ? i
              : best,
          0,
        );
        setHover(nearest);
      }}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M8 ${chart.bottom} H${width - 8}`}
          stroke={BRAND_COLORS.grid}
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <path d={chart.area} fill={`url(#${gradientId})`} />
        <path
          d={chart.line}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover !== null && (
          <path
            d={`M${selected.x} 16 V${chart.bottom}`}
            stroke={color}
            strokeOpacity="0.55"
            strokeDasharray="2 3"
          />
        )}
        <circle
          cx={selected.x}
          cy={selected.y}
          r={hover === null ? 3.5 : 4.5}
          fill={color}
          stroke={BRAND_COLORS.panel}
          strokeWidth="2"
        />
      </svg>
      <span className="sparkline-period">30D</span>
      {hover !== null && (
        <span className="sparkline-tooltip">
          {date} · ¥{selected.item.close.toLocaleString("ja-JP")}
        </span>
      )}
    </div>
  );
}
