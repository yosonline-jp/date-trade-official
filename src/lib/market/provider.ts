import "server-only";

export type YahooChart = {
  meta: Record<string, unknown>;
  timestamp: number[];
  indicators: {
    adjclose?: Array<{ adjclose: Array<number | null> }>;
    quote: Array<{
      open: Array<number | null>;
      high: Array<number | null>;
      low: Array<number | null>;
      close: Array<number | null>;
      volume: Array<number | null>;
    }>;
  };
};

export async function fetchYahooChart(
  symbol: string,
  range: "1mo" | "3mo" | "1y" = "1y",
): Promise<YahooChart> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d&includeAdjustedClose=true`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DaytradeWorkspace/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(`株価配信元が ${response.status} を返しました。`);
  const result = (await response.json())?.chart?.result?.[0] as
    YahooChart | undefined;
  const q = result?.indicators?.quote?.[0];
  if (
    !result ||
    !Array.isArray(result.timestamp) ||
    !q ||
    result.timestamp.length < (range === "1y" ? 2 : 1) ||
    !result.timestamp.some((_, i) =>
      (range === "1y"
        ? [q.open?.[i], q.high?.[i], q.low?.[i], q.close?.[i]]
        : [q.high?.[i], q.low?.[i], q.close?.[i]]
      ).every((n) => typeof n === "number" && Number.isFinite(n)),
    )
  ) {
    throw new Error("株価配信元のデータ形式が想定外です。");
  }
  return result;
}

export function latestCandle(chart: YahooChart) {
  const q = chart.indicators.quote[0];
  for (let i = chart.timestamp.length - 1; i >= 0; i--) {
    const [open, high, low, close] = [
      q.open[i],
      q.high[i],
      q.low[i],
      q.close[i],
    ];
    if (
      [open, high, low, close].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      )
    ) {
      return {
        timestamp: chart.timestamp[i],
        open: open as number,
        high: high as number,
        low: low as number,
        close: close as number,
        volume: q.volume?.[i] ?? null,
      };
    }
  }
  throw new Error("有効な四本値がありません。");
}

export function jstDay(value: string | number | Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
