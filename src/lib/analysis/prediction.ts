import { analysisConfig, type AnalysisConfig } from "./config";
import { quantile } from "./similarity";
import type {
  Analog,
  Direction,
  Frame,
  PriceRange,
  Projection,
  TakeProfit,
} from "./types";

export function entryPrediction(
  current: Frame,
  analogs: Analog[],
  direction: Direction,
  config: AnalysisConfig = analysisConfig,
): PriceRange | null {
  if (analogs.length < config.similarity.minSamples || !current.current.atr)
    return null;
  const price = current.current.close,
    atr = current.current.atr;
  const changes = analogs.map((a) => a.returns[3]);
  const threshold = direction === "LONG" ? config.rciLow : config.rciHigh;
  const sign = direction === "LONG" ? 1 : -1;
  const crosses = analogs.flatMap((sample) => {
    if (sign * (sample.originRci - threshold) >= 0) return [];
    const reached = sample.path
      .slice(0, 3)
      .find((p) => p.rci !== null && sign * (p.rci - threshold) > 0);
    return reached ? [reached.close / sample.base - 1] : [];
  });
  const baseline = quantile(changes, 0.5)!;
  const medianChange =
    crosses.length >= 3
      ? baseline * (1 - config.risk.entryCrossWeight) +
        quantile(crosses, 0.5)! * config.risk.entryCrossWeight
      : baseline;
  const low = price * (1 + quantile(changes, 0.25)!);
  const high = price * (1 + quantile(changes, 0.75)!);
  const estimates = [
    price,
    price * (1 + medianChange),
    current.current.vwap!,
    current.current.ema20!,
    direction === "LONG" ? current.recentHigh : current.recentLow,
  ].filter((n) => Number.isFinite(n) && Math.abs(n - price) <= 2 * atr);
  const expected = (price * (1 + medianChange) + quantile(estimates, 0.5)!) / 2;
  return {
    low: Math.max(0.01, Math.min(low, expected - config.risk.atrBuffer * atr)),
    expected,
    high: Math.max(high, expected + config.risk.atrBuffer * atr),
  };
}
/** Conservative OHLC simulation: when stop and target share a bar, stop wins. */
export function targetReached(
  analog: Analog,
  entryRatio: number,
  targetRatio: number,
  stopRatio: number,
  direction: Direction,
): boolean {
  const entry = analog.base * entryRatio,
    target = analog.base * targetRatio,
    stop = analog.base * stopRatio;
  let entered = false;
  for (let i = 0; i < analog.path.length; i++) {
    const bar = analog.path[i];
    let justEntered = false;
    if (!entered) {
      if (i >= 3) return false;
      if (bar.low > entry || bar.high < entry) continue;
      entered = true;
      justEntered = true;
    }
    if (direction === "LONG" ? bar.low <= stop : bar.high >= stop) return false;
    // If entry is intrabar, the target may have occurred before the fill.
    if (justEntered && Math.abs(bar.open - entry) > 1e-9) continue;
    if (direction === "LONG" ? bar.high >= target : bar.low <= target)
      return true;
  }
  return false;
}
export function pricePlan(
  frame: Frame,
  analogs: Analog[],
  direction: Direction,
  structuralLevels: number[],
  config: AnalysisConfig = analysisConfig,
) {
  const entry = entryPrediction(frame, analogs, direction, config);
  if (!entry) return { entry: null, takeProfit: [], stopLoss: null };
  const sign = direction === "LONG" ? 1 : -1,
    atr = frame.current.atr!,
    price = frame.current.close;
  const swingStop =
    direction === "LONG"
      ? frame.recentLow - config.risk.atrBuffer * atr
      : frame.recentHigh + config.risk.atrBuffer * atr;
  const atrStop = entry.expected - sign * atr * config.risk.atrStop;
  const stop = Math.max(
    0.01,
    direction === "LONG"
      ? Math.min(atrStop, swingStop)
      : Math.max(atrStop, swingStop),
  );
  const risk = Math.abs(entry.expected - stop);
  const excursions = analogs.map(
    (a) =>
      Math.max(
        0,
        ...a.path.map((p) =>
          direction === "LONG" ? p.high / a.base - 1 : 1 - p.low / a.base,
        ),
      ) * price,
  );
  const levels = structuralLevels
    .map((n) => sign * (n - entry.expected))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  let previous = 0;
  const takeProfit: TakeProfit[] = config.risk.tpAtr.map((multiple, index) => {
    const fraction = config.risk.quantiles[index];
    let distance = (atr * multiple + quantile(excursions, fraction)!) / 2;
    if (levels[index] != null) distance = (distance + levels[index]) / 2;
    distance = Math.max(distance, previous + atr * config.risk.atrBuffer);
    previous = distance;
    const expected = Math.max(0.01, entry.expected + sign * distance);
    const a =
      entry.expected +
      sign *
        Math.max(
          atr * config.risk.atrBuffer,
          quantile(excursions, Math.max(0, fraction - 0.15))!,
        );
    const b =
      entry.expected +
      sign *
        Math.max(
          atr * config.risk.atrBuffer,
          quantile(excursions, Math.min(1, fraction + 0.15))!,
        );
    const probability =
      (100 *
        analogs.filter((sample) =>
          targetReached(
            sample,
            entry.expected / price,
            expected / price,
            stop / price,
            direction,
          ),
        ).length) /
      analogs.length;
    return {
      level: index + 1,
      expected,
      low: Math.max(0.01, Math.min(a, b, expected)),
      high: Math.max(a, b, expected),
      probability,
      riskReward: risk > 0 ? Math.abs(expected - entry.expected) / risk : 0,
    };
  });
  return {
    entry,
    takeProfit,
    stopLoss: {
      price: stop,
      riskPerShare: risk,
      riskPercent: (100 * risk) / entry.expected,
    },
  };
}
export function rciProjection(
  frame: Frame,
  analogs: Analog[],
  direction: Direction,
  config: AnalysisConfig = analysisConfig,
): Projection[] {
  const sign = direction === "LONG" ? 1 : -1;
  const levels =
    direction === "LONG" ? [...config.levels] : [...config.levels].reverse();
  return levels.map((level) => {
    const alreadyReached = sign * (frame.current.rci! - level) >= 0;
    const eligible = analogs.filter((a) => sign * (a.originRci - level) < 0);
    const hits = eligible.flatMap((a) => {
      const reached = a.path.find(
        (p) => p.rci !== null && sign * (p.rci - level) >= 0,
      );
      return reached ? [reached.close / a.base - 1] : [];
    });
    const valid =
      !alreadyReached && eligible.length >= config.similarity.minSamples;
    const priceValid = valid && hits.length >= 3;
    return {
      rci: level,
      alreadyReached,
      samples: eligible.length,
      reached: hits.length,
      probability: valid ? (100 * hits.length) / eligible.length : null,
      expectedPrice: priceValid
        ? frame.current.close * (1 + quantile(hits, 0.5)!)
        : null,
      lowerPrice: priceValid
        ? frame.current.close * (1 + quantile(hits, 0.25)!)
        : null,
      upperPrice: priceValid
        ? frame.current.close * (1 + quantile(hits, 0.75)!)
        : null,
    };
  });
}
