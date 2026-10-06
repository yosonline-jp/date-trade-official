"use client";
import {
  createContext,
  useContext,
  type ComponentProps,
  type RefObject,
} from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { ja } from "date-fns/locale";
import { toDateKey } from "@/utils/utils";
import { yen as money } from "@/lib/journal";
import type { ProfitRecord } from "@/components/profit-modal";
import { BRAND_COLORS } from "@/lib/brand-theme";
const tone = (value: number) =>
  value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
const RecordsContext = createContext<Record<string, ProfitRecord>>({});

function ProfitDay({
  day,
  modifiers,
  children,
  ...props
}: ComponentProps<typeof CalendarDayButton>) {
  const records = useContext(RecordsContext);
  const record = !modifiers.outside ? records[toDateKey(day.date)] : undefined;
  return (
    <CalendarDayButton
      {...props}
      day={day}
      modifiers={modifiers}
      className={
        "profit-day " + (record ? "has-profit " + tone(record.amount) : "")
      }
      disabled={props.disabled || modifiers.outside}
      aria-label={
        day.date.toLocaleDateString("ja-JP") +
        (record
          ? "、収支 " + record.amount.toLocaleString("ja-JP") + "円、編集"
          : "、収支を登録")
      }
    >
      <span className="profit-day-number">
        {children}
        {modifiers.today && <i aria-hidden="true" />}
      </span>
      {!modifiers.outside && (
        <span className="profit-day-amount">
          {record ? (
            money(record.amount)
          ) : (
            <span className="profit-day-add">
              <Plus size={14} />
              <span>記録</span>
            </span>
          )}
        </span>
      )}
    </CalendarDayButton>
  );
}

export default function CalendarPanel({
  calendarRef,
  currentMonth,
  today,
  dailyProfits,
  selectedDate,
  available,
  busy,
  error,
  total,
  records,
  setCurrentMonth,
  selectDay,
  onRetry,
}: {
  calendarRef: RefObject<HTMLElement | null>;
  currentMonth: Date;
  today: Date;
  dailyProfits: Record<string, ProfitRecord>;
  selectedDate: Date | null;
  available: boolean;
  busy: boolean;
  error: string;
  total: number;
  records: ProfitRecord[];
  setCurrentMonth: (date: Date) => void;
  selectDay: (date: Date | undefined) => void;
  onRetry: () => void;
}) {
  const year = currentMonth.getFullYear(),
    month = currentMonth.getMonth();
  return (
    <section
      ref={calendarRef}
      className="terminal-panel profit-calendar-panel"
      aria-busy={busy}
    >
      <div className="profit-calendar-toolbar">
        <div className="profit-month-title">
          <span>
            <CalendarDays size={20} />
          </span>
          <h2>
            {year}
            <small>年</small> {String(month + 1).padStart(2, "0")}
            <small>月</small>
          </h2>
        </div>
        <div className="profit-month-controls" data-html2canvas-ignore>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentMonth(
                new Date(today.getFullYear(), today.getMonth(), 1),
              )
            }
          >
            今月
          </Button>
          <div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="前の月"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="次の月"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              disabled={
                currentMonth >=
                new Date(today.getFullYear(), today.getMonth(), 1)
              }
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </div>
      <div
        hidden
        data-share-summary
        style={{
          padding: "20px 28px",
          color: BRAND_COLORS.text,
          background: BRAND_COLORS.panel,
          fontSize: 18,
        }}
      >
        収支カレンダー · デイトレード.net — 合計損益 {money(total)} /{" "}
        {records.length}日の記録
      </div>
      {error && (
        <div className="profit-data-error" role="alert">
          <span>{error}</span>
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw size={14} />
            再読み込み
          </Button>
        </div>
      )}
      <div className="profit-calendar-body">
        <RecordsContext.Provider value={dailyProfits}>
          <Calendar
            className="profit-month-grid"
            month={currentMonth}
            mode="single"
            selected={selectedDate || undefined}
            onSelect={selectDay}
            onMonthChange={setCurrentMonth}
            locale={ja}
            weekStartsOn={1}
            today={today}
            hideNavigation
            classNames={{
              root: "profit-calendar-root",
              months: "profit-calendar-months",
              month: "profit-calendar-month",
              month_grid: "profit-month-table",
              month_caption: "sr-only",
              weekdays: "profit-weekdays",
              weekday: "profit-weekday",
              week: "profit-week",
              day: "profit-cell",
              today: "profit-today",
              outside: "profit-outside",
              disabled: "profit-disabled",
            }}
            components={{ DayButton: ProfitDay }}
            disabled={available ? { after: today } : true}
          />
        </RecordsContext.Provider>
        {busy && (
          <div className="profit-loading" role="status">
            <Loader2 size={24} className="animate-spin" />
            <span>収支を読み込み中...</span>
          </div>
        )}
      </div>
      <div className="profit-calendar-footer">
        <p>
          <span className="profit-legend-dot gain" />
          利益
          <span className="profit-legend-dot loss" />
          損失
          <span className="profit-legend-dot even" />
          収支ゼロ
        </p>
        <span data-html2canvas-ignore>日付を選択して収支を登録・編集</span>
      </div>
    </section>
  );
}
