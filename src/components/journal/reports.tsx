"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  analyzeTrades,
  periodRange,
  todayKey,
  yen,
  type Trade,
} from "@/lib/journal";
import { saveJournalReport } from "@/app/actions/journal";
import ProfitCalendarShare from "@/components/profit-calendar-share";
import { AnalysisSummary } from "./analytics";
export type JournalReport = {
  period: "week" | "month";
  start_date: string;
  reflection: string;
  next_goal: string;
};
function ReportEditor({
  initial,
  period,
  start,
  end,
  trades,
}: {
  initial?: JournalReport;
  period: "week" | "month";
  start: string;
  end: string;
  trades: Trade[];
}) {
  const [reflection, setReflection] = useState(initial?.reflection || ""),
    [goal, setGoal] = useState(initial?.next_goal || ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  const stats = analyzeTrades(trades),
    tagCounts = new Map<string, number>();
  for (const trade of trades)
    for (const tag of trade.tags || [])
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await saveJournalReport({
        period,
        start_date: start,
        reflection,
        next_goal: goal,
      });
      setMessage("振り返りを保存しました。");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section
        ref={ref}
        className="terminal-panel journal-section journal-report-image"
      >
        <p className="eyebrow">TRADING REVIEW · DAYTRADE</p>
        <h2>{period === "week" ? "週次" : "月次"}レポート</h2>
        <p>
          {start} 〜 {end} · 実取引
        </p>
        <div hidden data-share-summary>
          合計損益 {yen(stats.total)}
        </div>
        <AnalysisSummary trades={trades} />
        <h3>よく使ったタグ</h3>
        <p>
          {[...tagCounts]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([tag, n]) => tag + "（" + n + "件）")
            .join(" / ") || "タグの記録はありません。"}
        </p>
        <h3>期間の振り返り</h3>
        <p className="whitespace-pre-wrap">{reflection || "未記入"}</p>
        <h3>次の期間に改善すること</h3>
        <p className="whitespace-pre-wrap">{goal || "未記入"}</p>
      </section>
      <div className="journal-actions">
        <ProfitCalendarShare
          target={ref}
          disabled={busy}
          year={Number(start.slice(0, 4))}
          month={Number(start.slice(5, 7)) - 1}
          total={stats.total}
          label={
            (period === "week" ? "週次" : "月次") +
            "レポート " +
            start +
            "〜" +
            end
          }
          filenamePrefix={"journal-" + period + "-" + start}
        />
      </div>
      <section className="terminal-panel journal-section">
        <h2>振り返りを書く</h2>
        <label className="journal-field">
          今回できたこと・改善点
          <textarea
            maxLength={5000}
            rows={4}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="journal-field">
          次の期間に改善すること
          <textarea
            maxLength={5000}
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          className="terminal-button"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? "保存中…" : "振り返りを保存"}
        </button>
        {message && <p role="status">{message}</p>}
      </section>
      <section className="terminal-panel journal-section">
        <h2>期間内のトレードメモ</h2>
        {trades
          .filter((t) => t.reflection || t.memo)
          .slice(0, 50)
          .map((t) => (
            <article className="journal-review-entry" key={t.id}>
              <Link href={"/dashboard/trade-records?date=" + t.trade_date}>
                {t.trade_date} · {t.stock_name}
              </Link>
              <p>{t.reflection || t.memo}</p>
            </article>
          ))}
        {!trades.some((t) => t.reflection || t.memo) && (
          <p>メモはまだありません。</p>
        )}
      </section>
    </>
  );
}
export default function Reports({
  trades,
  reports,
}: {
  trades: Trade[];
  reports: JournalReport[];
}) {
  const [period, setPeriod] = useState<"week" | "month">("month"),
    [date, setDate] = useState(todayKey());
  const range = periodRange(period, date || todayKey()),
    key = period + ":" + range.start;
  return (
    <div className="journal-tools">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WEEKLY / MONTHLY REVIEW</p>
          <h1>
            振り返りレポート<span className="heading-dot">.</span>
          </h1>
          <p>成績とメモをまとめて、次の一週間・一か月につなげる。</p>
        </div>
      </div>
      <div className="journal-filters">
        <label>
          期間
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "week" | "month")}
          >
            <option value="week">週次（月曜始まり）</option>
            <option value="month">月次</option>
          </select>
        </label>
        <label>
          対象日
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <ReportEditor
        key={key}
        period={period}
        start={range.start}
        end={range.end}
        trades={trades.filter(
          (t) =>
            t.type === "real" &&
            t.trade_date >= range.start &&
            t.trade_date <= range.end,
        )}
        initial={reports.find(
          (r) => r.period === period && r.start_date === range.start,
        )}
      />
    </div>
  );
}
