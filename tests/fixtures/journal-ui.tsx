"use client";
import { useRef, useState } from "react";
import CalendarPanel from "@/components/journal/calendar-panel";
import ProfitCalendarShare from "@/components/profit-calendar-share";
import { calendarRecords } from "@/lib/journal";
import WatchlistTable from "@/components/watchlist-list";
import Analytics from "@/components/journal/analytics";
import Reports from "@/components/journal/reports";
import TradeEditor from "@/components/journal/trade-editor";
import CsvImport from "@/components/journal/csv-import";
import type { Trade } from "@/lib/journal";
const trades: Trade[] = [
  {
    id: 1,
    stock_code: "7203",
    stock_name: "トヨタ",
    buy_price: 100,
    sell_price: 120,
    quantity: 10,
    profit: 195,
    fees: 5,
    trade_date: "2026-10-01",
    type: "real",
    trade_type: "現物",
    memo: "計画どおり",
    tags: ["順張り"],
    visibility: "private",
  },
  {
    id: 2,
    stock_code: "6758",
    stock_name: "ソニー",
    buy_price: 100,
    sell_price: 90,
    quantity: 10,
    profit: -105,
    fees: 5,
    trade_date: "2026-10-02",
    type: "real",
    trade_type: "現物",
    memo: "損切り",
    visibility: "public",
  },
  {
    id: 3,
    stock_code: "7203",
    stock_name: "トヨタ",
    buy_price: 100,
    sell_price: 110,
    quantity: 10,
    profit: 100,
    fees: 0,
    trade_date: "2026-10-01",
    type: "demo",
    trade_type: "現物",
    memo: "デモ",
    visibility: "private",
  },
];
export default function Harness({
  initialView = "analytics",
}: {
  initialView?: string;
}) {
  const [view, setView] = useState(initialView),
    [edit, setEdit] = useState(false),
    [csv, setCsv] = useState(false);
  const calendarRef = useRef<HTMLElement>(null),
    daily = calendarRecords([], trades, "trades");
  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "auto",
        padding: 20,
        background: "#111e2c",
        color: "#dce8f1",
      }}
    >
      <nav className="journal-actions">
        <button onClick={() => setView("watch")}>ウォッチを表示</button>
        <button onClick={() => setView("calendar")}>カレンダーを表示</button>
        <button onClick={() => setView("analytics")}>分析を表示</button>
        <button onClick={() => setView("reports")}>レポートを表示</button>
        <button onClick={() => setEdit(true)}>編集を表示</button>
        <button onClick={() => setCsv(true)}>取り込みを表示</button>
      </nav>
      {view === "watch" ? (
        <WatchlistTable
          watchlist={[
            {
              id: 1,
              stock_code: "7203",
              stock_name: "トヨタ",
              created_at: "2026-10-01",
            },
            {
              id: 2,
              stock_code: "6758",
              stock_name: "ソニー",
              created_at: "2026-10-01",
            },
            {
              id: 3,
              stock_code: "8306",
              stock_name: "三菱UFJフィナンシャル・グループ",
              created_at: "2026-10-01",
            },
          ]}
          candlesList={Object.fromEntries(
            ["7203", "6758", "8306"].map((code) => [
              code,
              Array.from({ length: 30 }, (_, i) => ({
                ts: 1790812800 + i * 86400,
                open: 100 + i,
                high: 105 + i,
                low: 95 + i,
                close: 102 + i,
              })),
            ]),
          )}
          prices={[
            {
              code: "7203",
              regular_market_price: 12345.5,
              regular_market_change_percent: 1.25,
              updated_at: "2026-10-01",
            },
            {
              code: "6758",
              regular_market_price: 9876,
              regular_market_change_percent: -2.5,
              updated_at: "2026-10-01",
            },
          ]}
          notes={[
            {
              stock_code: "7203",
              category: "押し目待ち",
              note: "決算を確認してから",
              target_price: 100,
            },
            {
              stock_code: "8306",
              category: "長期保有候補",
              note: "金利動向と決算発表を確認してからエントリーを検討。\n想定した支持線を割った場合は見送り。verylongunbrokenwatchlistnote".repeat(
                3,
              ),
              target_price: 1234.5,
            },
          ]}
        />
      ) : view === "analytics" ? (
        <Analytics trades={trades} />
      ) : view === "calendar" ? (
        <>
          <ProfitCalendarShare
            target={calendarRef}
            disabled={false}
            year={2026}
            month={9}
            total={90}
          />
          <CalendarPanel
            calendarRef={calendarRef}
            currentMonth={new Date(2026, 9, 1)}
            today={new Date(2026, 9, 2)}
            dailyProfits={daily}
            selectedDate={null}
            available
            busy={false}
            error=""
            total={90}
            records={Object.values(daily)}
            setCurrentMonth={() => {}}
            selectDay={() => {}}
            onRetry={() => {}}
          />
        </>
      ) : (
        <Reports trades={trades} reports={[]} />
      )}
      {edit && (
        <TradeEditor
          record={trades[0]}
          type="real"
          onClose={() => setEdit(false)}
          onSuccess={() => {}}
        />
      )}
      {csv && (
        <CsvImport
          existing={trades}
          type="real"
          onClose={() => setCsv(false)}
          onSuccess={() => {}}
        />
      )}
    </main>
  );
}
