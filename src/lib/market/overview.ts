import { createClient } from "@/utils/supabase/server";
import type { PricePoint } from "@/components/workspace/price-chart";
import { ensureFreshIndices } from "./indices";
import { ensureFreshStock } from "./refresh";
import { SHOW_MARKET_NEWS } from "@/lib/features";
export type MarketIndex = {
  name: string;
  price: string;
  change: string;
  percentChange: string;
};
export async function getMarketOverview() {
  const refreshed = await Promise.allSettled([
    ensureFreshIndices(),
    ensureFreshStock("7203"),
  ]);
  const db = await createClient();
  const [indices, chart, news, stocks] = await Promise.all([
    db.from("useful_data").select("data, updated_at").eq("id", 1).maybeSingle(),
    db
      .from("stock_charts")
      .select("data")
      .eq("code", "7203")
      .limit(1)
      .maybeSingle(),
    SHOW_MARKET_NEWS
      ? db
          .from("news")
          .select("id, header, created_at")
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [], error: null }),
    db
      .from("stocks")
      .select("code, name, market")
      .in("code", ["7203", "6758", "9984", "8306", "8035"]),
  ]);
  const raw = chart.data?.data;
  const timestamps: unknown[] = raw?.timestamp ?? [];
  const closes: unknown[] = raw?.indicators?.quote?.[0]?.close ?? [];
  const points: PricePoint[] = timestamps.flatMap((time, i) =>
    typeof time === "number" && typeof closes[i] === "number"
      ? [{ time, close: closes[i] as number }]
      : [],
  );
  return {
    indices: (Array.isArray(indices.data?.data)
      ? indices.data.data
      : []) as MarketIndex[],
    updatedAt: indices.data?.updated_at as string | undefined,
    points,
    news: news.data ?? [],
    stocks: stocks.data ?? [],
    unavailable:
      refreshed.some((result) => result.status === "rejected") ||
      !Array.isArray(indices.data?.data) ||
      indices.data.data.length < 3 ||
      !!(indices.error || chart.error || news.error || stocks.error),
  };
}
