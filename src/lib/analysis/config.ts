export const analysisConfig = {
  rciPeriod: 7,
  kdjPeriod: 9,
  rsiPeriod: 14,
  atrPeriod: 14,
  adxPeriod: 14,
  emaPeriods: [20, 50, 100] as const,
  volumePeriod: 20,
  swingPeriod: 20,
  minimumBars: 120,
  adxTrend: 20,
  adxStrong: 25,
  rciLow: -80,
  rciHigh: 80,
  rciNear: 10,
  levels: [-80, -50, 0, 50, 80],
  thresholds: { strong: 80, normal: 65, weak: 50 },
  weights: {
    environment: { trend: 10, ema: 5, vwap: 5, rci: 5, adx: 5 },
    setup: { extreme: 5, reversal: 5, recovery: 5, kdj: 5, rsi: 5, volume: 5 },
    trigger: { reversal: 10, recovery: 10, kdj: 8, rsi: 6, reclaim: 6 },
  },
  similarity: {
    maxSamples: 40,
    minSamples: 8,
    maxDistance: 1.8,
    stride: 20,
    horizon: 20,
    returns: [1, 3, 5, 10, 20],
    // Feature units and weights can be tuned without changing the signal engine.
    scales: [100, 40, 50, 100, 100, 100, 2, 2, 1, 2, 2, 0.01, 3, 1, 1, 1],
    weights: [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
  },
  risk: {
    entryCrossWeight: 0.5,
    atrStop: 1,
    minimumRR: 1,
    tpAtr: [0.5, 1, 1.5],
    quantiles: [0.35, 0.6, 0.8],
    atrBuffer: 0.1,
  },
  provider: {
    historyDays: 29,
    chunkDays: 7,
    ttlMs: 60_000,
    maxCachedSymbols: 12,
    timeoutMs: 12_000,
  },
} as const;
type Widen<T> = T extends number
  ? number
  : T extends readonly number[]
    ? readonly number[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;
export type AnalysisConfig = Widen<typeof analysisConfig>;
