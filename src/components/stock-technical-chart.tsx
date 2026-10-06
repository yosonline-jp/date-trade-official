"use client";

import { useMemo, useState } from "react";
import { BRAND_COLORS } from "@/lib/brand-theme";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TechnicalPoint } from "@/lib/analysis/stock-technicals";

export type TechnicalChartKind =
  | "price"
  | "rsi"
  | "rci"
  | "macd"
  | "stochastic"
  | "kdj"
  | "dmi"
  | "atr"
  | "cci"
  | "mfi"
  | "williams"
  | "volume"
  | "obv"
  | "roc";
type Series = {
  key: keyof TechnicalPoint;
  label: string;
  color: string;
  bar?: boolean;
  right?: boolean;
};
const colors = [
  BRAND_COLORS.accent,
  "#e1b767",
  "#ee8798",
  "#8bbaff",
  "#b69af0",
];
const definitions: Record<
  Exclude<TechnicalChartKind, "price">,
  {
    title: string;
    series: Series[];
    references?: number[];
    domain?: [number, number];
  }
> = {
  rsi: {
    title: "RSI(14)",
    series: [{ key: "rsi", label: "RSI", color: colors[0] }],
    references: [30, 70],
    domain: [0, 100],
  },
  rci: {
    title: "RCI(7)・RCI(26)",
    series: [
      { key: "rci", label: "RCI7", color: colors[0] },
      { key: "rci26", label: "RCI26", color: colors[1] },
    ],
    references: [-80, 0, 80],
    domain: [-100, 100],
  },
  macd: {
    title: "MACD(12,26,9)",
    series: [
      { key: "macd", label: "MACD", color: colors[0] },
      { key: "macdSignal", label: "シグナル", color: colors[1] },
      {
        key: "macdHistogram",
        label: "ヒストグラム",
        color: colors[3],
        bar: true,
      },
    ],
    references: [0],
  },
  stochastic: {
    title: "ストキャスティクス(9,3)",
    series: [
      { key: "stochasticK", label: "%K", color: colors[0] },
      { key: "stochasticD", label: "%D", color: colors[1] },
    ],
    references: [20, 80],
    domain: [0, 100],
  },
  kdj: {
    title: "KDJ(9)",
    series: [
      { key: "k", label: "K", color: colors[0] },
      { key: "d", label: "D", color: colors[1] },
      { key: "j", label: "J", color: colors[2] },
    ],
    references: [20, 80],
  },
  dmi: {
    title: "ADX・DMI(14)",
    series: [
      { key: "adx", label: "ADX", color: colors[1] },
      { key: "plusDI", label: "+DI", color: BRAND_COLORS.positive },
      { key: "minusDI", label: "−DI", color: colors[2] },
    ],
    references: [20, 25],
    domain: [0, 100],
  },
  atr: {
    title: "ATR(14) · 円",
    series: [{ key: "atr", label: "ATR", color: colors[1] }],
  },
  cci: {
    title: "CCI(20)",
    series: [{ key: "cci", label: "CCI", color: colors[0] }],
    references: [-100, 0, 100],
  },
  mfi: {
    title: "MFI(14)",
    series: [{ key: "mfi", label: "MFI", color: colors[0] }],
    references: [20, 80],
    domain: [0, 100],
  },
  williams: {
    title: "Williams %R(14)",
    series: [{ key: "williamsR", label: "Williams %R", color: colors[0] }],
    references: [-80, -20],
    domain: [-100, 0],
  },
  volume: {
    title: "出来高・直前20本平均比",
    series: [
      { key: "volume", label: "出来高（株）", color: colors[0], bar: true },
      {
        key: "volumeRatio",
        label: "平均比（倍）",
        color: colors[1],
        right: true,
      },
    ],
  },
  obv: {
    title: "OBV · 株",
    series: [{ key: "obv", label: "OBV", color: colors[0] }],
  },
  roc: {
    title: "ROC(10) · %",
    series: [{ key: "roc", label: "ROC", color: colors[0] }],
    references: [0],
  },
};
const overlayOptions: Series[] = [
  { key: "ema9", label: "EMA9", color: "#b69af0" },
  { key: "ema20", label: "EMA20", color: colors[1] },
  { key: "ema50", label: "EMA50", color: colors[2] },
  { key: "sma25", label: "SMA25", color: "#bdc7d6" },
  { key: "vwap", label: "VWAP", color: colors[3] },
  { key: "bbUpper", label: "BB上限", color: "#748eab" },
  { key: "bbLower", label: "BB下限", color: "#748eab" },
];
const day = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Tokyo",
});
const minute = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

