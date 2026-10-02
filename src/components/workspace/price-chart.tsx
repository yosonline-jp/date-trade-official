"use client";
import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export type PricePoint = { time: number; close: number };
export function PriceChart({
  points,
  label = "終値",
}: {
  points: PricePoint[];
  label?: string;
}) {
  const [range, setRange] = useState(90);
  const gradient = useId().replace(/:/g, "");
  const data = useMemo(() => {
    const sorted = points
      .filter((p) => Number.isFinite(p.close) && Number.isFinite(p.time))
      .sort((a, b) => a.time - b.time);
    const last = sorted.at(-1)?.time ?? 0;
    return sorted.filter((p) => range === 0 || p.time >= last - range * 86400);
  }, [points, range]);
  const positive =
    data.length < 2 || data[data.length - 1].close >= data[0].close;
  const color = positive ? "#5ce0bd" : "#fb8394";
  return (
    <div>
      <div className="chart-toolbar">
        <span>
          <i style={{ background: color }} />
          {label}
          <small>JPY</small>
        </span>
        <div role="group" aria-label="チャート表示期間">
          {[
            [30, "1M"],
            [90, "3M"],
            [180, "6M"],
            [365, "1Y"],
            [0, "ALL"],
          ].map(([days, title]) => (
            <button
              key={days}
              className={range === days ? "selected" : ""}
              aria-pressed={range === days}
              onClick={() => setRange(Number(days))}
            >
              {title}
            </button>
          ))}
        </div>
      </div>
      {data.length ? (
        <div
          className="price-chart"
          role="img"
          aria-label={`${label}の推移。${data.length}件。最終値${data.at(-1)?.close.toLocaleString("ja-JP")}円`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 20, right: 4, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#253344"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="time"
                minTickGap={45}
                tickFormatter={(v) =>
                  new Date(v * 1000).toLocaleDateString("ja-JP", {
                    month: "short",
                    day: "numeric",
                    timeZone: "Asia/Tokyo",
                  })
                }
                tick={{ fill: "#7e91a8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                orientation="right"
                domain={["auto", "auto"]}
                tickFormatter={(v) => v.toLocaleString("ja-JP")}
                tick={{ fill: "#7e91a8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={66}
              />
              <Tooltip
                labelFormatter={(v) =>
                  new Date(Number(v) * 1000).toLocaleDateString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })
                }
                formatter={(v) => [
                  `¥${Number(v).toLocaleString("ja-JP")}`,
                  label,
                ]}
                contentStyle={{
                  background: "#142031",
                  border: "1px solid #304155",
                  borderRadius: 10,
                  color: "#e8f0fa",
                }}
              />
              <Area
                type="linear"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradient})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty">
          この期間のチャートデータはありません。
        </div>
      )}
      <p className="chart-footnote">
        保存済みデータを表示 · 期間は最終データ日を基準に集計
      </p>
    </div>
  );
}
