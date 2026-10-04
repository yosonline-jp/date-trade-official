import { analysisConfig, type AnalysisConfig } from "./config";
import { indicators, tradingDay } from "./indicators";
import { AnalysisError, classifySignal, frameAt, scoreSignal } from "./signal";
import { closedIndex, seconds, similarCases, summarize } from "./similarity";
import { pricePlan, rciProjection } from "./prediction";
import type {
  AnalysisResult,
  Candle,
  History,
  IndicatorPoint,
  Interval,
  MarketState,
  Stock,
} from "./types";

export function cleanHistory(
  bars: Candle[],
  interval: Interval,
  asOf: number,
): Candle[] {
  const unique = new Map<number, Candle>();
  for (const bar of bars)
    if (
      Object.values(bar).every(Number.isFinite) &&
      bar.time + seconds[interval] <= asOf &&
      bar.close > 0 &&
      bar.open > 0 &&
      bar.low > 0 &&
      bar.high >= Math.max(bar.open, bar.close) &&
      bar.low <= Math.min(bar.open, bar.close) &&
      bar.volume >= 0
    )
      unique.set(bar.time, bar);
  return [...unique.values()].sort((a, b) => a.time - b.time);
}
export function marketState(asOf: number, latest: number): MarketState {
  const local = new Date((asOf + 9 * 3600) * 1000),
    minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  if ([0, 6].includes(local.getUTCDay()) || minutes < 540 || minutes >= 930)
    return "CLOSED";
  if (minutes >= 690 && minutes < 750) return "BREAK";
  return tradingDay(asOf) !== tradingDay(latest) ||
    asOf - (latest + 60) > 20 * 60
    ? "STALE"
    : "OPEN";
}
export function analyzeMarket(
  stock: Stock,
  history: History,
  asOf: number,
  warnings: string[] = [],
  config: AnalysisConfig = analysisConfig,
): AnalysisResult {
  const raw = Object.fromEntries(
    (Object.keys(seconds) as Interval[]).map((interval) => [
      interval,
      cleanHistory(history[interval], interval, asOf),
    ]),
  ) as History;
  for (const interval of Object.keys(seconds) as Interval[])
    if (raw[interval].length < config.minimumBars)
      throw new AnalysisError(
        `${interval}の分析に必要なデータが不足しています（取得${raw[interval].length}本、最低${config.minimumBars}本）。`,
      );
  const decision = raw["1m"].at(-1)!.time + 60;
  const series = Object.fromEntries(
    (Object.keys(seconds) as Interval[]).map((interval) => [
      interval,
      indicators(
        raw[interval].filter((p) => p.time + seconds[interval] <= decision),
        config,
      ),
    ]),
  ) as Record<Interval, IndicatorPoint[]>;
  const one = frameAt(series["1m"], series["1m"].length - 1, "1m", config);
  const five = frameAt(
    series["5m"],
    closedIndex(series["5m"], "5m", decision),
    "5m",
    config,
  );
  const fifteen = frameAt(
    series["15m"],
    closedIndex(series["15m"], "15m", decision),
    "15m",
    config,
  );
  const long = scoreSignal("LONG", fifteen, five, one, config),
    short = scoreSignal("SHORT", fifteen, five, one, config);
  const winner = long.total >= short.total ? long : short;
  const classified = classifySignal(
    winner.total,
    winner.direction,
    fifteen,
    config,
  );
  const analogs = similarCases(series, { one, five, fifteen }, config);
  const day = tradingDay(one.current.time),
    days = [...new Set(raw["1m"].map((b) => tradingDay(b.time)))];
  const previousDay = days.filter((d) => d < day).at(-1);
  const previousBars = raw["1m"].filter(
      (b) => tradingDay(b.time) === previousDay,
    ),
    dayBars = raw["1m"].filter((b) => tradingDay(b.time) === day);
  const levels = {
    pdh: previousBars.length
      ? Math.max(...previousBars.map((b) => b.high))
      : null,
    pdl: previousBars.length
      ? Math.min(...previousBars.map((b) => b.low))
      : null,
    dayHigh: Math.max(...dayBars.map((b) => b.high)),
    dayLow: Math.min(...dayBars.map((b) => b.low)),
  };
  const structural = [
    levels.pdh,
    levels.pdl,
    levels.dayHigh,
    levels.dayLow,
    one.recentHigh,
    one.recentLow,
    one.current.vwap,
    one.current.ema20,
  ].filter((n): n is number => n !== null);
  const plan = pricePlan(one, analogs, winner.direction, structural, config);
  const state = marketState(asOf, one.current.time);
  const reasons = [
    `15分足${fifteen.trend === "UP" ? "上昇" : fifteen.trend === "DOWN" ? "下降" : "レンジ"}環境・5分足セットアップ${winner.setup}点・1分足トリガー${winner.trigger}点。`,
    ...(classified.counterTrend
      ? [
          `15分足と逆方向の${winner.direction === "LONG" ? "リバウンド" : "反落"}候補です。順張りシグナルとして採用しません。`,
        ]
      : []),
    ...(analogs.length < config.similarity.minSamples
      ? [
          `類似局面が${analogs.length}件で、最低${config.similarity.minSamples}件に不足しています。予想価格・確率は算出しません。`,
        ]
      : []),
    ...(one.current.volumeRatio! < 1
      ? ["1分足の出来高は直前20本平均を下回っています。"]
      : []),
  ];
  let signal = classified.signal,
    strength = classified.strength;
  if (state !== "OPEN") {
    signal = "WAIT";
    strength = "WAIT";
    reasons.push(
      state === "CLOSED"
        ? "取引時間外です。直近の確定足による参考分析を表示します。"
        : state === "BREAK"
          ? "前場・後場の間の休憩時間です。"
          : "現在の取引時間に対してデータが古いためWAITです。休場・遅延・売買停止をご確認ください。",
    );
  }
  if (
    !plan.entry ||
    (plan.takeProfit[1]?.riskReward ?? 0) < config.risk.minimumRR
  ) {
    signal = "WAIT";
    strength = "WAIT";
    if (plan.entry)
      reasons.push("TP2のRisk / Rewardが基準未満のためWAITです。");
  }
  const confidence = Math.round(
    100 *
      Math.min(1, analogs.length / config.similarity.maxSamples) *
      Math.max(
        0,
        1 -
          analogs.reduce((n, a) => n + a.distance, 0) /
            Math.max(1, analogs.length) /
            config.similarity.maxDistance,
      ),
  );
  return {
    symbol: stock.code,
    name: stock.name,
    currentPrice: one.current.close,
    analyzedAt: new Date(asOf * 1000).toISOString(),
    dataAt: new Date(decision * 1000).toISOString(),
    signal,
    strength,
    scenarioDirection: winner.direction,
    counterTrend: classified.counterTrend,
    score: winner.total,
    confidence,
    scores: { long, short },
    ...plan,
    entryCondition:
      winner.direction === "LONG"
        ? "RCI -80回復・KDJ GC・RSI上向き・VWAP/EMA20回復"
        : "RCI +80下抜け・KDJ DC・RSI下向き・VWAP/EMA20下抜け",
    rciProjection: rciProjection(one, analogs, winner.direction, config),
    timeframes: { oneMinute: one, fiveMinute: five, fifteenMinute: fifteen },
    charts: {
      "1m": series["1m"].slice(-90),
      "5m": series["5m"].slice(-90),
      "15m": series["15m"].slice(-90),
    },
    levels,
    statistics: {
      samples: analogs.length,
      horizonMinutes: config.similarity.horizon,
      maxDistance: config.similarity.maxDistance,
      returns: config.similarity.returns.map((minutes) => ({
        minutes,
        ...summarize(analogs.map((a) => a.returns[minutes])),
      })),
    },
    source: {
      provider: "Yahoo Finance",
      marketState: state,
      delay: "遅延の可能性があります。リアルタイム配信ではありません。",
      historyDays: days.length,
      bars: {
        "1m": raw["1m"].length,
        "5m": raw["5m"].length,
        "15m": raw["15m"].length,
      },
      warnings,
    },
    reasons,
  };
}
