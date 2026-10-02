import "server-only";
import { createRoleClient } from "@/utils/supabase/server";
import { fetchYahooChart, jstDay, latestCandle } from "./provider";
import type { MarketIndex } from "./overview";

const JPX400_CSV =
  "https://indexes.nikkei.co.jp/nkave/historical/jpx_nikkei_index_400_daily_jp.csv";
const TOPIX_PAGE = "https://finance.yahoo.co.jp/quote/998405.T";
let pending: Promise<void> | undefined;
const number = (value: number) =>
  value.toLocaleString("ja-JP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const index = (name: string, close: number, previous: number): MarketIndex => ({
  name,
  price: number(close),
  change: `${close - previous >= 0 ? "+" : ""}${number(close - previous)}`,
  percentChange: `${previous ? (((close - previous) / previous) * 100).toFixed(2) : "0.00"}%`,
});

async function nikkei225() {
  const chart = await fetchYahooChart("^N225");
  const last = latestCandle(chart);
  const closes = chart.indicators.quote[0].close.filter(
    (v): v is number => typeof v === "number",
  );
  return index("日経225", last.close, closes.at(-2) ?? last.close);
}

async function jpx400() {
  const response = await fetch(JPX400_CSV, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("JPX日経400を取得できませんでした。");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 150000)
    throw new Error("JPX日経400のサイズが想定外です。");
  const text = new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
  const rows = [...text.matchAll(/^"(\d{4}\/\d{2}\/\d{2})","([\d.]+)"/gm)];
  if (rows.length < 2) throw new Error("JPX日経400の形式が想定外です。");
  const last = rows.at(-1)!;
  const previous = rows.at(-2)!;
  const age =
    Date.now() - Date.parse(`${last[1].replaceAll("/", "-")}T00:00:00+09:00`);
  if (age > 7 * 86400000) throw new Error("JPX日経400の日付が古すぎます。");
  return index("JPX日経400", Number(last[2]), Number(previous[2]));
}

async function topix() {
  const response = await fetch(`https://r.jina.ai/${TOPIX_PAGE}`, {
    cache: "no-store",
    headers: { "X-No-Cache": "true" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("TOPIXを取得できませんでした。");
  const text = await response.text();
  const match = text.match(
    /## TOPIX\s+998405\.T[\s\S]{0,300}?\n([\d,]+\.\d{2})\s+前日比([+-]?[\d,]+\.\d{2})\(([+-]?[\d.]+)%\)/,
  );
  if (!text.includes(`URL Source: ${TOPIX_PAGE}`) || !match)
    throw new Error("TOPIXの形式が想定外です。");
  const close = Number(match[1].replaceAll(",", ""));
  const change = Number(match[2].replaceAll(",", ""));
  if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(change))
    throw new Error("TOPIXの数値が不正です。");
  return index("TOPIX", close, close - change);
}

export async function ensureFreshIndices() {
  if (pending) return pending;
  pending = refresh().finally(() => {
    pending = undefined;
  });
  return pending;
}

async function refresh() {
  const db = await createRoleClient();
  const { data, error } = await db
    .from("useful_data")
    .select("updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error("指数の更新日を確認できませんでした。");
  if (data?.updated_at && jstDay(data.updated_at) === jstDay()) return;
  const results = await Promise.allSettled([nikkei225(), topix(), jpx400()]);
  const indices = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (!indices.length) throw new Error("指数を更新できませんでした。");
  const { error: savedError } = await db
    .from("useful_data")
    .update({ data: indices, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (savedError) throw new Error("指数を保存できませんでした。");
}
