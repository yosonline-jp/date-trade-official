import Link from "next/link";
import { ArrowUpRight, Bot } from "lucide-react";
import { createRoleClient } from "@/utils/supabase/server";
import { PriceChart } from "@/components/workspace/price-chart";
export const dynamic = "force-dynamic";
export const metadata = { title: "Botモニター | デイトレード.net" };
const number = (v: unknown) =>
  v === null || v === undefined
    ? "—"
    : Number(v).toLocaleString("ja-JP", { maximumFractionDigits: 2 });
const dateTime = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export default async function BotTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; more?: string; bot?: string }>;
}) {
  const params = await searchParams;
  const requested = Number(params.more ?? 20);
  const limit = Number.isFinite(requested)
    ? Math.min(500, Math.max(20, Math.floor(requested)))
    : 20;
  const validDate =
    !!params.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.date) &&
    !Number.isNaN(Date.parse(`${params.date}T00:00:00+09:00`));
  const db = await createRoleClient();
  let snapshotsQuery = db
    .from("bot_performance_snapshots")
    .select(
      "bot_id, captured_at, current_equity_jpy, paper_balance_jpy, total_trades, win_rate, net_pnl_jpy",
    )
    .order("captured_at", { ascending: false })
    .limit(1);
  if (params.bot) snapshotsQuery = snapshotsQuery.eq("bot_id", params.bot);
  const { data: snapshot, error: snapshotError } =
    await snapshotsQuery.maybeSingle();
  const botId = snapshot?.bot_id ?? params.bot;
  let query = db
    .from("bot_trades")
    .select(
      "trade_id, bot_id, symbol, side, status, entry_price, entry_time, exit_price, exit_time, pnl_jpy",
      { count: "exact" },
    )
    .order("entry_time", { ascending: false })
    .limit(limit);
  if (botId) query = query.eq("bot_id", botId);
  if (validDate) {
    const start = Date.parse(`${params.date}T00:00:00+09:00`);
    query = query
      .gte("entry_time", new Date(start).toISOString())
      .lt("entry_time", new Date(start + 86400000).toISOString());
  }
  const [tradesResult, historyResult] = await Promise.all([
    query,
    botId
      ? db
          .from("bot_performance_snapshots")
          .select("captured_at,current_equity_jpy")
          .eq("bot_id", botId)
          .order("captured_at", { ascending: false })
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const points = (historyResult.data ?? [])
    .flatMap((item) =>
      item.current_equity_jpy === null
        ? []
        : [
            {
              time: Date.parse(item.captured_at) / 1000,
              close: Number(item.current_equity_jpy),
            },
          ],
    )
    .reverse();
  const next = new URLSearchParams();
  if (validDate) next.set("date", params.date!);
  if (botId) next.set("bot", botId);
  next.set("more", String(limit + 20));
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SYSTEMATIC TRADING</p>
          <h1>
            Botモニター<span className="heading-dot">.</span>
          </h1>
          <p>運用実績と約定履歴から、戦略のパフォーマンスを確認。</p>
        </div>
        <span className="terminal-button secondary">
          <Bot size={16} />
          {botId || "BOT"}
        </span>
      </div>
      <div className="market-meta">
        <span>保存済み運用データ</span>
        <span>最終記録 {dateTime(snapshot?.captured_at ?? null)} JST</span>
      </div>
      {(snapshotError || tradesResult.error || historyResult.error) && (
        <p role="alert" className="data-notice">
          運用データの一部を取得できませんでした。再度お試しください。
        </p>
      )}
      {params.date && !validDate && (
        <p role="alert" className="data-notice">
          日付を正しく入力してください。
        </p>
      )}
      <section className="bot-stats">
        {[
          ["純損益", snapshot?.net_pnl_jpy, "JPY"],
          ["口座評価額", snapshot?.current_equity_jpy, "JPY"],
          ["勝率", snapshot?.win_rate, "%"],
          ["取引回数", snapshot?.total_trades, "TRADES"],
        ].map(([label, value, unit]) => (
          <div className="index-card" key={String(label)}>
            <div>{label}</div>
            <strong>
              {number(value)} <small>{unit}</small>
            </strong>
          </div>
        ))}
      </section>
      <section className="terminal-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">EQUITY CURVE</p>
            <h2>口座評価額の推移</h2>
          </div>
        </div>
        <PriceChart points={points} label="口座評価額" />
      </section>
      <div className="page-heading mt-8">
        <div>
          <p className="eyebrow">EXECUTION HISTORY</p>
          <h2 className="text-xl mt-2">取引履歴</h2>
        </div>
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="bot" value={botId || ""} />
          <label className="text-xs text-muted-foreground">
            約定日（JST）
            <input
              className="block mt-2 rounded-md border bg-muted px-3 py-2 text-foreground"
              type="date"
              name="date"
              defaultValue={validDate ? params.date : ""}
            />
          </label>
          <button className="terminal-button secondary">絞り込む</button>
          {params.date && (
            <Link href="/bot-trades" className="text-xs py-3">
              解除
            </Link>
          )}
        </form>
      </div>
      <section className="terminal-panel">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>銘柄 / 売買</th>
                <th>エントリー</th>
                <th>決済</th>
                <th>損益（円）</th>
                <th>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {tradesResult.data?.map((trade) => (
                <tr key={trade.trade_id}>
                  <td>
                    <strong>{trade.symbol}</strong>
                    <p>
                      {trade.side} · {dateTime(trade.entry_time)}
                    </p>
                  </td>
                  <td>{number(trade.entry_price)}</td>
                  <td>{number(trade.exit_price)}</td>
                  <td
                    className={
                      Number(trade.pnl_jpy) < 0 ? "negative" : "positive"
                    }
                  >
                    {number(trade.pnl_jpy)}
                  </td>
                  <td>{trade.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!tradesResult.data?.length && (
          <p className="empty-copy">該当する取引はありません。</p>
        )}
      </section>
      {(tradesResult.count ?? 0) > limit && limit < 500 && (
        <Link
          href={`/bot-trades?${next}`}
          className="terminal-button secondary mt-5"
        >
          さらに20件表示 <ArrowUpRight size={15} />
        </Link>
      )}
      <p className="chart-footnote">
        履歴は最大500件、評価額は最新1000件を表示します。実運用・ペーパートレードの区分は運用設定に依存します。
      </p>
    </div>
  );
}
