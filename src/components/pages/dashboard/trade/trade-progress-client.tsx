"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartNoAxesCombined, TrendingUp } from "lucide-react";

export type DayProfit = { date: string; profit: number; cumulative: number };
export type MonthProfit = { month: string; profit: number };

const compactYen = (value: number) => {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
};

export default function TradeProgressClient({
  daySeries,
  monthSeries,
  year,
  hasRecords,
}: {
  daySeries: DayProfit[];
  monthSeries: MonthProfit[];
  year: number;
  hasRecords: boolean;
}) {
  const [period, setPeriod] = useState<"30d" | "year">("30d");
  const data =
    period === "30d"
      ? daySeries.map((item) => ({
          ...item,
          label: item.date.slice(5).replace("-", "/"),
        }))
      : monthSeries.map((item) => ({
          ...item,
          label: `${Number(item.month.slice(5))}月`,
        }));
  const periodProfit =
    period === "30d"
      ? daySeries.reduce((sum, item) => sum + item.profit, 0)
      : monthSeries.reduce((sum, item) => sum + item.profit, 0);
  const activeDays = daySeries.filter((item) => item.profit !== 0).length;

  return (
    <section className="trade-performance-grid" aria-label="損益推移">
      <div className="trade-chart-panel">
        <div className="trade-chart-heading">
          <div>
            <p className="eyebrow">PERFORMANCE</p>
            <h2>損益パフォーマンス</h2>
            <p>
              {period === "30d"
                ? "直近30日間の累積損益と日別損益"
                : `${year}年の月別損益`}
            </p>
          </div>
          <div className="trade-chart-period" aria-label="チャート期間">
            <button
              className={period === "30d" ? "active" : ""}
              onClick={() => setPeriod("30d")}
              aria-pressed={period === "30d"}
            >
              30日
            </button>
            <button
              className={period === "year" ? "active" : ""}
              onClick={() => setPeriod("year")}
              aria-pressed={period === "year"}
            >
              今年
            </button>
          </div>
        </div>
        <div className="trade-chart-amount">
          <strong className={periodProfit < 0 ? "negative" : "positive"}>
            {periodProfit > 0 ? "+" : periodProfit < 0 ? "−" : ""}¥
            {Math.abs(periodProfit).toLocaleString("ja-JP", {
              maximumFractionDigits: 0,
            })}
          </strong>
          <span>{period === "30d" ? "過去30日" : `${year}年`}の実現損益</span>
        </div>
        <div className="trade-chart-canvas">
          {hasRecords ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="tradeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5ce0bd" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#5ce0bd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#273549"
                  strokeDasharray="3 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#72869d", fontSize: 10 }}
                  interval={period === "30d" ? 5 : 0}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#72869d", fontSize: 10 }}
                  tickFormatter={compactYen}
                  width={51}
                />
                <Tooltip
                  cursor={{ stroke: "#6b8299", strokeDasharray: "4 4" }}
                  contentStyle={{
                    background: "#172332",
                    border: "1px solid #34465a",
                    borderRadius: 10,
                    color: "#e4eaf3",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#9aacc0" }}
                  formatter={(value, name) => [
                    `¥${Number(value).toLocaleString("ja-JP")}`,
                    name,
                  ]}
                />
                <ReferenceLine y={0} stroke="#52667d" strokeDasharray="3 3" />
                {period === "30d" && (
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="累積損益"
                    stroke="#66e2bf"
                    strokeWidth={2.5}
                    fill="url(#tradeArea)"
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "#66e2bf",
                      stroke: "#10251f",
                      strokeWidth: 2,
                    }}
                  />
                )}
                <Bar
                  dataKey="profit"
                  name={period === "30d" ? "日別損益" : "月別損益"}
                  fill="#567895"
                  fillOpacity={0.72}
                  maxBarSize={period === "30d" ? 9 : 32}
                  radius={[3, 3, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="trade-chart-empty">
              <ChartNoAxesCombined size={30} />
              <span>取引を記録すると、損益の推移がここに表示されます</span>
            </div>
          )}
        </div>
        <div className="trade-chart-legend">
          <span>
            <i className="line" />
            {period === "30d" ? "累積損益" : "月別損益"}
          </span>
          {period === "30d" && (
            <span>
              <i className="bar" />
              日別損益
            </span>
          )}
        </div>
      </div>
      <div className="trade-insight-panel">
        <span className="trade-insight-icon">
          <TrendingUp size={21} />
        </span>
        <p className="eyebrow">YOUR TRADING PULSE</p>
        <h2>
          記録から見える、
          <br />
          自分のトレード。
        </h2>
        <p className="trade-insight-copy">
          一つひとつの判断を残すことで、勝ちパターンと改善点が見えてきます。
        </p>
        <div className="trade-insight-number">
          <strong>{activeDays}</strong>
          <span>直近30日間の取引日</span>
        </div>
        <div className="trade-insight-foot">
          振り返りは、次の一手を強くする <span>↗</span>
        </div>
      </div>
    </section>
  );
}
