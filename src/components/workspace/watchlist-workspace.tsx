import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ensureFreshStocks } from "@/lib/market/refresh";
import WatchlistTable from "@/components/watchlist-list";
import type { CandleRaw } from "@/components/mini-candle-chart";

export async function WatchlistWorkspace() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return (
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR FOCUS LIST</p>
          <h1>ウォッチリスト</h1>
          <p>注目銘柄の株価とチャートをまとめて確認できます。</p>
        </div>
        <Link className="terminal-button" href="/sign-in">
          ログイン <ArrowUpRight size={15} />
        </Link>
      </div>
    );
  const { data: watchlist, error } = await db
    .from("watchlist")
    .select("id,stock_code,stock_name,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const notesResult = await db
    .from("watchlist_notes")
    .select("stock_code,category,note,target_price")
    .eq("user_id", user.id);
  const codes = watchlist?.map((item) => item.stock_code) ?? [];
  const refreshFailed = await ensureFreshStocks(codes);
  const [chartsResult, pricesResult] = await Promise.all([
    codes.length
      ? db.from("stock_charts").select("code,data").in("code", codes)
      : Promise.resolve({ data: [], error: null }),
    codes.length
      ? db
          .from("daily_prices")
          .select(
            "code,regular_market_price,regular_market_change_percent,updated_at",
          )
          .in("code", codes)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const candlesList: Record<string, CandleRaw[]> = {};
  for (const row of chartsResult.data ?? []) {
    const quote = row.data?.indicators?.quote?.[0];
    candlesList[row.code] = (row.data?.timestamp ?? []).flatMap(
      (ts: number, i: number) => {
        const candle = {
          ts,
          open: quote?.open?.[i],
          high: quote?.high?.[i],
          low: quote?.low?.[i],
          close: quote?.close?.[i],
        };
        return Object.values(candle).every(
          (n) => typeof n === "number" && Number.isFinite(n),
        )
          ? [candle as CandleRaw]
          : [];
      },
    );
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR FOCUS LIST</p>
          <h1>
            ウォッチリスト<span className="heading-dot">.</span>
          </h1>
          <p>注目銘柄の当日取得データと値動きを確認できます。</p>
        </div>
        <Link className="terminal-button secondary" href="/stocks">
          銘柄を追加 <ArrowUpRight size={15} />
        </Link>
      </div>
      {(error ||
        chartsResult.error ||
        pricesResult.error ||
        notesResult.error) && (
        <p className="data-notice" role="alert">
          一部のデータを取得できませんでした。
        </p>
      )}
      {refreshFailed.length > 0 && (
        <p className="data-notice" role="status">
          {refreshFailed.length}
          銘柄の当日データを取得できませんでした。チャートの最終取引日をご確認ください。
        </p>
      )}
      <WatchlistTable
        notes={notesResult.data ?? []}
        watchlist={watchlist ?? []}
        candlesList={candlesList}
        prices={pricesResult.data ?? []}
      />
    </div>
  );
}
