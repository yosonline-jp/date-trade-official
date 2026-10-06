"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BRAND_COLORS } from "@/lib/brand-theme";
import {
  clampViewport,
  heikinAshi,
  measureChart,
  movingAverage,
  panViewport,
  zoomViewport,
  type ChartViewport,
} from "@/lib/analysis/chart-workspace";
import type {
  TechnicalLevels,
  TechnicalPoint,
} from "@/lib/analysis/stock-technicals";
import styles from "./trading-chart.module.css";

type Interval = "1m" | "5m" | "15m" | "daily" | "weekly";
export type ChartPreset = "standard" | "daytrade" | "trend";
type Average = {
  id: string;
  type: "sma" | "ema";
  period: number;
  color: string;
  on: boolean;
  custom?: boolean;
};
type PriceStyle = "candle" | "line" | "heikin";
type Extra = "bb" | "vwap" | "previous" | "pivot" | "current";
type Panel = "volume" | "rsi" | "macd" | "rci" | "stochastic" | "dmi" | "atr";
type AuxiliaryPanel = Exclude<Panel, "volume" | "rsi" | "macd">;
const AUXILIARY_PANELS: Record<
  AuxiliaryPanel,
  {
    title: string;
    references: number[];
    series: {
      key:
        | "rci"
        | "rci26"
        | "stochasticK"
        | "stochasticD"
        | "adx"
        | "plusDI"
        | "minusDI"
        | "atr";
      name: string;
      color: string;
    }[];
  }
> = {
  rci: {
    title: "RCI(7,26) · 指数",
    references: [-80, 80],
    series: [
      { key: "rci", name: "RCI7", color: BRAND_COLORS.accent },
      { key: "rci26", name: "RCI26", color: "#e3b465" },
    ],
  },
  stochastic: {
    title: "ストキャスティクス(9,3) · %",
    references: [20, 80],
    series: [
      { key: "stochasticK", name: "Stoch%K", color: "#63dbe8" },
      { key: "stochasticD", name: "Stoch%D", color: "#e7ba79" },
    ],
  },
  dmi: {
    title: "ADX/DMI(14) · 指数",
    references: [25],
    series: [
      { key: "adx", name: "ADX", color: "#ba9bea" },
      { key: "plusDI", name: "+DI", color: "#62d7b2" },
      { key: "minusDI", name: "-DI", color: "#ef899b" },
    ],
  },
  atr: {
    title: "ATR(14) · 円",
    references: [],
    series: [{ key: "atr", name: "ATR", color: "#f8b65c" }],
  },
};
type Props = {
  points: TechnicalPoint[];
  interval: Interval;
  levels: TechnicalLevels;
  initialPreset?: ChartPreset;
  height?: number;
};
const DEFAULT_AVERAGES: Average[] = [
  { id: "MA5", type: "sma", period: 5, color: "#bcb6f8", on: false },
  { id: "MA25", type: "sma", period: 25, color: "#e1b767", on: true },
  { id: "MA75", type: "sma", period: 75, color: "#7eafee", on: false },
  { id: "EMA9", type: "ema", period: 9, color: "#bb93ec", on: false },
  { id: "EMA20", type: "ema", period: 20, color: "#f8b65c", on: false },
  { id: "EMA50", type: "ema", period: 50, color: "#ef899b", on: false },
];
const DEFAULT_EXTRAS: Record<Extra, boolean> = {
  bb: false,
  vwap: false,
  previous: false,
  pivot: false,
  current: true,
};
const DEFAULT_PANELS: Record<Panel, boolean> = {
  volume: true,
  rsi: false,
  macd: false,
  rci: false,
  stochastic: false,
  dmi: false,
  atr: false,
};
function presetSettings(preset: ChartPreset, intraday: boolean) {
  return {
    averages: DEFAULT_AVERAGES.map((average) => ({
      ...average,
      on:
        preset === "standard"
          ? average.id === "MA25"
          : preset === "daytrade"
            ? ["EMA9", "EMA20"].includes(average.id)
            : ["MA5", "MA25", "MA75"].includes(average.id),
    })),
    extras: {
      ...DEFAULT_EXTRAS,
      bb: preset === "daytrade",
      vwap: preset === "daytrade" && intraday,
    },
    panels: {
      ...DEFAULT_PANELS,
      volume: true,
      rsi: preset === "daytrade",
      macd: preset === "trend",
    },
  };
}
const COLORS = [
  "#63dbe8",
  "#ee9be0",
  "#a5d277",
  "#e7ba79",
  "#a1a3f0",
  "#fc9d82",
];
const fmt = (n: number | null | undefined, digits = 2) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("ja-JP", { maximumFractionDigits: digits })
    : "—";
const fullDate = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const shortDate = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "2-digit",
  day: "2-digit",
});
const timeDate = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
const dateLabel = (ts: number, intraday: boolean) =>
  `${shortDate.format(ts * 1000)}${intraday ? ` ${timeDate.format(ts * 1000)}` : ""}`;
