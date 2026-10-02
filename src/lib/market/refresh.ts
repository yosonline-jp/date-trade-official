import "server-only";
import { createRoleClient } from "@/utils/supabase/server";
import { fetchYahooChart, jstDay, latestCandle } from "./provider";

const pending = new Map<string, Promise<void>>();
const validCode = /^[0-9A-Z]{4,5}$/;

/** Refreshes a symbol before reading it. The saved fetch date caps retries on closed markets. */
export async function ensureFreshStock(code: string): Promise<void> {
  if (!validCode.test(code)) return;
  const active = pending.get(code);
  if (active) return active;
  const job = refreshStock(code).finally(() => pending.delete(code));
  pending.set(code, job);
  return job;
}

async function refreshStock(code: string) {
  const db = await createRoleClient();
  const [chartResult, priceResult, stockResult] = await Promise.all([
    db
      .from("stock_charts")
      .select("id,fetched_at")
      .eq("code", code)
      .order("id")
      .limit(1)
      .maybeSingle(),
    db
      .from("daily_prices")
      .select("id,updated_at")
      .eq("code", code)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("stocks").select("code,name,market").eq("code", code).maybeSingle(),
  ]);
  if (chartResult.error || priceResult.error || stockResult.error)
    throw new Error("株価の更新日を確認できませんでした。");
  if (!stockResult.data) return;
  if (stockResult.data.market === "上場廃止") return;
  const today = jstDay();
  if (
    chartResult.data?.fetched_at &&
    priceResult.data?.updated_at &&
    jstDay(chartResult.data.fetched_at) === today &&
    jstDay(priceResult.data.updated_at) === today
  )
    return;

  const chart = await fetchYahooChart(`${code}.T`);
  const candle = latestCandle(chart);
  const now = new Date().toISOString();
  const quote = chart.indicators.quote[0];
  const previous = quote.close
    .slice(0, -1)
    .findLast((n) => typeof n === "number") as number | undefined;
  const change = previous == null ? null : candle.close - previous;
  const price = {
    code,
    short_name: stockResult.data.name,
    long_name: String(chart.meta.longName ?? stockResult.data.name),
    market: stockResult.data.market,
    currency: "JPY",
    regular_market_price: candle.close,
    regular_market_previous_close: previous ?? null,
    regular_market_open: candle.open,
    regular_market_high: candle.high,
    regular_market_low: candle.low,
    regular_market_volume: candle.volume,
    regular_market_change: change,
    regular_market_change_percent:
      change == null || !previous ? null : (change / previous) * 100,
    fifty_two_week_high:
      typeof chart.meta.fiftyTwoWeekHigh === "number"
        ? chart.meta.fiftyTwoWeekHigh
        : null,
    fifty_two_week_low:
      typeof chart.meta.fiftyTwoWeekLow === "number"
        ? chart.meta.fiftyTwoWeekLow
        : null,
    updated_at: now,
  };
  const chartWrite = chartResult.data
    ? db
        .from("stock_charts")
        .update({ data: chart, fetched_at: now })
        .eq("id", chartResult.data.id)
    : db.from("stock_charts").insert({ code, data: chart, fetched_at: now });
  const priceWrite = priceResult.data
    ? db.from("daily_prices").update(price).eq("id", priceResult.data.id)
    : db.from("daily_prices").insert(price);
  const [savedChart, savedPrice] = await Promise.all([chartWrite, priceWrite]);
  if (savedChart.error || savedPrice.error)
    throw new Error("Supabaseへの株価保存に失敗しました。");
}

export async function ensureFreshStocks(codes: string[]) {
  const unique = [...new Set(codes.filter((code) => validCode.test(code)))];
  const failed: string[] = [];
  for (let i = 0; i < unique.length; i += 4) {
    const batch = unique.slice(i, i + 4);
    const results = await Promise.allSettled(batch.map(ensureFreshStock));
    results.forEach((result, index) => {
      if (result.status === "rejected") failed.push(batch[index]);
    });
  }
  return failed;
}
