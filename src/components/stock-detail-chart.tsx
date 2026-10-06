"use client";

import { useMemo } from "react";
import { savedChartPoints } from "@/lib/analysis/chart-workspace";
import { technicalLevels } from "@/lib/analysis/stock-technicals";
import type { CandleRaw } from "./stock-candle-chart";
import type { VolumeChartData } from "./volume-chart";
import TradingChart from "./trading-chart";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default function StockDetailChart({
  candles,
  volumes,
}: {
  candles: CandleRaw[];
  volumes: VolumeChartData;
}) {
  const { points, levels } = useMemo(() => {
    // Volume dates may have gaps: join by timestamp, never by array position.
    const volumeByTime = new Map(
      volumes.timestamps.map((time, index) => [time, volumes.volumes[index]]),
    );
    const points = savedChartPoints(
      candles.map((bar) => ({ ...bar, volume: volumeByTime.get(bar.ts) })),
    );
    return {
      points,
      levels: technicalLevels(
        points.map((point) => ({ ...point, volume: point.volume ?? NaN })),
        "daily",
      ),
    };
  }, [candles, volumes]);
  const latest = points.at(-1);

  return (
    <>
      <TradingChart
        points={points}
        interval="daily"
        levels={levels}
        initialPreset="trend"
        height={400}
      />
      {latest && (
        <p className="chart-footnote">
          保存済みの日足 · 最終データ {dateFormat.format(latest.time * 1000)}{" "}
          JST ·
          リアルタイム配信ではありません。取引中の日足は途中値を含む場合があります。
        </p>
      )}
    </>
  );
}
