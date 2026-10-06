import "server-only";

import type { TradeRecord } from "@/components/pages/dashboard/trade/stock-trade-tab";
import {
  getPersonalTradeSummary,
  type PersonalTradeSummary,
  type TradeProfitRow,
} from "@/lib/stock-trade-summary";
import { createClient, getRequestUser } from "@/utils/supabase/server";

export type StockTradeReviewData = {
  publicRecords: TradeRecord[];
  personalSummary: PersonalTradeSummary | null;
  historyUnavailable: boolean;
  summaryUnavailable: boolean;
};

const BATCH_SIZE = 1000;
const PUBLIC_RECORD_FIELDS =
  "id,stock_code,stock_name,buy_price,sell_price,quantity,profit,trade_date,memo,trade_type,type,created_at,visibility,users(id,account,nickname,avatar)";

type PageResponse<T> = { data: T[] | null; error: unknown };

// Stable, unique ordering and explicit ranges avoid Supabase's 1000-row cap.
// Discard the entire scope on failure so a partial result cannot look complete.
async function readAllPages<T>(
  readPage: (from: number, to: number) => PromiseLike<PageResponse<T>>,
): Promise<T[]> {
  const records: T[] = [];
  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await readPage(from, from + BATCH_SIZE - 1);
    if (error || !Array.isArray(data)) {
      throw new Error("Trade records unavailable");
    }
    records.push(...data);
    if (data.length < BATCH_SIZE) return records;
  }
}

async function readPublicHistory(code: string) {
  try {
    const supabase = await createClient();
    const records = await readAllPages<TradeRecord>((from, to) =>
      supabase
        .from("trade_records")
        .select(PUBLIC_RECORD_FIELDS)
        .eq("stock_code", code)
        .eq("visibility", "public")
        .order("id", { ascending: true })
        .returns<TradeRecord[]>()
        .range(from, to),
    );
    return {
      // Viewer RLS may also permit their private rows; this surface is public.
      records: records.filter((record) => record.visibility === "public"),
      unavailable: false,
    };
  } catch {
    return { records: [] as TradeRecord[], unavailable: true };
  }
}

async function readPersonalSummary(code: string) {
  let viewerId: string | null = null;
  try {
    const { data, error } = await getRequestUser();
    if (!error && typeof data.user?.id === "string" && data.user.id.trim()) {
      viewerId = data.user.id;
    }
  } catch {
    // An unverified or expired session must never trigger a private-data read.
  }
  if (!viewerId) {
    return { summary: null, unavailable: false };
  }

  try {
    const supabase = await createClient();
    const records = await readAllPages<TradeProfitRow>((from, to) =>
      supabase
        .from("trade_records")
        .select("user_id,type,profit")
        .eq("stock_code", code)
        .eq("user_id", viewerId)
        .order("id", { ascending: true })
        .range(from, to),
    );
    // The pure helper verifies ownership again and only returns aggregate values.
    return {
      summary: getPersonalTradeSummary(records, viewerId),
      unavailable: false,
    };
  } catch {
    return { summary: null, unavailable: true };
  }
}

export async function getStockTradeReviewData(
  code: string,
): Promise<StockTradeReviewData> {
  const [history, personal] = await Promise.all([
    readPublicHistory(code),
    readPersonalSummary(code),
  ]);
  return {
    publicRecords: history.records,
    personalSummary: personal.summary,
    historyUnavailable: history.unavailable,
    summaryUnavailable: personal.unavailable,
  };
}
