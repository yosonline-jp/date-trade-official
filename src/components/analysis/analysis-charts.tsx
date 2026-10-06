"use client";
import { useMemo } from "react";
import { BRAND_COLORS } from "@/lib/brand-theme";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IndicatorPoint, Projection } from "@/lib/analysis/types";
const date = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});
const colors = [BRAND_COLORS.accent, "#e1b767", "#ee8798", "#8bbaff"];
export default function AnalysisCharts({
  points,
  projections,
  price,
}: {
  points: IndicatorPoint[];
  projections: Projection[];
  price: number;
}) {
  const groups = [
    {
      title: "株価・EMA20・EMA50・VWAP",
      keys: ["close", "ema20", "ema50", "vwap"],
      labels: ["株価", "EMA20", "EMA50", "VWAP"],
    },
    { title: "RCI(7)", keys: ["rci"], labels: ["RCI"] },
    { title: "KDJ", keys: ["k", "d", "j"], labels: ["K", "D", "J"] },
    { title: "RSI(14)", keys: ["rsi"], labels: ["RSI"] },
  ];
  const bands = useMemo(
    () => projections.filter((p) => p.expectedPrice !== null),
    [projections],
  );
  const minimum = Math.min(price, ...bands.map((p) => p.lowerPrice!)),
    maximum = Math.max(price, ...bands.map((p) => p.upperPrice!));
  const x = (value: number) =>
    100 + ((value - minimum) / Math.max(maximum - minimum, 1)) * 570;
  return (
    <div>
      {groups.map((group, index) => (
        <div key={group.title} style={{ marginTop: 20 }}>
          <h3>{group.title}</h3>
          <p style={{ color: BRAND_COLORS.muted, fontSize: 11 }}>
            {group.labels.map((label, i) => (
              <span key={label} style={{ color: colors[i], marginRight: 14 }}>
                {label}
              </span>
            ))}
          </p>
          <div
            style={{ width: "100%", height: index === 0 ? 260 : 150 }}
            role="img"
            aria-label={group.title}
          >
            <ResponsiveContainer>
              <LineChart
                data={points}
                margin={{ top: 15, right: 10, bottom: 5, left: 0 }}
              >
                <CartesianGrid
                  stroke={BRAND_COLORS.grid}
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="time"
                  tickFormatter={(v) => date.format(new Date(Number(v) * 1000))}
                  minTickGap={45}
                  tick={{ fill: BRAND_COLORS.muted, fontSize: 10 }}
                />
                <YAxis
                  domain={
                    index === 1
                      ? [-100, 100]
                      : index === 3
                        ? [0, 100]
                        : ["auto", "auto"]
                  }
                  tick={{ fill: BRAND_COLORS.muted, fontSize: 10 }}
                  width={60}
                  tickFormatter={(v) =>
                    Number(v).toLocaleString("ja-JP", {
                      maximumFractionDigits: 1,
                    })
                  }
                />
                <Tooltip
                  labelFormatter={(v) =>
                    date.format(new Date(Number(v) * 1000))
                  }
                  formatter={(value) =>
                    value == null
                      ? "—"
                      : Number(value).toLocaleString("ja-JP", {
                          maximumFractionDigits: 2,
                        })
                  }
                  contentStyle={{
                    background: BRAND_COLORS.panel,
                    border: `1px solid ${BRAND_COLORS.border}`,
                    borderRadius: 8,
                    color: BRAND_COLORS.text,
                  }}
                />
                {index === 1 &&
                  [-80, 0, 80].map((y) => (
                    <ReferenceLine
                      key={y}
                      y={y}
                      stroke={BRAND_COLORS.muted}
                      strokeDasharray="3 4"
                    />
                  ))}
                {group.keys.map((key, i) => (
                  <Line
                    key={key}
                    dataKey={key}
                    name={group.labels[i]}
                    stroke={colors[i]}
                    dot={false}
                    strokeWidth={index === 0 && i === 0 ? 2 : 1.5}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
      {bands.length > 0 && (
        <div>
          <h3>RCI到達時の価格帯（1分足）</h3>
          <svg
            viewBox={`0 0 800 ${bands.length * 34 + 55}`}
            role="img"
            aria-label="現在価格とRCIの統計的予想価格帯"
            style={{ width: "100%", marginTop: 12 }}
          >
            <line
              x1={x(price)}
              x2={x(price)}
              y1={12}
              y2={bands.length * 34 + 10}
              stroke="#e1b767"
              strokeDasharray="4 4"
            />
            {bands.map((p, i) => (
              <g key={p.rci}>
                <text
                  x={0}
                  y={i * 34 + 26}
                  fill={BRAND_COLORS.muted}
                  fontSize={12}
                >
                  RCI {p.rci}
                </text>
                <rect
                  x={x(p.lowerPrice!)}
                  y={i * 34 + 13}
                  width={Math.max(2, x(p.upperPrice!) - x(p.lowerPrice!))}
                  height={17}
                  fill={BRAND_COLORS.accent}
                  opacity={0.25}
                />
                <circle
                  cx={x(p.expectedPrice!)}
                  cy={i * 34 + 21}
                  r={4}
                  fill={BRAND_COLORS.accent}
                />
                <text
                  x={690}
                  y={i * 34 + 26}
                  fill={BRAND_COLORS.text}
                  fontSize={11}
                >
                  {p.expectedPrice!.toLocaleString("ja-JP", {
                    maximumFractionDigits: 2,
                  })}
                  円
                </text>
              </g>
            ))}
            <text
              x={x(price)}
              y={bands.length * 34 + 38}
              fill="#e1b767"
              fontSize={11}
              textAnchor="middle"
            >
              現在 {price.toLocaleString("ja-JP")}円
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}
