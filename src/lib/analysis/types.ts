export type Interval = "1m" | "5m" | "15m";
export type Direction = "LONG" | "SHORT";
export type Trend = "UP" | "DOWN" | "RANGE";
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type Stock = { code: string; name: string; market: string | null };
export type History = Record<Interval, Candle[]>;
export interface StockDataProvider {
  searchStocks(query: string): Promise<Stock[]>;
  getIntradayData(symbol: string, interval: Interval): Promise<Candle[]>;
}
export type IndicatorPoint = Candle & {
  rci: number | null;
  k: number | null;
  d: number | null;
  j: number | null;
  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  ema100: number | null;
  vwap: number | null;
  adx: number | null;
  atr: number | null;
  volumeRatio: number | null;
};
export type Frame = {
  interval: Interval;
  role: "Environment" | "Setup" | "Trigger";
  trend: Trend;
  current: IndicatorPoint;
  previous: IndicatorPoint;
  previous2: IndicatorPoint;
  rciSlope: number;
  rciCrossUp: boolean;
  rciCrossDown: boolean;
  rciReversalUp: boolean;
  rciReversalDown: boolean;
  goldenCross: boolean;
  deadCross: boolean;
  emaSlope: number;
  recentHigh: number;
  recentLow: number;
};
export type Reason = {
  label: string;
  met: boolean;
  frame: Interval;
  points: number;
};
export type Score = {
  direction: Direction;
  total: number;
  environment: number;
  setup: number;
  trigger: number;
  reasons: Reason[];
};
export type PriceRange = { low: number; expected: number; high: number };
export type Projection = {
  rci: number;
  expectedPrice: number | null;
  lowerPrice: number | null;
  upperPrice: number | null;
  probability: number | null;
  reached: number;
  samples: number;
  alreadyReached: boolean;
};
export type TakeProfit = PriceRange & {
  level: number;
  probability: number;
  riskReward: number;
};
export type Analog = {
  index: number;
  distance: number;
  path: IndicatorPoint[];
  base: number;
  originRci: number;
  returns: Record<number, number>;
};
export type MarketState = "OPEN" | "CLOSED" | "BREAK" | "STALE";
export type AnalysisResult = {
  symbol: string;
  name: string;
  currentPrice: number;
  analyzedAt: string;
  dataAt: string;
  signal: Direction | "WAIT";
  strength: "STRONG" | "NORMAL" | "WEAK" | "WAIT";
  scenarioDirection: Direction;
  counterTrend: boolean;
  score: number;
  confidence: number;
  scores: { long: Score; short: Score };
  entry: PriceRange | null;
  entryCondition: string;
  takeProfit: TakeProfit[];
  stopLoss: { price: number; riskPerShare: number; riskPercent: number } | null;
  rciProjection: Projection[];
  timeframes: { oneMinute: Frame; fiveMinute: Frame; fifteenMinute: Frame };
  charts: Record<Interval, IndicatorPoint[]>;
  levels: {
    pdh: number | null;
    pdl: number | null;
    dayHigh: number;
    dayLow: number;
  };
  statistics: {
    samples: number;
    horizonMinutes: number;
    returns: {
      minutes: number;
      mean: number | null;
      median: number | null;
      q25: number | null;
      q75: number | null;
    }[];
    maxDistance: number;
  };
  source: {
    provider: string;
    marketState: MarketState;
    delay: string;
    historyDays: number;
    bars: Record<Interval, number>;
    warnings: string[];
  };
  reasons: string[];
};
