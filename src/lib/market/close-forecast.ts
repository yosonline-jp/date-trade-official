import type { YahooChart } from "./provider";

export type ForecastBar = {
  timestamp: number;
  open: number | null;
  high: number;
  low: number;
  close: number;
};

export type CloseHistoryRange = "1mo" | "3mo";

export type CloseForecast = {
  targetTimestamp: number;
  startPrice: number;
  startPriceSource: "open" | "close";
  analysisClose: number;
  predictedClose: number;
  changePercent: number;
  score: number;
  dataPoints: number;
  indicators: {
    ema5: number;
    ema20: number;
    rsi14: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    atr14: number | null;
    atrPercent: number;
  };
  ruleScores: { trend: number; rsi: number; macd: number };
};

export type StockCloseAnalysis = CloseForecast & {
  code: string;
  name: string;
  tradingDate: string;
  analyzedAt: string;
  historyRange: CloseHistoryRange;
  isCurrentDate: boolean;
};

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Match yfinance auto_adjust=True, then drop missing Close/High/Low rows. */
export function forecastBars(chart: YahooChart): ForecastBar[] {
  const quote = chart.indicators?.quote?.[0];
  if (!quote || !Array.isArray(chart.timestamp)) return [];
  const adjusted = chart.indicators.adjclose?.[0]?.adjclose;
  return chart.timestamp
    .flatMap((timestamp, i) => {
      const close = quote.close?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const adjustedClose = adjusted ? adjusted[i] : close;
      if (
        !finite(timestamp) ||
        !finite(close) ||
        close <= 0 ||
        !finite(high) ||
        !finite(low) ||
        !finite(adjustedClose) ||
        adjustedClose <= 0
      )
        return [];
      const ratio = adjustedClose / close;
      const open = quote.open?.[i];
      return [
        {
          timestamp,
          open: finite(open) ? open * ratio : null,
          high: high * ratio,
          low: low * ratio,
          close: adjustedClose,
        },
      ];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function ema(values: number[], alpha: number): number[] {
  let previous = values[0];
  return values.map((value, i) => {
    // pandas preserves a constant series exactly instead of introducing rounding drift.
    if (i === 0) previous = value;
    else if (previous !== value)
      previous = (1 - alpha) * previous + alpha * value;
    return previous;
  });
}

/** pandas ewm(alpha=1/14, adjust=False) starts at the first non-NaN delta. */
function latestRsi(closes: number[]): number {
  if (closes.length < 2) return 50;
  const deltas = closes.slice(1).map((close, i) => close - closes[i]);
  const gains = ema(
    deltas.map((delta) => Math.max(delta, 0)),
    1 / 14,
  );
  const losses = ema(
    deltas.map((delta) => Math.max(-delta, 0)),
    1 / 14,
  );
  const gain = gains[gains.length - 1];
  const loss = losses[losses.length - 1];
  if (gain === 0 && loss === 0) return 50;
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

/** Port of StockAnalysis.app.analyze_nikkei225_component and its price estimator. */
export function calculateCloseForecast(bars: ForecastBar[]): CloseForecast {
  if (!bars.length) throw new Error("分析に必要な日足データがありません。");
  const closes = bars.map((bar) => bar.close);
  const last = bars[bars.length - 1];
  const ema5 = ema(closes, 2 / (5 + 1));
  const ema20 = ema(closes, 2 / (20 + 1));
  const fast = ema(closes, 2 / (12 + 1));
  const slow = ema(closes, 2 / (26 + 1));
  const macd = fast.map((value, i) => value - slow[i]);
  const signal = ema(macd, 2 / (9 + 1));
  const index = bars.length - 1;
  const histogram = macd[index] - signal[index];
  const rsi14 = latestRsi(closes);
  const trueRanges = bars.map((bar, i) =>
    i === 0
      ? bar.high - bar.low
      : Math.max(
          bar.high - bar.low,
          Math.abs(bar.high - bars[i - 1].close),
          Math.abs(bar.low - bars[i - 1].close),
        ),
  );
  const atr14 =
    bars.length < 14
      ? null
      : trueRanges.slice(-14).reduce((sum, value) => sum + value, 0) / 14;
  const atrRatio = atr14 === null ? 0 : atr14 / Math.max(1e-9, last.close);
  const trendScore =
    last.close > ema5[index] && ema5[index] > ema20[index]
      ? 2
      : last.close < ema5[index] && ema5[index] < ema20[index]
        ? -2
        : 0;
  const rsiScore = rsi14 >= 56 ? 1 : rsi14 <= 44 ? -1 : 0;
  const macdScore =
    histogram > 0 && macd[index] > signal[index]
      ? 1
      : histogram < 0 && macd[index] < signal[index]
        ? -1
        : 0;
  const score = trendScore + rsiScore + macdScore;
  const startPrice = last.open ?? last.close;
  // "日経平均": base 0.012, score step 0.005, score cap 0.08, ATR cap 0.05.
  const expectedMove = Math.max(
    0.012,
    Math.min(0.08, Math.abs(score) * 0.005) +
      Math.min(0.05, Math.max(0, atrRatio) * 0.5),
  );
  const signedMove = Math.sign(score) * expectedMove;
  return {
    targetTimestamp: last.timestamp,
    startPrice,
    startPriceSource: last.open === null ? "close" : "open",
    analysisClose: last.close,
    predictedClose: startPrice * (1 + signedMove),
    changePercent: signedMove * 100,
    score,
    dataPoints: bars.length,
    indicators: {
      ema5: ema5[index],
      ema20: ema20[index],
      rsi14,
      macd: macd[index],
      macdSignal: signal[index],
      macdHistogram: histogram,
      atr14,
      atrPercent: atrRatio * 100,
    },
    ruleScores: { trend: trendScore, rsi: rsiScore, macd: macdScore },
  };
}

export async function analyzeCloseHistory(
  fetchHistory: (range: CloseHistoryRange) => Promise<YahooChart>,
) {
  let historyRange: CloseHistoryRange = "1mo";
  let bars = forecastBars(await fetchHistory(historyRange));
  if (bars.length < 18) {
    historyRange = "3mo";
    bars = forecastBars(await fetchHistory(historyRange));
  }
  return { ...calculateCloseForecast(bars), historyRange };
}
