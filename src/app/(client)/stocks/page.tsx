import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ensureFreshStocks } from "@/lib/market/refresh";
export const dynamic = "force-dynamic";
export const metadata = { title: "日本株を探す | デイトレード.net" };
export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = (params.q || "")
    .trim()
    .slice(0, 80)
    .replace(/[%_,().]/g, "");
  const requested = Number(params.page ?? 1);
  const page = Number.isFinite(requested)
    ? Math.max(1, Math.min(1000, Math.floor(requested)))
    : 1;
  const db = await createClient();
  let query = db
    .from("stocks")
    .select("code,name,market", { count: "exact" })
    .neq("market", "上場廃止")
    .order("code")
    .range((page - 1) * 24, page * 24 - 1);
  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  const { data, error, count } = await query;
  const refreshFailed = await ensureFreshStocks(
    data?.map((stock) => stock.code) ?? [],
  );
  const { data: prices } = data?.length
    ? await db
        .from("daily_prices")
        .select("code,regular_market_price,updated_at")
        .in(
          "code",
          data.map((stock) => stock.code),
        )
    : { data: [] };
  const priceByCode = new Map(prices?.map((item) => [item.code, item]));
  const pageLink = (n: number) =>
    `/stocks?q=${encodeURIComponent(search)}&page=${n}`;
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EQUITY EXPLORER</p>
          <h1>
            日本株を探す<span className="heading-dot">.</span>
          </h1>
          <p>気になる企業から、新しいトレードの可能性を。</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {(count ?? 0).toLocaleString()} 銘柄
        </span>
      </div>
      <form className="cms-search">
        <label className="sr-only" htmlFor="stock-search">
          銘柄名・コード
        </label>
        <input
          id="stock-search"
          name="q"
          defaultValue={params.q}
          maxLength={80}
          placeholder="銘柄名・コードで検索（例：トヨタ、7203）"
        />
        <button className="terminal-button">
          <Search size={16} />
          検索
        </button>
      </form>
      {refreshFailed.length > 0 && (
        <p role="status" className="data-notice">
          {refreshFailed.length}
          銘柄の当日データを取得できませんでした。表示中の株価には更新日を併記しています。
        </p>
      )}
      <section className="terminal-panel">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>コード</th>
                <th>銘柄名</th>
                <th>市場</th>
                <th>株価</th>
                <th>チャート</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((stock) => (
                <tr key={stock.code}>
                  <td className="tabular-nums">{stock.code}</td>
                  <td>
                    <Link href={`/stocks/${stock.code}`}>
                      {stock.name}
                      <ArrowUpRight size={14} />
                    </Link>
                  </td>
                  <td>{stock.market || "—"}</td>
                  <td className="tabular-nums">
                    {priceByCode.get(stock.code)?.regular_market_price != null
                      ? `¥${Number(priceByCode.get(stock.code)?.regular_market_price).toLocaleString("ja-JP")}`
                      : "—"}
                    {priceByCode.get(stock.code)?.updated_at && (
                      <small className="block text-muted-foreground">
                        更新{" "}
                        {new Date(
                          priceByCode.get(stock.code)!.updated_at,
                        ).toLocaleDateString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                        })}
                      </small>
                    )}
                  </td>
                  <td>
                    <Link href={`/chart?code=${stock.code}`}>
                      チャートを見る <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? (
          <p role="alert" className="empty-copy">
            銘柄を取得できませんでした。再度お試しください。
          </p>
        ) : (
          !data?.length && (
            <p className="empty-copy">
              該当する銘柄はありません。検索条件を変更してください。
            </p>
          )
        )}
      </section>
      <nav
        aria-label="ページ切り替え"
        className="flex justify-between items-center mt-6"
      >
        <div>
          {page > 1 && (
            <Link
              className="terminal-button secondary"
              href={pageLink(page - 1)}
            >
              前のページ
            </Link>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {page} / {Math.max(1, Math.ceil((count ?? 0) / 24))}
        </span>
        <div>
          {page * 24 < (count ?? 0) && (
            <Link
              className="terminal-button secondary"
              href={pageLink(page + 1)}
            >
              次のページ
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
