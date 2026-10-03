import "server-only";
import { createClient, getRequestUser } from "@/utils/supabase/server";
import { ensureFreshStock } from "./refresh";

/** Read independent detail data together; price/chart reads wait for refresh. */
export async function getStockDetail(code: string) {
  const db = await createClient();
  const refreshed = ensureFreshStock(code).catch(() => undefined);
  const [auth, stock, price, chart] = await Promise.all([
    getRequestUser(),
    db
      .from("stocks")
      .select(
        `code,name,market,comments:stock_comments(
      id,user_id:users(id,account,nickname,avatar),comment,created_at
    )`,
      )
      .eq("code", code)
      .single(),
    refreshed.then(() =>
      db
        .from("daily_prices")
        .select(
          "regular_market_price,regular_market_previous_close,regular_market_open,regular_market_high,regular_market_low,regular_market_volume,regular_market_change_percent,trailing_pe,price_to_book,dividend_yield,market_cap,updated_at",
        )
        .eq("code", code)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single(),
    ),
    refreshed.then(() =>
      db
        .from("stock_charts")
        .select("data")
        .eq("code", code)
        .order("id", { ascending: true })
        .single(),
    ),
  ]);
  return {
    user: auth.data,
    stock: stock.data,
    stockError: stock.error,
    price: price.data,
    priceError: price.error,
    chartData: chart.data,
    chartError: chart.error,
  };
}
