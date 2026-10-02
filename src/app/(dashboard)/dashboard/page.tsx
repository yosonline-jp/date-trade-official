import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PriceChart } from "@/components/workspace/price-chart";
export default async function DashboardPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const [profile, result] = await Promise.all([
    db.from("users").select("nickname").eq("id", user.id).maybeSingle(),
    db
      .from("trade_records")
      .select("id,profit,stock_code,stock_name,trade_date,trade_type", {
        count: "exact",
      })
      .eq("user_id", user.id)
      .eq("type", "real")
      .gte("trade_date", since)
      .order("trade_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1000),
  ]);
  const trades = result.data ?? [];
  const net = trades.reduce((sum, t) => sum + Number(t.profit || 0), 0);
  const wins = trades.filter((t) => Number(t.profit) > 0).length;
  const daily = new Map<string, number>();
  [...trades]
    .reverse()
    .forEach((t) =>
      daily.set(
        t.trade_date,
        (daily.get(t.trade_date) ?? 0) + Number(t.profit || 0),
      ),
    );
  let running = 0;
  const points = [...daily].map(([day, profit]) => ({
    time: Date.parse(`${day}T00:00:00+09:00`) / 1000,
    close: (running += profit),
  }));
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MY TRADING JOURNAL</p>
          <h1>
            マイダッシュボード<span className="heading-dot">.</span>
          </h1>
          <p>
            {profile.data?.nickname || "トレーダー"}
            さん、日々の記録から次のトレードを考えましょう。
          </p>
        </div>
        <Link href="/dashboard/trade-records" className="terminal-button">
          <Plus size={16} />
          取引を記録
        </Link>
      </div>
      {result.error && (
        <p className="data-notice" role="alert">
          取引データを取得できませんでした。
        </p>
      )}
      <div className="market-meta">
        <span>直近90日 · 実取引</span>
        <span>
          最新{trades.length}件
          {(result.count ?? 0) > 1000 ? "（集計上限1000件）" : ""}
        </span>
      </div>
      <section className="index-grid">
        {[
          ["累積損益", `¥${net.toLocaleString("ja-JP")}`],
          [
            "勝率",
            trades.length
              ? `${((wins / trades.length) * 100).toFixed(1)}%`
              : "—",
          ],
          ["取引回数", trades.length.toLocaleString("ja-JP")],
        ].map(([title, value]) => (
          <div className="index-card" key={title}>
            <div>{title}</div>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
      <section className="terminal-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PERFORMANCE</p>
            <h2>累積損益の推移</h2>
          </div>
          <Link href="/dashboard/profit-calendar" className="text-link">
            収支カレンダー <ArrowUpRight size={15} />
          </Link>
        </div>
        <PriceChart points={points} label="累積損益" />
      </section>
      <div className="page-heading mt-9">
        <div>
          <p className="eyebrow">RECENT TRADES</p>
          <h2 className="text-xl mt-3">最近の取引</h2>
        </div>
        <Link href="/dashboard/trade-records" className="text-link">
          すべて見る <ArrowUpRight size={15} />
        </Link>
      </div>
      <section className="terminal-panel">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>取引日</th>
                <th>銘柄</th>
                <th>売買区分</th>
                <th>損益（円）</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 8).map((t) => (
                <tr key={t.id}>
                  <td>{t.trade_date}</td>
                  <td>
                    <Link href={`/stocks/${t.stock_code}`}>{t.stock_name}</Link>
                  </td>
                  <td>{t.trade_type}</td>
                  <td
                    className={Number(t.profit) < 0 ? "negative" : "positive"}
                  >
                    {Number(t.profit).toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!trades.length && (
          <p className="empty-copy">
            取引記録はまだありません。「取引を記録」から最初のトレードを登録できます。
          </p>
        )}
      </section>
    </div>
  );
}