function path(
  values: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number,
) {
  let continuous = false;
  return values
    .map((v, i) => {
      if (!finite(v)) {
        continuous = false;
        return "";
      }
      const segment = `${continuous ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`;
      continuous = true;
      return segment;
    })
    .join(" ");
}
function download(content: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bandPath(
  points: TechnicalPoint[],
  x: (i: number) => number,
  y: (v: number) => number,
) {
  const polygons: string[] = [];
  let run: { i: number; upper: number; lower: number }[] = [];
  const flush = () => {
    if (run.length) {
      const upper = run
        .map((p, i) => `${i ? "L" : "M"}${x(p.i)},${y(p.upper)}`)
        .join(" ");
      const lower = [...run]
        .reverse()
        .map((p) => `L${x(p.i)},${y(p.lower)}`)
        .join(" ");
      polygons.push(`${upper} ${lower} Z`);
    }
    run = [];
  };
  points.forEach((p, i) => {
    if (finite(p.bbUpper) && finite(p.bbLower))
      run.push({ i, upper: p.bbUpper, lower: p.bbLower });
    else flush();
  });
  flush();
  return polygons.join(" ");
}

export default function TradingChart({
  points,
  interval,
  levels,
  initialPreset = "standard",
  height = 400,
}: Props) {
  const intraday = interval !== "daily" && interval !== "weekly";
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    view: ChartViewport;
    moved: boolean;
  } | null>(null);
  const clip = useId().replace(/:/g, "");
  const [width, setWidth] = useState(1000);
  const [viewport, setViewport] = useState<ChartViewport>({
    start: Math.max(0, points.length - 90),
    count: Math.min(90, points.length),
  });
  const [period, setPeriod] = useState<number | null>(90);
  const [averages, setAverages] = useState<Average[]>(
    () => presetSettings(initialPreset, intraday).averages,
  );
  const [extras, setExtras] = useState(
    () => presetSettings(initialPreset, intraday).extras,
  );
  const [panels, setPanels] = useState(
    () => presetSettings(initialPreset, intraday).panels,
  );
  const [priceStyle, setPriceStyle] = useState<PriceStyle>("candle");
  const [hover, setHover] = useState<number | null>(null);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const [measure, setMeasure] = useState(false);
  const [measureFrom, setMeasureFrom] = useState<number | null>(null);
  const [measureTo, setMeasureTo] = useState<number | null>(null);
  const [averageType, setAverageType] = useState<"sma" | "ema">("ema");
  const [averagePeriod, setAveragePeriod] = useState("13");
  const [horizontalPrice, setHorizontalPrice] = useState("");
  const [horizontal, setHorizontal] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const hasData = points.length > 0;
  const view = clampViewport(points.length, viewport);
  const shown = useMemo(
    () => points.slice(view.start, view.start + view.count),
    [points, view.start, view.count],
  );
  const selectedIndex = Math.max(
    0,
    Math.min(shown.length - 1, hover ?? shown.length - 1),
  );
  const selected = shown[selectedIndex];
  const ha = useMemo(() => heikinAshi(points), [points]);
  const averageSeries = useMemo(() => {
    const fixed: Record<
      string,
      "sma5" | "sma25" | "sma75" | "ema9" | "ema20" | "ema50"
    > = {
      MA5: "sma5",
      MA25: "sma25",
      MA75: "sma75",
      EMA9: "ema9",
      EMA20: "ema20",
      EMA50: "ema50",
    };
    return averages.map((a) => ({
      ...a,
      values: fixed[a.id]
        ? points.map((p) => p[fixed[a.id]])
        : movingAverage(points, a.period, a.type),
    }));
  }, [points, averages]);
  const measured = useMemo(
    () =>
      measureFrom === null || measureTo === null
        ? null
        : measureChart(points, measureFrom, measureTo),
    [points, measureFrom, measureTo],
  );

  useEffect(() => {
    setViewport({
      start: Math.max(0, points.length - 90),
      count: Math.min(90, points.length),
    });
    setPeriod(90);
    setHover(null);
    setPointerY(null);
    setMeasureFrom(null);
    setMeasureTo(null);
  }, [points, interval]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, Math.floor(entry.contentRect.width))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasData]);
  useEffect(() => {
    const update = () =>
      setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const chart = useMemo(() => {
    if (!shown.length) return null;
    const left = 14,
      right = width < 500 ? 63 : 76,
      top = 24;
    const priceHeight = width < 680 ? Math.min(height, 300) : height;
    const priceBottom = priceHeight - 20;
    const plotWidth = width - left - right;
    const step = plotWidth / shown.length;
    const x = (i: number) => left + (i + 0.5) * step;
    const priceBars =
      priceStyle === "heikin"
        ? ha.slice(view.start, view.start + view.count)
        : shown;
    const lines = averageSeries
      .filter((a) => a.on)
      .map((a) => ({
        id: a.id,
        color: a.color,
        values: a.values.slice(view.start, view.start + view.count),
      }));
    if (extras.bb) {
      lines.push(
        { id: "BB上限", color: "#7f9bb9", values: shown.map((p) => p.bbUpper) },
        {
          id: "BB中心",
          color: "#687f99",
          values: shown.map((p) => p.bbMiddle),
        },
        { id: "BB下限", color: "#7f9bb9", values: shown.map((p) => p.bbLower) },
      );
    }
    if (intraday && extras.vwap)
      lines.push({
        id: "VWAP",
        color: "#7fb4ff",
        values: shown.map((p) => p.vwap),
      });
    const priceValues = priceBars.flatMap((p) => [p.high, p.low]);
    for (const line of lines)
      for (const value of line.values)
        if (finite(value)) priceValues.push(value);
    const high = Math.max(...priceValues),
      low = Math.min(...priceValues);
    const span = Math.max(high - low, Math.abs(high) * 0.002, 0.01);
    const min = low - span * 0.08,
      max = high + span * 0.08;
    const y = (v: number) =>
      top + ((max - v) / (max - min)) * (priceBottom - top);
    const inverseY = (v: number) =>
      max - ((v - top) / (priceBottom - top)) * (max - min);
    let bottom = priceHeight;
    const panes: {
      kind: Panel;
      top: number;
      bottom: number;
      min: number;
      max: number;
      y: (n: number) => number;
    }[] = [];
    for (const kind of [
      "volume",
      "rsi",
      "macd",
      "rci",
      "stochastic",
      "dmi",
      "atr",
    ] as Panel[]) {
      if (!panels[kind]) continue;
      const paneTop = bottom + 25,
        paneBottom = bottom + (kind === "volume" ? 105 : 130);
      const vals = shown
        .flatMap((p) =>
          kind === "volume"
            ? [p.volume]
            : kind === "rsi"
              ? [p.rsi]
              : kind === "macd"
                ? [p.macd, p.macdSignal, p.macdHistogram]
                : AUXILIARY_PANELS[kind].series.map((series) => p[series.key]),
        )
        .filter(finite);
      const rawMin =
        kind === "macd" ? Math.min(0, ...vals) : kind === "rci" ? -100 : 0;
      const rawMax = ["rsi", "rci", "stochastic", "dmi"].includes(kind)
        ? 100
        : Math.max(kind === "volume" || kind === "atr" ? 1 : 0.01, ...vals);
      const pad =
        kind === "macd"
          ? Math.max(rawMax - rawMin, 0.01) * 0.12
          : kind === "atr"
            ? rawMax * 0.12
            : 0;
      const paneMin = kind === "macd" ? rawMin - pad : rawMin,
        paneMax = rawMax + pad;
      panes.push({
        kind,
        top: paneTop,
        bottom: paneBottom,
        min: paneMin,
        max: paneMax,
        y: (n) =>
          paneTop +
          ((paneMax - n) / (paneMax - paneMin)) * (paneBottom - paneTop),
      });
      bottom = paneBottom + 12;
    }
    const totalHeight = bottom + 36;
    return {
      left,
      right,
      top,
      priceHeight,
      priceBottom,
      plotWidth,
      step,
      x,
      y,
      inverseY,
      min,
      max,
      lines,
      priceBars,
      panes,
      totalHeight,
    };
  }, [
    shown,
    width,
    height,
    priceStyle,
    ha,
    view.start,
    view.count,
    averageSeries,
    extras,
    intraday,
    panels,
  ]);

  const staticPlot = useMemo(() => {
    if (!chart) return null;
    const { x, y, left, right, top, priceBottom, step, min, max, panes } =
      chart;
    const priceTicks = width < 500 ? 4 : 6;
    const reference = [
      ...(extras.previous
        ? [
            [
              interval === "weekly" ? "前週高値" : "前日高値",
              levels.previousHigh,
            ],
            [
              interval === "weekly" ? "前週安値" : "前日安値",
              levels.previousLow,
            ],
          ]
        : []),
      ...(extras.pivot
        ? [
            ["P", levels.pivot],
            ["R1", levels.r1],
            ["R2", levels.r2],
            ["S1", levels.s1],
            ["S2", levels.s2],
          ]
        : []),
      ...(extras.current ? [["現在値", points.at(-1)?.close]] : []),
    ];
    return (
      <>
        <defs>
          <clipPath id={`${clip}-price`}>
            <rect
              x={left}
              y={top}
              width={chart.plotWidth}
              height={priceBottom - top}
            />
          </clipPath>
        </defs>
        {Array.from({ length: priceTicks }, (_, i) => {
          const value = min + ((max - min) * i) / (priceTicks - 1);
          return (
            <g key={`price-grid-${i}`}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                stroke={BRAND_COLORS.grid}
                strokeDasharray="3 6"
              />
              <text
                x={width - right + 9}
                y={y(value) + 4}
                fill={BRAND_COLORS.muted}
                fontSize="11"
              >
                {fmt(value, max < 100 ? 2 : 1)}
              </text>
            </g>
          );
        })}
        <text x={left} y={15} fill={BRAND_COLORS.muted} fontSize="10">
          {priceStyle === "heikin"
            ? "平均足（合成価格）"
            : priceStyle === "line"
              ? "終値ライン"
              : "ローソク足"}{" "}
          · JPY
        </text>
        <g clipPath={`url(#${clip}-price)`}>
          {priceStyle === "line" ? (
            <path
              data-series="終値"
              d={path(
                shown.map((p) => p.close),
                x,
                y,
              )}
              stroke={BRAND_COLORS.accent}
              strokeWidth="1.8"
              fill="none"
            />
          ) : (
            chart.priceBars.map((p, i) => {
              const color =
                p.close >= p.open
                  ? BRAND_COLORS.positive
                  : BRAND_COLORS.negative;
              return (
                <g
                  key={p.time}
                  data-candle={i}
                  data-open={p.open}
                  data-close={p.close}
                >
                  <line
                    x1={x(i)}
                    x2={x(i)}
                    y1={y(p.high)}
                    y2={y(p.low)}
                    stroke={color}
                  />
                  <rect
                    x={x(i) - Math.max(step * 0.62, 0.75) / 2}
                    y={Math.min(y(p.open), y(p.close))}
                    width={Math.max(step * 0.62, 0.75)}
                    height={Math.max(Math.abs(y(p.open) - y(p.close)), 1)}
                    fill={color}
                  />
                </g>
              );
            })
          )}
          {extras.bb && (
            <path
              data-series="BB帯"
              d={bandPath(shown, x, y)}
              fill={BRAND_COLORS.accent}
              fillOpacity=".06"
            />
          )}
          {chart.lines.map((line) => (
            <path
              key={line.id}
              data-series={line.id}
              d={path(line.values, x, y)}
              stroke={line.color}
              strokeWidth={line.id.startsWith("BB") ? 1 : 1.5}
              strokeDasharray={line.id === "BB中心" ? "3 3" : undefined}
              fill="none"
            />
          ))}
          {reference.map(([label, value]) =>
            finite(value) && value >= min && value <= max ? (
              <g key={String(label)} data-level={label}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke={label === "現在値" ? BRAND_COLORS.accent : "#bcac81"}
                  strokeDasharray="5 4"
                  opacity=".65"
                />
                <text
                  x={left + 4}
                  y={y(value) - 4}
                  fill={BRAND_COLORS.muted}
                  fontSize="10"
                >
                  {String(label)} {fmt(value)}
                </text>
              </g>
            ) : null,
          )}
          {horizontal.map((price) =>
            price >= min && price <= max ? (
              <g key={price} data-horizontal-price={price}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(price)}
                  y2={y(price)}
                  stroke="#e7a2d3"
                  strokeDasharray="6 3"
                />
                <text
                  x={left + 4}
                  y={y(price) - 4}
                  fill="#e7a2d3"
                  fontSize="10"
                >
                  水平線 {fmt(price)}
                </text>
              </g>
            ) : null,
          )}
        </g>
        {panes.map((pane) => (
          <g key={pane.kind} data-pane={pane.kind}>
            <line
              x1={left}
              x2={width - right}
              y1={pane.top - 20}
              y2={pane.top - 20}
              stroke={BRAND_COLORS.border}
            />
            <text
              x={left}
              y={pane.top - 7}
              fill={BRAND_COLORS.muted}
              fontSize="11"
            >
              {pane.kind === "volume"
                ? "出来高（株）"
                : pane.kind === "rsi"
                  ? "RSI(14)"
                  : pane.kind === "macd"
                    ? "MACD(12,26,9)"
                    : AUXILIARY_PANELS[pane.kind].title}
            </text>
            {[pane.min, (pane.max + pane.min) / 2, pane.max].map((v, i) => (
              <g key={i}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={pane.y(v)}
                  y2={pane.y(v)}
                  stroke={BRAND_COLORS.grid}
                  strokeDasharray="3 6"
                />
                <text
                  x={width - right + 9}
                  y={pane.y(v) + 4}
                  fill={BRAND_COLORS.muted}
                  fontSize="10"
                >
                  {pane.kind === "volume" && v >= 10000
                    ? `${fmt(v / 10000, 1)}万`
                    : fmt(v, pane.kind === "volume" ? 0 : 1)}
                </text>
              </g>
            ))}
            {pane.kind === "volume" ? (
              shown.map((p, i) =>
                p.volume === null ? null : (
                  <rect
                    key={p.time}
                    data-volume={p.volume}
                    x={x(i) - step * 0.32}
                    y={pane.y(p.volume)}
                    width={Math.max(step * 0.64, 0.5)}
                    height={Math.max(pane.bottom - pane.y(p.volume), 0)}
                    fill={p.close >= p.open ? "#53bc9b" : "#c17389"}
                    opacity=".8"
                  />
                ),
              )
            ) : pane.kind === "rsi" ? (
              <>
                {[30, 70].map((v) => (
                  <g key={v}>
                    <line
                      x1={left}
                      x2={width - right}
                      y1={pane.y(v)}
                      y2={pane.y(v)}
                      stroke="#928b66"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={left + 2}
                      y={pane.y(v) - 3}
                      fill="#928b66"
                      fontSize="9"
                    >
                      {v}
                    </text>
                  </g>
                ))}
                <path
                  data-series="RSI"
                  d={path(
                    shown.map((p) => p.rsi),
                    x,
                    pane.y,
                  )}
                  fill="none"
                  stroke="#ba9bea"
                  strokeWidth="1.5"
                />
              </>
            ) : pane.kind === "macd" ? (
              <>
                <line
                  x1={left}
                  x2={width - right}
                  y1={pane.y(0)}
                  y2={pane.y(0)}
                  stroke={BRAND_COLORS.muted}
                  strokeDasharray="3 4"
                />
                {shown.map((p, i) =>
                  p.macdHistogram === null ? null : (
                    <rect
                      key={p.time}
                      data-macd-histogram={p.macdHistogram}
                      x={x(i) - step * 0.3}
                      y={Math.min(pane.y(0), pane.y(p.macdHistogram))}
                      width={Math.max(step * 0.6, 0.5)}
                      height={Math.max(
                        Math.abs(pane.y(p.macdHistogram) - pane.y(0)),
                        0.5,
                      )}
                      fill={p.macdHistogram >= 0 ? "#4db69a" : "#c8768c"}
                      opacity=".75"
                    />
                  ),
                )}
                <path
                  data-series="MACD"
                  d={path(
                    shown.map((p) => p.macd),
                    x,
                    pane.y,
                  )}
                  stroke="#7fb9f2"
                  fill="none"
                  strokeWidth="1.5"
                />
                <path
                  data-series="MACDシグナル"
                  d={path(
                    shown.map((p) => p.macdSignal),
                    x,
                    pane.y,
                  )}
                  stroke="#e8b363"
                  fill="none"
                  strokeWidth="1.5"
                />
              </>
            ) : (
              <>
                {AUXILIARY_PANELS[pane.kind].references.map((value) => (
                  <g key={value}>
                    <line
                      x1={left}
                      x2={width - right}
                      y1={pane.y(value)}
                      y2={pane.y(value)}
                      stroke="#928b66"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={left + 2}
                      y={pane.y(value) - 3}
                      fill="#928b66"
                      fontSize="9"
                    >
                      {value}
                    </text>
                  </g>
                ))}
                {AUXILIARY_PANELS[pane.kind].series.map((series) => (
                  <path
                    key={series.name}
                    data-series={series.name}
                    d={path(
                      shown.map((point) => point[series.key]),
                      x,
                      pane.y,
                    )}
                    stroke={series.color}
                    fill="none"
                    strokeWidth="1.5"
                  />
                ))}
              </>
            )}
          </g>
        ))}
        {Array.from({ length: width < 500 ? 3 : 5 }, (_, i) => {
          const ticks = width < 500 ? 3 : 5;
          const index = Math.round(((shown.length - 1) * i) / (ticks - 1));
          return (
            <text
              key={i}
              x={x(index)}
              y={chart.totalHeight - 10}
              fill={BRAND_COLORS.muted}
              fontSize="10"
              textAnchor={
                i === 0 ? "start" : i === ticks - 1 ? "end" : "middle"
              }
            >
              {dateLabel(shown[index].time, intraday)}
            </text>
          );
        })}
      </>
    );
  }, [
    chart,
    width,
    shown,
    clip,
    extras,
    interval,
    levels,
    points,
    priceStyle,
    horizontal,
    intraday,
  ]);

  function changeView(next: ChartViewport, preset: number | null = null) {
    setViewport(clampViewport(points.length, next));
    setPeriod(preset);
    setHover(null);
    setPointerY(null);
  }
  function pickPeriod(n: number) {
    changeView(
      {
        start: n ? Math.max(0, points.length - n) : 0,
        count: n || points.length,
      },
      n,
    );
  }
  function applyPreset(preset: ChartPreset) {
    const settings = presetSettings(preset, intraday);
    setAverages(settings.averages);
    setExtras(settings.extras);
    setPanels(settings.panels);
    setPriceStyle("candle");
    setMessage("");
  }
  function addAverage(event: React.FormEvent) {
    event.preventDefault();
    const number = Number(averagePeriod);
    if (!Number.isInteger(number) || number < 2 || number > 200) {
      setMessage("移動平均の期間は2〜200の整数で指定してください。");
      return;
    }
    const id = `${averageType === "sma" ? "MA" : "EMA"}${number}`;
    if (averages.some((a) => a.id === id)) {
      setAverages((all) =>
        all.map((a) => (a.id === id ? { ...a, on: true } : a)),
      );
      setMessage("");
      return;
    }
    if (averages.length >= 12) {
      setMessage(
        "移動平均は最大12本です。追加したラインを削除してから設定してください。",
      );
      return;
    }
    setAverages((all) => [
      ...all,
      {
        id,
        type: averageType,
        period: number,
        color: COLORS[(all.length - DEFAULT_AVERAGES.length) % COLORS.length],
        on: true,
        custom: true,
      },
    ]);
    setMessage("");
  }
  function addHorizontal(event: React.FormEvent) {
    event.preventDefault();
    const price = Number(horizontalPrice);
    if (!finite(price) || price <= 0) {
      setMessage("水平線の価格は0より大きい数値で指定してください。");
      return;
    }
    if (!horizontal.includes(price) && horizontal.length >= 5) {
      setMessage("水平線は最大5本です。不要な線を削除してください。");
      return;
    }
    setHorizontal((all) => [...new Set([...all, price])]);
    setMessage("");
  }
  function measurementClick(local: number) {
    if (!measure) return;
    const absolute = view.start + local;
    if (measureFrom === null || measureTo !== null) {
      setMeasureFrom(absolute);
      setMeasureTo(null);
    } else setMeasureTo(absolute);
  }
  function exportCsv() {
    const fields: (keyof TechnicalPoint)[] = [
      "open",
      "high",
      "low",
      "close",
      "volume",
      "sma5",
      "sma25",
      "sma75",
      "ema9",
      "ema20",
      "ema50",
      "vwap",
      "rsi",
      "rci",
      "rci26",
      "stochasticK",
      "stochasticD",
      "adx",
      "plusDI",
      "minusDI",
      "macd",
      "macdSignal",
      "macdHistogram",
      "bbUpper",
      "bbMiddle",
      "bbLower",
      "atr",
    ];
    const header = [
      "timestamp_utc",
      "timestamp_jst",
      ...fields,
      ...averageSeries.filter((a) => a.on).map((a) => a.id),
    ];
    const rows = shown.map((p, i) => [
      new Date(p.time * 1000).toISOString(),
      fullDate.format(p.time * 1000),
      ...fields.map((key) => p[key] ?? ""),
      ...averageSeries
        .filter((a) => a.on)
        .map((a) => a.values[view.start + i] ?? ""),
    ]);
    download(
      `\uFEFF${[header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n")}`,
      "text/csv;charset=utf-8",
      `chart-${interval}-${shown.at(-1)?.time}.csv`,
    );
    setMessage("表示中の実際のOHLC・出来高・指標をCSVに保存しました。");
  }
  function exportSvg() {
    if (!svg.current || !chart) return;
    const copy = svg.current.cloneNode(true) as SVGSVGElement;
    copy
      .querySelectorAll('[data-interaction="true"]')
      .forEach((node) => node.remove());
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", String(width));
    copy.setAttribute("height", String(chart.totalHeight + 48));
    copy.setAttribute("viewBox", `0 0 ${width} ${chart.totalHeight + 48}`);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", BRAND_COLORS.panel);
    copy.insertBefore(rect, copy.firstChild);
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.setAttribute("x", "14");
    label.setAttribute("y", String(chart.totalHeight + 18));
    label.setAttribute("fill", BRAND_COLORS.text);
    label.setAttribute("font-size", "10");
    label.textContent = `${interval} · ${dateLabel(shown[0].time, intraday)} – ${dateLabel(shown.at(-1)!.time, intraday)} JST · ${chart.lines.map((a) => a.id).join(" / ")}`;
    copy.appendChild(label);
    download(
      new XMLSerializer().serializeToString(copy),
      "image/svg+xml;charset=utf-8",
      `chart-${interval}-${shown.at(-1)?.time}.svg`,
    );
    setMessage("現在表示しているチャートをSVGに保存しました。");
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else setMessage("このブラウザーは全画面表示に対応していません。");
    } catch {
      setMessage("全画面表示を開始できませんでした。");
    }
  }

  if (!chart || !selected)
    return <div className="chart-empty">チャートデータはありません。</div>;
  const { x, y } = chart;
  const measureLocalFrom =
    measureFrom === null ? null : measureFrom - view.start;
  const measureLocalTo = measureTo === null ? hover : measureTo - view.start;
  const overlayNames: [Extra, string][] = [
    ["bb", "BB"],
    ["vwap", "VWAP"],
    ["previous", interval === "weekly" ? "前週高安" : "前日高安"],
    ["pivot", "ピボット"],
    ["current", "現在値"],
  ];
  const paneNames: [Panel, string][] = [
    ["volume", "出来高"],
    ["rsi", "RSI"],
    ["macd", "MACD"],
    ["rci", "RCI"],
    ["stochastic", "ストキャス"],
    ["dmi", "ADX/DMI"],
    ["atr", "ATR"],
  ];
  const chartName =
    priceStyle === "candle"
      ? "株価ローソク足チャート。緑は陽線、赤は陰線。"
      : priceStyle === "heikin"
        ? "株価平均足チャート。表示価格は合成値です。"
        : "株価終値ラインチャート。";
  return (
    <section
      ref={root}
      className={styles.panel}
      aria-label="トレーディングチャート"
    >
      <div className={styles.controls}>
        <div className={styles.row} role="group" aria-label="チャート表示形式">
          <span className={styles.label}>表示形式</span>
          {(
            [
              ["candle", "ローソク足"],
              ["line", "終値ライン"],
              ["heikin", "平均足"],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={priceStyle === kind}
              onClick={() => setPriceStyle(kind)}
            >
              {label}
            </button>
          ))}
          <span
            className={styles.label}
            style={{ width: "auto", marginLeft: 8 }}
          >
            プリセット
          </span>
          {(
            [
              ["standard", "標準"],
              ["daytrade", "デイトレード"],
              ["trend", "トレンド"],
            ] as const
          ).map(([kind, label]) => (
            <button key={kind} type="button" onClick={() => applyPreset(kind)}>
              {label}
            </button>
          ))}
        </div>
        <div className={styles.row} role="group" aria-label="表示本数">
          <span className={styles.label}>表示本数</span>
          {[30, 90, 180, 0].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={period === n}
              onClick={() => pickPeriod(n)}
            >
              {n ? `${n}本` : "全期間"}
            </button>
          ))}
        </div>
        <div className={styles.row} role="group" aria-label="価格オーバーレイ">
          <span className={styles.label}>価格ライン</span>
          {averages.map((a) => (
            <span key={a.id}>
              <button
                type="button"
                aria-pressed={a.on}
                style={a.on ? { color: a.color } : undefined}
                onClick={() =>
                  setAverages((all) =>
                    all.map((line) =>
                      line.id === a.id ? { ...line, on: !line.on } : line,
                    ),
                  )
                }
              >
                {a.id} {a.on ? "ON" : "OFF"}
              </button>
              {a.custom && (
                <button
                  type="button"
                  aria-label={`${a.id}を削除`}
                  onClick={() =>
                    setAverages((all) => all.filter((line) => line.id !== a.id))
                  }
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {overlayNames.map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={extras[kind] && (kind !== "vwap" || intraday)}
              disabled={kind === "vwap" && !intraday}
              title={
                kind === "vwap" && !intraday
                  ? "VWAPは分足で利用できます"
                  : undefined
              }
              onClick={() =>
                setExtras((all) => ({ ...all, [kind]: !all[kind] }))
              }
            >
              {label}{" "}
              {extras[kind] && (kind !== "vwap" || intraday) ? "ON" : "OFF"}
            </button>
          ))}
        </div>
        <div className={styles.row} role="group" aria-label="補助チャート">
          <span className={styles.label}>補助チャート</span>
          {paneNames.map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={panels[kind]}
              onClick={() =>
                setPanels((all) => ({ ...all, [kind]: !all[kind] }))
              }
            >
              {label} {panels[kind] ? "ON" : "OFF"}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={measure}
            onClick={() => {
              setMeasure(!measure);
              setMeasureFrom(null);
              setMeasureTo(null);
            }}
          >
            2点測定 {measure ? "ON" : "OFF"}
          </button>
          {measureFrom !== null && (
            <button
              type="button"
              onClick={() => {
                setMeasureFrom(null);
                setMeasureTo(null);
              }}
            >
              測定を解除
            </button>
          )}
        </div>
        <details>
          <summary className={styles.note} style={{ cursor: "pointer" }}>
            詳細設定・描画ツール
          </summary>
          <div style={{ display: "grid", gap: 12, paddingTop: 12 }}>
            <form className={styles.row} onSubmit={addAverage}>
              <span className={styles.label}>任意の移動平均</span>
              <select
                aria-label="追加する移動平均の種類"
                value={averageType}
                onChange={(e) =>
                  setAverageType(e.target.value as "sma" | "ema")
                }
              >
                <option value="sma">SMA</option>
                <option value="ema">EMA</option>
              </select>
              <input
                className={styles.periodInput}
                type="number"
                aria-label="追加する移動平均の期間"
                min="2"
                max="200"
                step="1"
                required
                value={averagePeriod}
                onChange={(e) => setAveragePeriod(e.target.value)}
              />
              <button type="submit">移動平均を追加</button>
              <span className={styles.note}>2〜200本・最大12ライン</span>
            </form>
            <form className={styles.row} onSubmit={addHorizontal}>
              <span className={styles.label}>水平線</span>
              <input
                className={styles.priceInput}
                type="number"
                aria-label="水平線の価格"
                min="0.000001"
                step="any"
                required
                value={horizontalPrice}
                onChange={(e) => setHorizontalPrice(e.target.value)}
                placeholder="価格（円）"
              />
              <button type="submit">水平線を追加</button>
              {horizontal.map((price) => (
                <button
                  key={price}
                  type="button"
                  aria-label={`水平線 ${price}を削除`}
                  onClick={() =>
                    setHorizontal((all) => all.filter((n) => n !== price))
                  }
                >
                  {fmt(price)} ×
                </button>
              ))}
              <span className={styles.note}>
                最大5本・価格範囲外の線は描画しません
              </span>
            </form>
            <span className={styles.note}>
              SMAは単純移動平均、EMAは指数移動平均。BBは20本・±2σ。VWAPはJSTの取引日ごとにリセットします。
            </span>
          </div>
        </details>
      </div>
      <div className={styles.legend} aria-live="off">
        <strong>{fullDate.format(selected.time * 1000)} JST</strong>
        <span>始 {fmt(selected.open)}</span>
        <span>高 {fmt(selected.high)}</span>
        <span>安 {fmt(selected.low)}</span>
        <span
          className={
            selected.close >= selected.open ? styles.positive : styles.negative
          }
        >
          終 {fmt(selected.close)}
        </span>
        <span>出来高 {fmt(selected.volume, 0)}</span>
        {priceStyle === "heikin" && <span>OHLCは実価格・描画は平均足</span>}
      </div>
      <div className={styles.indicatorLegend}>
        {averageSeries
          .filter((a) => a.on)
          .map((a) => (
            <span key={a.id} style={{ color: a.color }}>
              {a.id} {fmt(a.values[view.start + selectedIndex])}
            </span>
          ))}
        {extras.bb && (
          <span>
            BB {fmt(selected.bbUpper)} / {fmt(selected.bbMiddle)} /{" "}
            {fmt(selected.bbLower)}
          </span>
        )}
        {intraday && extras.vwap && (
          <span style={{ color: "#7fb4ff" }}>VWAP {fmt(selected.vwap)}</span>
        )}
        {panels.rsi && (
          <span style={{ color: "#ba9bea" }}>RSI {fmt(selected.rsi)}</span>
        )}
        {panels.macd && (
          <>
            <span style={{ color: "#7fb9f2" }}>MACD {fmt(selected.macd)}</span>
            <span style={{ color: "#e8b363" }}>
              Signal {fmt(selected.macdSignal)}
            </span>
            <span>Histogram {fmt(selected.macdHistogram)}</span>
          </>
        )}
        {(Object.keys(AUXILIARY_PANELS) as AuxiliaryPanel[]).flatMap((kind) =>
          panels[kind]
            ? AUXILIARY_PANELS[kind].series.map((series) => (
                <span key={series.name} style={{ color: series.color }}>
                  {series.name} {fmt(selected[series.key])}
                  {kind === "atr" ? "円" : kind === "stochastic" ? "%" : ""}
                </span>
              ))
            : [],
        )}
      </div>
      <svg
        ref={svg}
        className={styles.svg}
        viewBox={`0 0 ${width} ${chart.totalHeight}`}
        height={chart.totalHeight}
        role="img"
        aria-label={chartName}
        tabIndex={0}
        data-visible-count={shown.length}
        data-window-start={view.start}
        data-last-close={shown.at(-1)?.close}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const localX = ((e.clientX - rect.left) / rect.width) * width;
          const localY =
            ((e.clientY - rect.top) / rect.height) * chart.totalHeight;
          if (drag.current && !measure) {
            const dx = e.clientX - drag.current.x,
              dy = e.clientY - drag.current.y;
            if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy))
              drag.current.moved = true;
            if (drag.current.moved) {
              changeView(
                panViewport(
                  points.length,
                  drag.current.view,
                  Math.round(
                    (((-dx / rect.width) * width) / chart.plotWidth) *
                      drag.current.view.count,
                  ),
                ),
              );
              return;
            }
          }
          setHover(
            Math.max(
              0,
              Math.min(
                shown.length - 1,
                Math.floor((localX - chart.left) / chart.step),
              ),
            ),
          );
          setPointerY(
            localY >= chart.top && localY <= chart.priceBottom ? localY : null,
          );
        }}
        onPointerUp={(e) => {
          if (!drag.current?.moved) {
            const rect = e.currentTarget.getBoundingClientRect();
            const index = Math.max(
              0,
              Math.min(
                shown.length - 1,
                Math.floor(
                  (((e.clientX - rect.left) / rect.width) * width -
                    chart.left) /
                    chart.step,
                ),
              ),
            );
            measurementClick(index);
          }
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          if (!drag.current) {
            setHover(null);
            setPointerY(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const delta = e.key === "ArrowLeft" ? -1 : 1;
            if (e.shiftKey)
              changeView(
                panViewport(
                  points.length,
                  view,
                  delta * Math.max(1, Math.floor(view.count / 4)),
                ),
              );
            else {
              setHover(
                Math.max(0, Math.min(shown.length - 1, selectedIndex + delta)),
              );
              setPointerY(null);
            }
          } else if (e.key === "+" || e.key === "=" || e.key === "-") {
            e.preventDefault();
            changeView(
              zoomViewport(points.length, view, e.key === "-" ? 1.5 : 2 / 3),
            );
          } else if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            changeView({
              start: e.key === "Home" ? 0 : points.length - view.count,
              count: view.count,
            });
          } else if (e.key === "Enter" && measure) {
            e.preventDefault();
            measurementClick(selectedIndex);
          } else if (e.key === "Escape") {
            setHover(null);
            setPointerY(null);
            setMeasureFrom(null);
            setMeasureTo(null);
          }
        }}
      >
        <title>{chartName}</title>
        <desc>
          日本時間。左右キーで足を選択、Shiftと左右キーでスクロール、プラス・マイナスで拡大縮小。指標は表示範囲外も含めた取得履歴で計算しています。
        </desc>
        {staticPlot}
        {measureLocalFrom !== null &&
          measureLocalFrom >= 0 &&
          measureLocalFrom < shown.length && (
            <g data-interaction="true">
              <circle
                cx={x(measureLocalFrom)}
                cy={y(points[measureFrom!].close)}
                r="4"
                fill="#e7a2d3"
              />
              {measureLocalTo !== null &&
                measureLocalTo >= 0 &&
                measureLocalTo < shown.length && (
                  <>
                    <line
                      x1={x(measureLocalFrom)}
                      y1={y(points[measureFrom!].close)}
                      x2={x(measureLocalTo)}
                      y2={y(shown[measureLocalTo].close)}
                      stroke="#e7a2d3"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                    />
                    <circle
                      cx={x(measureLocalTo)}
                      cy={y(shown[measureLocalTo].close)}
                      r="4"
                      fill="#e7a2d3"
                    />
                  </>
                )}
            </g>
          )}
        {hover !== null && (
          <g data-interaction="true" data-crosshair="true">
            <line
              x1={x(selectedIndex)}
              x2={x(selectedIndex)}
              y1={chart.top}
              y2={chart.totalHeight - 30}
              stroke={BRAND_COLORS.accent}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
            {pointerY !== null && (
              <>
                <line
                  x1={chart.left}
                  x2={width - chart.right}
                  y1={pointerY}
                  y2={pointerY}
                  stroke={BRAND_COLORS.accent}
                  strokeDasharray="4 4"
                />
                <rect
                  x={width - chart.right + 2}
                  y={pointerY - 10}
                  width={chart.right - 4}
                  height="20"
                  fill={BRAND_COLORS.accentSoft}
                  rx="2"
                />
                <text
                  x={width - chart.right + 7}
                  y={pointerY + 4}
                  fill={BRAND_COLORS.text}
                  fontSize="10"
                >
                  {fmt(chart.inverseY(pointerY))}
                </text>
              </>
            )}
          </g>
        )}
      </svg>
      <div className={styles.navigation}>
        <button
          type="button"
          aria-label="拡大"
          disabled={view.count <= Math.min(20, points.length)}
          onClick={() => changeView(zoomViewport(points.length, view, 2 / 3))}
        >
          ＋ 拡大
        </button>
        <button
          type="button"
          aria-label="縮小"
          disabled={view.count >= points.length}
          onClick={() => changeView(zoomViewport(points.length, view, 1.5))}
        >
          − 縮小
        </button>
        <button
          type="button"
          disabled={view.start === 0}
          onClick={() =>
            changeView(
              panViewport(
                points.length,
                view,
                -Math.max(1, Math.round(view.count / 2)),
              ),
            )
          }
        >
          過去へ
        </button>
        <button
          type="button"
          disabled={view.start + view.count >= points.length}
          onClick={() =>
            changeView({ start: points.length - view.count, count: view.count })
          }
        >
          最新へ
        </button>
        <button type="button" onClick={() => pickPeriod(90)}>
          表示をリセット
        </button>
        <input
          type="range"
          aria-label="表示位置"
          min="0"
          max={Math.max(0, points.length - view.count)}
          value={view.start}
          disabled={view.count >= points.length}
          onChange={(e) =>
            changeView({ start: Number(e.target.value), count: view.count })
          }
        />
        <span className={styles.status}>
          {view.start + 1}–{view.start + shown.length} / {points.length}本
        </span>
        <div className={styles.tools}>
          <button type="button" onClick={exportCsv}>
            CSVを保存
          </button>
          <button type="button" onClick={exportSvg}>
            SVGを保存
          </button>
          <button type="button" onClick={toggleFullscreen}>
            {fullscreen ? "全画面を終了" : "全画面"}
          </button>
        </div>
      </div>
      {measure && (
        <div className={styles.measurement}>
          <span>
            {measured
              ? "測定結果："
              : measureFrom === null
                ? "始点と終点の2本を選択してください。"
                : "終点を選択してください。"}
          </span>
          {measured && (
            <output aria-label="測定結果">
              {fmt(measured.fromPrice)} → {fmt(measured.toPrice)}円 ·{" "}
              {measured.priceChange >= 0 ? "+" : ""}
              {fmt(measured.priceChange)}円（
              {measured.percentChange >= 0 ? "+" : ""}
              {fmt(measured.percentChange)}%） · 経過 {measured.bars}本
            </output>
          )}
        </div>
      )}
      {message && (
        <p className={styles.measurement} role="status">
          {message}
        </p>
      )}
      <p className={styles.footnote}>
        ドラッグで横スクロール · 左右キーで足を選択 / Shift＋左右キーで移動 /
        ＋・−でズーム · 緑：陽線 /
        赤：陰線。MAはSMA、指標の期間は選択した時間足の本数です。期間不足・欠損値は描画しません。
        {priceStyle === "heikin" &&
          "平均足は合成価格です。測定とCSVは実際の終値・OHLCを使います。"}
        {(extras.previous || extras.pivot) &&
          `高安・ピボットは最新${interval === "weekly" ? "週" : "取引日"}の目安です。分足で求めた値は公式の日足と異なる場合があります。`}
      </p>
    </section>
  );
}