export default function StockTechnicalChart({
  points,
  kind,
  intraday,
}: {
  points: TechnicalPoint[];
  kind: TechnicalChartKind;
  intraday: boolean;
}) {
  const [overlays, setOverlays] = useState<(keyof TechnicalPoint)[]>([
    "ema20",
    "ema50",
    "vwap",
    "bbUpper",
    "bbLower",
  ]);
  const config = useMemo<{
    title: string;
    series: Series[];
    references?: number[];
    domain?: [number, number];
  }>(
    () =>
      kind === "price"
        ? {
            title: "株価・移動平均・ボリンジャーバンド",
            series: [
              { key: "close" as const, label: "終値", color: colors[0] },
              ...overlayOptions.filter(
                (s) =>
                  overlays.includes(s.key) && (intraday || s.key !== "vwap"),
              ),
            ],
            references: [],
            domain: undefined,
          }
        : definitions[kind],
    [kind, overlays, intraday],
  );
  const valid = points.some((p) => config.series.some((s) => p[s.key] != null));
  const formatter = intraday ? minute : day;
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        {config.title}
      </h3>
      {kind === "price" && (
        <div
          role="group"
          aria-label="株価チャートの重ね合わせ指標"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 18px",
            marginBottom: 16,
          }}
        >
          {overlayOptions
            .filter((s) => intraday || s.key !== "vwap")
            .map((s) => (
              <label
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: s.color,
                }}
              >
                <input
                  type="checkbox"
                  checked={overlays.includes(s.key)}
                  onChange={(event) =>
                    setOverlays((value) =>
                      event.target.checked
                        ? [...value, s.key]
                        : value.filter((key) => key !== s.key),
                    )
                  }
                  style={{ accentColor: BRAND_COLORS.accent }}
                />
                {s.label}
              </label>
            ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 11,
          marginBottom: 8,
        }}
      >
        {config.series.map((s) => (
          <span style={{ color: s.color }} key={s.key}>
            {s.label}
          </span>
        ))}
      </div>
      {valid ? (
        <div
          style={{ width: "100%", height: 270 }}
          role="img"
          aria-label={`${config.title}の指標チャート`}
        >
          <ResponsiveContainer>
            <ComposedChart
              data={points}
              margin={{ top: 12, right: 8, bottom: 6, left: 0 }}
            >
              <CartesianGrid
                stroke={BRAND_COLORS.grid}
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                minTickGap={48}
                tickFormatter={(v) =>
                  formatter.format(new Date(Number(v) * 1000))
                }
                tick={{ fill: BRAND_COLORS.muted, fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                width={62}
                domain={
                  config.domain ??
                  (kind === "volume" ? [0, "auto"] : ["auto", "auto"])
                }
                tickFormatter={(v) =>
                  Number(v).toLocaleString("ja-JP", {
                    maximumFractionDigits: 1,
                    notation:
                      kind === "volume" || kind === "obv"
                        ? "compact"
                        : "standard",
                  })
                }
                tick={{ fill: BRAND_COLORS.muted, fontSize: 10 }}
              />
              {kind === "volume" && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={38}
                  domain={[0, "auto"]}
                  tick={{ fill: colors[1], fontSize: 10 }}
                />
              )}
              <Tooltip
                labelFormatter={(v) =>
                  formatter.format(new Date(Number(v) * 1000))
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
              {config.references?.map((y) => (
                <ReferenceLine
                  key={y}
                  yAxisId="left"
                  y={y}
                  stroke={BRAND_COLORS.muted}
                  strokeDasharray="3 4"
                />
              ))}
              {config.series.map((s) =>
                s.bar ? (
                  <Bar
                    key={s.key}
                    yAxisId={s.right ? "right" : "left"}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    opacity={0.6}
                    isAnimationActive={false}
                  />
                ) : (
                  <Line
                    key={s.key}
                    yAxisId={s.right ? "right" : "left"}
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    dot={false}
                    connectNulls={false}
                    strokeWidth={1.7}
                    isAnimationActive={false}
                  />
                ),
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p style={{ color: BRAND_COLORS.muted, fontSize: 12 }}>
          この指標の計算に必要なデータが不足しています。
        </p>
      )}
      <p style={{ color: BRAND_COLORS.muted, fontSize: 10, marginTop: 8 }}>
        直近{points.length}本 · 日本時間 ·
        必要な期間に満たない部分は描画しません
      </p>
    </div>
  );
}
