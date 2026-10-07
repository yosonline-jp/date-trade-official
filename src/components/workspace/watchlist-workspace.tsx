import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { signInUrl } from "@/lib/auth/redirect";
import { createClient, getRequestUser } from "@/utils/supabase/server";
import { ensureFreshStocks } from "@/lib/market/refresh";
import { watchlistSeries } from "@/lib/market/watchlist-series";
import WatchlistTable from "@/components/watchlist-list";
import type { CandleRaw } from "@/components/mini-candle-chart";

export async function WatchlistWorkspace() {
  const {
    data: { user },
    error: authError,
  } = await getRequestUser();
  if (authError || !user?.id?.trim())
    return (
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR FOCUS LIST</p>
          <h1>ウォッチリスト</h1>
          <p>
            注目銘柄の株価とチャートをまとめて確認できます。登録にはログインが必要です。
          </p>
        </div>
        <Link className="terminal-button" href={signInUrl("/watchlist")}>
          ログイン <ArrowUpRight size={15} />
        </Link>
      </div>
    );
  const db = await createClient();
  const [watchlistResult, notesResult] = await Promise.all([
    db
      .from("watchlist")
      .select("id,stock_code,stock_name,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    db
      .from("watchlist_notes")
      .select("stock_code,category,note,target_price")
      .eq("user_id", user.id),
  ]);
  const { data: watchlist, error } = watchlistResult;
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
  for (const row of chartsResult.data ?? [])
    candlesList[row.code] = watchlistSeries(row.data);
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
