"use client";

import { createContext, useContext, useEffect, useState, type ComponentProps } from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, TrendingUp, TrendingDown, Loader2, RotateCcw } from "lucide-react";
import { ja } from "date-fns/locale";
import { loadMonthlyProfits } from "@/app/actions/profit";
import { toDateKey } from "@/utils/utils";
import ProfitModal, { type ProfitRecord } from "./profit-modal";

function japanToday() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}
const money = (value: number) => (value > 0 ? "+" : value < 0 ? "−" : "") + "¥" + Math.abs(value).toLocaleString("ja-JP");
const tone = (value: number) => value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
const RecordsContext = createContext<Record<string, ProfitRecord>>({});

function ProfitDay({ day, modifiers, children, ...props }: ComponentProps<typeof CalendarDayButton>) {
  const records = useContext(RecordsContext);
  const record = !modifiers.outside ? records[toDateKey(day.date)] : undefined;
  return (
    <CalendarDayButton {...props} day={day} modifiers={modifiers} className={"profit-day " + (record ? "has-profit " + tone(record.amount) : "")} disabled={props.disabled || modifiers.outside}
      aria-label={day.date.toLocaleDateString("ja-JP") + (record ? "、収支 " + record.amount.toLocaleString("ja-JP") + "円、編集" : "、収支を登録")}>
      <span className="profit-day-number">{children}{modifiers.today && <i aria-hidden="true" />}</span>
      {!modifiers.outside && <span className="profit-day-amount">{record ? money(record.amount) : <span className="profit-day-add"><Plus size={14} /><span>記録</span></span>}</span>}
    </CalendarDayButton>
  );
}

export default function ProfitCalendar() {
  const [today] = useState(japanToday);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [pendingToday, setPendingToday] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; records: Record<string, ProfitRecord> } | null>(null);
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
    loadMonthlyProfits({ year, month }).then(rows => {
      if (cancelled) return;
      const records: Record<string, ProfitRecord> = {};
      rows.forEach(row => { records[row.date] = { id: row.id, date: row.date, amount: Number(row.amount) }; });
      setLoaded({ key: monthKey, records });
    }).catch(() => {
      if (!cancelled) setError("収支を取得できませんでした。もう一度お試しください。");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, month, monthKey, revision]);

  const records = Object.values(dailyProfits);
  const total = records.reduce((sum, record) => sum + record.amount, 0);
  const wins = records.filter(record => record.amount > 0).length;
  const losses = records.filter(record => record.amount < 0).length;
  const available = !busy && !error;
  useEffect(() => {
    if (pendingToday && available && year === today.getFullYear() && month === today.getMonth()) { setSelectedDate(today); setPendingToday(false); }
  }, [pendingToday, available, year, month, today]);
  function selectDay(date: Date | undefined) {
    if (date && available && date <= today && date.getMonth() === month && date.getFullYear() === year) setSelectedDate(date);
  }
  return (
    <div className="profit-workspace">
      <div className="page-heading profit-page-heading"><div><p className="eyebrow">PROFIT JOURNAL</p><h1>収支カレンダー<span className="heading-dot">.</span></h1><p>日々の収支を記録して、トレードの歩みを振り返る。</p></div><Button className="profit-primary-button" disabled={!available} onClick={() => { setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setPendingToday(true); }}><Plus size={16} />今日の収支を記録</Button></div>
      <section className="profit-summary" aria-label="表示月の収支サマリー">
        <div className="profit-summary-card profit-total"><div><span>{year}年{month + 1}月の合計損益</span><TrendingUp size={20} /></div><strong className={tone(total)}>{available ? money(total) : "—"}</strong><p>{available ? records.length + " 日の記録" : busy ? "読み込み中" : "取得できませんでした"}</p></div>
        <div className="profit-summary-card"><div><span>利益の日</span><TrendingUp size={18} className="positive" /></div><strong>{available ? wins : "—"}<small>日</small></strong><p>プラスの収支を記録した日</p></div>
        <div className="profit-summary-card"><div><span>損失の日</span><TrendingDown size={18} className="negative" /></div><strong>{available ? losses : "—"}<small>日</small></strong><p>マイナスの収支を記録した日</p></div>
      </section>
      <section className="terminal-panel profit-calendar-panel" aria-busy={busy}>
        <div className="profit-calendar-toolbar"><div className="profit-month-title"><span><CalendarDays size={20} /></span><h2>{year}<small>年</small> {String(month + 1).padStart(2, "0")}<small>月</small></h2></div><div className="profit-month-controls"><Button variant="outline" onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>今月</Button><div><Button variant="ghost" size="icon" aria-label="前の月" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}><ChevronLeft size={18} /></Button><Button variant="ghost" size="icon" aria-label="次の月" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} disabled={currentMonth >= new Date(today.getFullYear(), today.getMonth(), 1)}><ChevronRight size={18} /></Button></div></div></div>
        {error && <div className="profit-data-error" role="alert"><span>{error}</span><Button variant="outline" onClick={() => setRevision(r => r + 1)}><RotateCcw size={14} />再読み込み</Button></div>}
        <div className="profit-calendar-body">
          <RecordsContext.Provider value={dailyProfits}>
            <Calendar className="profit-month-grid" month={currentMonth} mode="single" selected={selectedDate || undefined} onSelect={selectDay} onMonthChange={setCurrentMonth} locale={ja} weekStartsOn={1} today={today} hideNavigation
              classNames={{ root: "profit-calendar-root", months: "profit-calendar-months", month: "profit-calendar-month", month_grid: "profit-month-table", month_caption: "sr-only", weekdays: "profit-weekdays", weekday: "profit-weekday", week: "profit-week", day: "profit-cell", today: "profit-today", outside: "profit-outside", disabled: "profit-disabled" }}
              components={{ DayButton: ProfitDay }} disabled={available ? { after: today } : true} />
          </RecordsContext.Provider>
          {busy && <div className="profit-loading" role="status"><Loader2 size={24} className="animate-spin" /><span>収支を読み込み中...</span></div>}
        </div>
        <div className="profit-calendar-footer"><p><span className="profit-legend-dot gain" />利益<span className="profit-legend-dot loss" />損失<span className="profit-legend-dot even" />収支ゼロ</p><span>日付を選択して収支を登録・編集</span></div>
      </section>
      <p className="profit-calendar-note">収支は日本円で記録します。未来の日付には登録できません。</p>
      {selectedDate && <ProfitModal key={toDateKey(selectedDate)} date={selectedDate} open record={dailyProfits[toDateKey(selectedDate)] || null} updateCalendar={() => setRevision(r => r + 1)} onClose={() => setSelectedDate(null)} />}
    </div>
  );
}
