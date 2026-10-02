import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CandleChart, { type CandleRaw } from "@/components/stock-candle-chart";
import { createClient } from "@/utils/supabase/server";
import { ensureFreshStock } from "@/lib/market/refresh";
export const dynamic = "force-dynamic";
export const metadata = { title: "株価チャート | デイトレード.net" };
export default async function ChartPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = /^[0-9A-Z]{4,5}$/.test(params.code ?? "")
    ? params.code!
    : "7203";
  const refreshError = await ensureFreshStock(code)
    .then(() => false)
    .catch(() => true);
  const db = await createClient();
  const [stock, result] = await Promise.all([
    db.from("stocks").select("name,code,market").eq("code", code).maybeSingle(),
    db
      .from("stock_charts")
      .select("data")
      .eq("code", code)
      .limit(1)
      .maybeSingle(),
  ]);
  const raw = result.data?.data;
  const quote = raw?.indicators?.quote?.[0];
  const candles: CandleRaw[] = (raw?.timestamp ?? [])
    .map((ts: number, i: number) => ({
      ts,
      open: quote?.open?.[i],
      high: quote?.high?.[i],
      low: quote?.low?.[i],
      close: quote?.close?.[i],
    }))
    .filter((v: CandleRaw) =>
      [v.open, v.high, v.low, v.close].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      ),
    );
  const latest = candles.at(-1);
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PRICE ACTION</p>
          <h1>
            株価チャート<span className="heading-dot">.</span>
          </h1>
          <p>値動きを読み解き、自分のエントリーポイントを探す。</p>
        </div>
        <Link href="/stocks" className="terminal-button secondary">
          銘柄一覧 <ArrowUpRight size={15} />
        </Link>
      </div>
      <form className="cms-search">
        <label htmlFor="chart-code" className="sr-only">
          銘柄コード
        </label>
        <input
          id="chart-code"
          name="code"
          defaultValue={code}
          placeholder="銘柄コード（例：7203）"
          pattern="[0-9A-Za-z]{4,5}"
          maxLength={5}
          required
        />
        <button className="terminal-button">チャートを表示</button>
      </form>
      <div className="cms-tabs">
        {[
          ["7203", "トヨタ"],
          ["6758", "ソニーG"],
          ["9984", "ソフトバンクG"],
          ["8306", "三菱UFJ"],
        ].map(([id, name]) => (
          <Link
            key={id}
            href={`/chart?code=${id}`}
            aria-current={code === id ? "page" : undefined}
          >
            {name}
          </Link>
        ))}
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {code} · {stock.data?.market ?? "日本株"}
          </p>
          <h2 className="text-2xl mt-3">
            {stock.data?.name || "銘柄情報なし"}
          </h2>
        </div>
        <div className="chart-value">
          {latest ? `¥${latest.close.toLocaleString("ja-JP")}` : "—"}
        </div>
      </div>
      {(result.error || refreshError) && (
        <p className="data-notice" role="alert">
          最新の株価を取得できませんでした。保存済みデータを表示しています。
        </p>
      )}
      <CandleChart data={candles} height={480} />
      {latest && (
        <p className="chart-footnote">
          最終データ{" "}
          {new Date(latest.ts * 1000).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })}{" "}
          JST · リアルタイム配信ではありません。
        </p>
      )}
      <Link href={`/stocks/${code}`} className="terminal-button secondary mt-5">
        銘柄詳細・ウォッチリスト <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
