export type Trade = {
  id: number;
  stock_code: string;
  stock_name: string;
  buy_price: number;
  sell_price: number;
  quantity: number;
  profit: number;
  trade_date: string;
  trade_type: string;
  type: "real" | "demo";
  memo: string | null;
  fees?: number;
  entry_reason?: string;
  reflection?: string;
  tags?: string[];
  screenshot_path?: string | null;
  visibility?: "public" | "private";
  import_key?: string | null;
};
export const yen = (n: number) =>
  (n > 0 ? "+" : n < 0 ? "−" : "") +
  "¥" +
  Math.abs(n).toLocaleString("ja-JP", { maximumFractionDigits: 2 });
export function todayKey() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );
}
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s
  );
}
export function tradeProfit(
  t: Pick<
    Trade,
    "buy_price" | "sell_price" | "quantity" | "trade_type" | "fees"
  >,
) {
  return (
    Math.round(
      ((t.trade_type === "売建"
        ? t.buy_price - t.sell_price
        : t.sell_price - t.buy_price) *
        t.quantity -
        Number(t.fees || 0)) *
        100,
    ) / 100
  );
}
export function analyzeTrades(trades: Trade[]) {
  const daily = new Map<string, number>();
  const wins = trades.filter((t) => Number(t.profit) > 0),
    losses = trades.filter((t) => Number(t.profit) < 0);
  for (const t of trades)
    daily.set(t.trade_date, (daily.get(t.trade_date) || 0) + Number(t.profit));
  let balance = 0,
    peak = 0,
    drawdown = 0;
  const curve = [...daily]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, profit]) => {
      balance += profit;
      peak = Math.max(peak, balance);
      drawdown = Math.max(drawdown, peak - balance);
      return { date, profit, balance };
    });
  const grossProfit = wins.reduce((s, t) => s + Number(t.profit), 0),
    grossLoss = -losses.reduce((s, t) => s + Number(t.profit), 0);
  function group(key: (t: Trade) => string) {
    const map = new Map<
      string,
      { label: string; profit: number; count: number; wins: number }
    >();
    for (const t of trades) {
      const label = key(t);
      const v = map.get(label) || { label, profit: 0, count: 0, wins: 0 };
      v.profit += Number(t.profit);
      v.count++;
      if (Number(t.profit) > 0) v.wins++;
      map.set(label, v);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  return {
    total: balance,
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    averageWin: wins.length ? grossProfit / wins.length : 0,
    averageLoss: losses.length ? grossLoss / losses.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : null,
    drawdown,
    curve,
    months: group((t) => t.trade_date.slice(0, 7)),
    years: group((t) => t.trade_date.slice(0, 4)),
    stocks: group((t) => t.stock_code + " " + t.stock_name),
    directions: group((t) => t.trade_type),
    tags: group((t) => t.tags?.join(" / ") || "タグなし"),
  };
}
export function periodRange(kind: "week" | "month", date: string) {
  const d = new Date(date + "T00:00:00Z");
  if (kind === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  else d.setUTCDate(1);
  const start = d.toISOString().slice(0, 10);
  if (kind === "week") d.setUTCDate(d.getUTCDate() + 6);
  else {
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
  }
  return { start, end: d.toISOString().slice(0, 10) };
}

export type CalendarRecord = {
  id: number | null;
  date: string;
  amount: number;
  adjustment: number;
  tradeTotal: number;
};
export function calendarRecords(
  rows: {
    id: number;
    date: string;
    amount: number | string;
    adjustment_amount: number | string;
  }[],
  trades: Trade[],
  source: "manual" | "trades",
) {
  const records: Record<string, CalendarRecord> = {};
  for (const row of rows)
    records[row.date] = {
      id: row.id,
      date: row.date,
      amount:
        source === "manual"
          ? Number(row.amount)
          : Number(row.adjustment_amount),
      adjustment: Number(row.adjustment_amount),
      tradeTotal: 0,
    };
  if (source === "trades") {
    for (const trade of trades.filter((t) => t.type === "real")) {
      const record = records[trade.trade_date] || {
        id: null,
        date: trade.trade_date,
        amount: 0,
        adjustment: 0,
        tradeTotal: 0,
      };
      record.amount += Number(trade.profit);
      record.tradeTotal += Number(trade.profit);
      records[trade.trade_date] = record;
    }
    for (const key of Object.keys(records))
      if (
        !records[key].adjustment &&
        !trades.some((t) => t.type === "real" && t.trade_date === key)
      )
        delete records[key];
  }
  return records;
}
