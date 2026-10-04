import { analysisConfig, type AnalysisConfig } from "./config";
import type {
  Direction,
  Frame,
  IndicatorPoint,
  Interval,
  Reason,
  Score,
  Trend,
} from "./types";

export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly kind:
      | "INSUFFICIENT_DATA"
      | "PROVIDER"
      | "RATE_LIMIT"
      | "TIMEOUT" = "INSUFFICIENT_DATA",
  ) {
    super(message);
  }
}
export function trend(point: IndicatorPoint): Trend {
  if (point.ema20 === null || point.ema50 === null) return "RANGE";
  return point.ema20 > point.ema50 && point.close > point.ema20
    ? "UP"
    : point.ema20 < point.ema50 && point.close < point.ema20
      ? "DOWN"
      : "RANGE";
}
export function frameAt(
  points: IndicatorPoint[],
  index: number,
  interval: Interval,
  config: AnalysisConfig = analysisConfig,
): Frame {
  if (index < config.minimumBars - 1)
    throw new AnalysisError(
      `${interval}の分析に必要なデータが不足しています（最低${config.minimumBars}本）。`,
    );
  const current = points[index],
    previous = points[index - 1],
    previous2 = points[index - 2];
  if (
    [current, previous, previous2].some(
      (p) =>
        !p ||
        [
          p.rci,
          p.k,
          p.d,
          p.j,
          p.rsi,
          p.ema20,
          p.ema50,
          p.ema100,
          p.vwap,
          p.atr,
          p.adx,
          p.volumeRatio,
        ].some((v) => v === null || !Number.isFinite(v)),
    )
  )
    throw new AnalysisError(
      `${interval}の指標計算に必要な価格・出来高データが不足しています。`,
    );
  const rciSlope = current.rci! - previous.rci!;
  const recent = points.slice(
    Math.max(0, index - config.swingPeriod + 1),
    index + 1,
  );
  return {
    interval,
    role:
      interval === "15m"
        ? "Environment"
        : interval === "5m"
          ? "Setup"
          : "Trigger",
    trend: trend(current),
    current,
    previous,
    previous2,
    rciSlope,
    emaSlope: current.ema20! - previous.ema20!,
    rciCrossUp: previous.rci! <= config.rciLow && current.rci! > config.rciLow,
    rciCrossDown:
      previous.rci! >= config.rciHigh && current.rci! < config.rciHigh,
    rciReversalUp:
      Math.min(previous.rci!, previous2.rci!, current.rci!) <= config.rciLow &&
      rciSlope > 0,
    rciReversalDown:
      Math.max(previous.rci!, previous2.rci!, current.rci!) >= config.rciHigh &&
      rciSlope < 0,
    goldenCross: previous.k! <= previous.d! && current.k! > current.d!,
    deadCross: previous.k! >= previous.d! && current.k! < current.d!,
    recentHigh: Math.max(...recent.map((p) => p.high)),
    recentLow: Math.min(...recent.map((p) => p.low)),
  };
}
export function scoreSignal(
  direction: Direction,
  environment: Frame,
  setup: Frame,
  trigger: Frame,
  config: AnalysisConfig = analysisConfig,
): Score {
  const sign = direction === "LONG" ? 1 : -1;
  const reasons: Reason[] = [];
  const award = (frame: Frame, label: string, met: boolean, points: number) => {
    reasons.push({
      frame: frame.interval,
      label,
      met,
      points: met ? points : 0,
    });
    return met ? points : 0;
  };
  const w = config.weights;
  const extreme = (f: Frame) =>
    direction === "LONG"
      ? Math.min(f.current.rci!, f.previous.rci!, f.previous2.rci!) <=
        config.rciLow
      : Math.max(f.current.rci!, f.previous.rci!, f.previous2.rci!) >=
        config.rciHigh;
  const reversal = (f: Frame) =>
    direction === "LONG" ? f.rciReversalUp : f.rciReversalDown;
  const crossing = (f: Frame) =>
    direction === "LONG" ? f.rciCrossUp : f.rciCrossDown;
  const cross = (f: Frame) =>
    direction === "LONG" ? f.goldenCross : f.deadCross;
  const improvingKdj = (f: Frame) =>
    sign * (f.current.j! - f.previous.j!) > 0 &&
    (cross(f) ||
      sign * (f.current.k! - f.current.d! - (f.previous.k! - f.previous.d!)) >
        0);
  const improvingRsi = (f: Frame) =>
    sign * (f.current.rsi! - f.previous.rsi!) > 0;
  const near = (f: Frame) =>
    reversal(f) &&
    (direction === "LONG"
      ? f.current.rci! >= config.rciLow - config.rciNear &&
        f.current.rci! <= config.rciLow
      : f.current.rci! <= config.rciHigh + config.rciNear &&
        f.current.rci! >= config.rciHigh);
  const recoveringRsi = (f: Frame) =>
    improvingRsi(f) &&
    (direction === "LONG"
      ? f.previous.rsi! >= 20 && f.previous.rsi! <= 55
      : f.previous.rsi! >= 45 && f.previous.rsi! <= 80);
  const reclaim = (f: Frame) =>
    ["vwap", "ema20"].some((key) => {
      const k = key as "vwap" | "ema20";
      return (
        sign * (f.current.close - f.current[k]!) > 0 &&
        sign * (f.previous.close - f.previous[k]!) <= 0
      );
    });
  const environmentScore =
    award(
      environment,
      direction === "LONG"
        ? "EMA20 > EMA50・価格 > EMA20"
        : "EMA20 < EMA50・価格 < EMA20",
      environment.trend === (sign > 0 ? "UP" : "DOWN"),
      w.environment.trend,
    ) +
    award(
      environment,
      "EMA20の傾きが方向と一致",
      sign * environment.emaSlope > 0,
      w.environment.ema,
    ) +
    award(
      environment,
      "価格のVWAP位置が方向と一致",
      sign * (environment.current.close - environment.current.vwap!) > 0,
      w.environment.vwap,
    ) +
    award(
      environment,
      "RCIの傾きが方向と一致",
      sign * environment.rciSlope > 0,
      w.environment.rci,
    ) +
    award(
      environment,
      "ADXがトレンド基準以上",
      environment.current.adx! >= config.adxTrend &&
        environment.trend === (sign > 0 ? "UP" : "DOWN"),
      w.environment.adx,
    );
  const setupScore =
    award(
      setup,
      "RCIが直近3本で過熱水準に到達",
      extreme(setup),
      w.setup.extreme,
    ) +
    award(setup, "RCIが過熱水準から反転", reversal(setup), w.setup.reversal) +
    award(
      setup,
      "RCIが過熱水準を回復・回復直前",
      crossing(setup) || near(setup),
      w.setup.recovery,
    ) +
    award(setup, "KDJが改善", improvingKdj(setup), w.setup.kdj) +
    award(setup, "RSIが回復", recoveringRsi(setup), w.setup.rsi) +
    award(
      setup,
      "出来高が直前20本平均以上",
      setup.current.volumeRatio! >= 1,
      w.setup.volume,
    );
  const triggerScore =
    award(
      trigger,
      "RCIが過熱水準から反転",
      reversal(trigger),
      w.trigger.reversal,
    ) +
    award(
      trigger,
      "RCIが過熱水準を突破・突破直前",
      crossing(trigger) || near(trigger),
      crossing(trigger) ? w.trigger.recovery : w.trigger.recovery / 2,
    ) +
    award(
      trigger,
      direction === "LONG" ? "KDJゴールデンクロス" : "KDJデッドクロス",
      cross(trigger),
      w.trigger.kdj,
    ) +
    award(
      trigger,
      "RSIの傾きが方向と一致",
      improvingRsi(trigger),
      w.trigger.rsi,
    ) +
    award(
      trigger,
      direction === "LONG"
        ? "VWAPまたはEMA20を上抜け"
        : "VWAPまたはEMA20を下抜け",
      reclaim(trigger),
      w.trigger.reclaim,
    );
  const possible =
    Object.values(w.environment).reduce((a, b) => a + b, 0) +
    Object.values(w.setup).reduce((a, b) => a + b, 0) +
    Object.values(w.trigger).reduce((a, b) => a + b, 0);
  return {
    direction,
    total: Math.min(
      100,
      Math.round(
        (100 * (environmentScore + setupScore + triggerScore)) / possible,
      ),
    ),
    environment: environmentScore,
    setup: setupScore,
    trigger: triggerScore,
    reasons,
  };
}
export function classifySignal(
  score: number,
  direction: Direction,
  environment: Frame,
  config: AnalysisConfig = analysisConfig,
) {
  const counterTrend =
    environment.trend === (direction === "LONG" ? "DOWN" : "UP");
  const strength: "STRONG" | "NORMAL" | "WEAK" | "WAIT" =
    counterTrend || score < config.thresholds.weak
      ? "WAIT"
      : score >= config.thresholds.strong
        ? "STRONG"
        : score >= config.thresholds.normal
          ? "NORMAL"
          : "WEAK";
  return {
    signal: strength === "WAIT" ? ("WAIT" as const) : direction,
    strength,
    counterTrend,
  };
}
