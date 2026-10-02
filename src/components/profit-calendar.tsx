"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { loadMonthlyProfits } from "@/app/actions/profit";
import { toDateKey } from "@/utils/utils";
import ProfitModal, { type ProfitRecord } from "./profit-modal";

import { saveCalendarSource } from "@/app/actions/journal";
import { calendarRecords, type Trade } from "@/lib/journal";
import CalendarPanel from "./journal/calendar-panel";
import ProfitCalendarShare from "./profit-calendar-share";

function japanToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}
const money = (value: number) =>
  (value > 0 ? "+" : value < 0 ? "−" : "") +
  "¥" +
  Math.abs(value).toLocaleString("ja-JP");
const tone = (value: number) =>
  value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
export default function ProfitCalendar() {
  const calendarRef = useRef<HTMLElement>(null);
  const [today] = useState(japanToday);
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [source, setSource] = useState<"manual" | "trades">("manual");
  const [sourceBusy, setSourceBusy] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pendingToday, setPendingToday] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState<{
    key: string;
    records: Record<string, ProfitRecord>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthKey = year + "-" + month;
  const dailyProfits = loaded?.key === monthKey ? loaded.records : {};
  const busy = loading || (loaded?.key !== monthKey && !error);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    loadMonthlyProfits({ year, month })
      .then((result) => {
        if (cancelled) return;
        setSource(result.source);
        setTrades(result.trades);
        const records = calendarRecords(
          result.rows,
          result.trades,
          result.source,
        );
        setLoaded({ key: monthKey, records });
      })
      .catch(() => {
        if (!cancelled)
          setError("収支を取得できませんでした。もう一度お試しください。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month, monthKey, revision]);

  const records = Object.values(dailyProfits);
  const total = records.reduce((sum, record) => sum + record.amount, 0);
  const wins = records.filter((record) => record.amount > 0).length;
  const losses = records.filter((record) => record.amount < 0).length;
  const available = !busy && !error && !sourceBusy;
  useEffect(() => {
    if (
      pendingToday &&
      available &&
      year === today.getFullYear() &&
      month === today.getMonth()
    ) {
      setSelectedDate(today);
      setPendingToday(false);
    }
  }, [pendingToday, available, year, month, today]);
  function selectDay(date: Date | undefined) {
    if (
      date &&
      available &&
      date <= today &&
      date.getMonth() === month &&
      date.getFullYear() === year
    )
      setSelectedDate(date);
  }
  return (
    <div className="profit-workspace">
      <div className="page-heading profit-page-heading">
        <div>
          <p className="eyebrow">PROFIT JOURNAL</p>
          <h1>
            収支カレンダー<span className="heading-dot">.</span>
          </h1>
          <p>日々の収支を記録して、トレードの歩みを振り返る。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProfitCalendarShare
            target={calendarRef}
            disabled={!available}
            year={year}
            month={month}
            total={total}
          />
          <Button
            className="profit-primary-button"
            disabled={!available}
            onClick={() => {
              setCurrentMonth(
                new Date(today.getFullYear(), today.getMonth(), 1),
              );
              setPendingToday(true);
            }}
          >
            <Plus size={16} />
            今日の収支を記録
          </Button>
        </div>
      </div>
      <div className="journal-source-controls">
        <label htmlFor="calendar-source">収支の集計方法</label>
        <select
          id="calendar-source"
          value={source}
          disabled={!available}
          onChange={async (e) => {
            const next = e.target.value as "manual" | "trades";
            setSourceBusy(true);
            try {
              await saveCalendarSource(next);
              setRevision((r) => r + 1);
            } catch {
              setError("集計方法を保存できませんでした。");
            } finally {
              setSourceBusy(false);
            }
          }}
        >
          <option value="manual">手入力の収支</option>
          <option value="trades">実取引から自動集計</option>
        </select>
        <p>
          {source === "trades"
            ? "手数料控除後の実取引に調整額を加算します。日付を押すと取引を確認できます。"
            : "これまでの手入力を表示します。自動集計に切り替えても入力は残ります。"}
        </p>
      </div>
      <section className="profit-summary" aria-label="表示月の収支サマリー">
        <div className="profit-summary-card profit-total">
          <div>
            <span>
              {year}年{month + 1}月の合計損益
            </span>
            <TrendingUp size={20} />
          </div>
          <strong className={tone(total)}>
            {available ? money(total) : "—"}
          </strong>
          <p>
            {available
              ? records.length + " 日の記録"
              : busy
                ? "読み込み中"
                : "取得できませんでした"}
          </p>
        </div>
        <div className="profit-summary-card">
          <div>
            <span>利益の日</span>
            <TrendingUp size={18} className="positive" />
          </div>
          <strong>
            {available ? wins : "—"}
            <small>日</small>
          </strong>
          <p>プラスの収支を記録した日</p>
        </div>
        <div className="profit-summary-card">
          <div>
            <span>損失の日</span>
            <TrendingDown size={18} className="negative" />
          </div>
          <strong>
            {available ? losses : "—"}
            <small>日</small>
          </strong>
          <p>マイナスの収支を記録した日</p>
        </div>
      </section>
      <CalendarPanel
        calendarRef={calendarRef}
        currentMonth={currentMonth}
        today={today}
        dailyProfits={dailyProfits}
        selectedDate={selectedDate}
        available={available}
        busy={busy}
        error={error}
        total={total}
        records={records}
        setCurrentMonth={setCurrentMonth}
        selectDay={selectDay}
        onRetry={() => setRevision((r) => r + 1)}
      />
      <p className="profit-calendar-note">
        収支は日本円で記録します。未来の日付には登録できません。
      </p>
      {selectedDate && (
        <ProfitModal
          key={toDateKey(selectedDate)}
          source={source}
          trades={trades.filter(
            (t) => t.trade_date === toDateKey(selectedDate),
          )}
          date={selectedDate}
          open
          record={dailyProfits[toDateKey(selectedDate)] || null}
          updateCalendar={() => setRevision((r) => r + 1)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
