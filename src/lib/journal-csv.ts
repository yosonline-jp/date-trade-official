import { tradeProfit, validDate, type Trade } from "./journal";
export type ImportTrade = Omit<Trade, "id">;
export const csvFields = {
  stock_code: "銘柄コード",
  stock_name: "銘柄名",
  trade_date: "取引日／決済日",
  buy_price: "買値",
  sell_price: "売値",
  quantity: "数量",
  trade_type: "取引区分",
  fees: "手数料",
  memo: "メモ",
  price: "約定単価",
  side: "売買",
};
export type CsvField = keyof typeof csvFields;
export type Mapping = Partial<Record<CsvField, number>>;
export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || cell === "") quoted = !quoted;
      else throw new Error("引用符の位置が不正です。");
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSVの引用符が閉じていません。");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error("ヘッダーと明細を含むCSVを選択してください。");
  const headers = rows.shift()!;
  if (rows.some((r) => r.length !== headers.length))
    throw new Error("CSVの列数が一致しません。");
  if (rows.length > 10000)
    throw new Error("1回のプレビューは10,000行までです。");
  return { headers, rows };
}
export function suggestMapping(headers: string[]): Mapping {
  const aliases: Record<CsvField, string[]> = {
    stock_code: ["銘柄コード", "コード", "stock_code"],
    stock_name: ["銘柄名", "銘柄", "stock_name"],
    trade_date: ["約定日", "取引日", "決済日", "trade_date"],
    buy_price: ["買値", "買単価", "buy_price"],
    sell_price: ["売値", "売単価", "sell_price"],
    quantity: ["数量", "株数", "約定数量", "quantity"],
    trade_type: ["取引区分", "trade_type"],
    fees: ["手数料", "fees"],
    memo: ["メモ", "memo"],
    price: ["約定単価", "約定価格", "単価", "price"],
    side: ["売買", "売買区分", "取引", "side"],
  };
  const mapping: Mapping = {};
  for (const field of Object.keys(aliases) as CsvField[]) {
    const index = headers.findIndex((h) => aliases[field].includes(h.trim()));
    if (index >= 0) mapping[field] = index;
  }
  return mapping;
}
function number(s: string) {
  const n = Number(s.replace(/[,¥￥\s]/g, ""));
  if (!s.trim() || !Number.isFinite(n))
    throw new Error("数値を確認してください。");
  return n;
}
function date(s: string) {
  const value = s
    .trim()
    .replace(/[年月/.]/g, "-")
    .replace(/日/g, "")
    .split(/\s/)[0];
  const parts = value.split("-");
  const normalized =
    parts.length === 3
      ? parts[0] +
        "-" +
        parts[1].padStart(2, "0") +
        "-" +
        parts[2].padStart(2, "0")
      : value;
  if (!validDate(normalized)) throw new Error("日付を確認してください。");
  return normalized;
}
export function previewImport(
  rows: string[][],
  mapping: Mapping,
  kind: "completed" | "executions",
  type: "real" | "demo",
  visibility: "public" | "private",
) {
  const trades: ImportTrade[] = [],
    errors: string[] = [],
    unmatched: string[] = [];
  const required: CsvField[] =
    kind === "completed"
      ? ["stock_code", "trade_date", "buy_price", "sell_price", "quantity"]
      : ["stock_code", "trade_date", "price", "side", "quantity"];
  if (required.some((k) => mapping[k] === undefined))
    return {
      trades,
      errors: ["必須列をすべて割り当ててください。"],
      unmatched,
    };
  const lots = new Map<
    string,
    { price: number; remaining: number; feePerShare: number; name: string }[]
  >();
  // Execution files must be in chronological order; same-day rows retain their original order.
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      try {
        return (
          date(a.row[mapping.trade_date!] || "").localeCompare(
            date(b.row[mapping.trade_date!] || ""),
          ) || a.index - b.index
        );
      } catch {
        return a.index - b.index;
      }
    });
  for (const { row, index } of ordered) {
    try {
      const get = (f: CsvField) =>
        mapping[f] === undefined ? "" : row[mapping[f]!] || "";
      const code = get("stock_code").trim().toUpperCase();
      if (!/^[0-9A-Z]{4}$/.test(code))
        throw new Error("日本株の4桁の銘柄コードを確認してください。");
      const day = date(get("trade_date")),
        quantity = number(get("quantity")),
        fees = get("fees").trim() ? number(get("fees")) : 0;
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || fees < 0)
        throw new Error("数量・手数料を確認してください。");
      const common = {
        stock_code: code,
        stock_name: get("stock_name").trim() || code,
        trade_date: day,
        quantity,
        type,
        visibility,
        memo: get("memo").trim(),
        fees,
      };
      if (kind === "completed") {
        const buy = number(get("buy_price")),
          sell = number(get("sell_price")),
          direction = get("trade_type").trim() || "現物";
        if (
          buy <= 0 ||
          sell <= 0 ||
          !["現物", "買建", "売建"].includes(direction)
        )
          throw new Error("価格・取引区分を確認してください。");
        const t = {
          ...common,
          buy_price: buy,
          sell_price: sell,
          trade_type: direction,
        };
        trades.push({ ...t, profit: tradeProfit(t) });
      } else {
        const price = number(get("price"));
        if (price <= 0) throw new Error("約定単価を確認してください。");
        const side = get("side").trim();
        const directions: Record<string, [string, boolean]> = {
          買: ["現物", true],
          買付: ["現物", true],
          売: ["現物", false],
          売却: ["現物", false],
          買建: ["買建", true],
          買建て: ["買建", true],
          売返済: ["買建", false],
          売埋: ["買建", false],
          売建: ["売建", true],
          売建て: ["売建", true],
          買返済: ["売建", false],
          買埋: ["売建", false],
        };
        if (!directions[side])
          throw new Error(
            "売買は買／売／買建／売返済／売建／買返済に対応しています。",
          );
        const [direction, opening] = directions[side],
          key = code + ":" + direction,
          queue = lots.get(key) || [];
        if (opening) {
          queue.push({
            price,
            remaining: quantity,
            feePerShare: fees / quantity,
            name: common.stock_name,
          });
          lots.set(key, queue);
        } else {
          if (queue.reduce((s, l) => s + l.remaining, 0) < quantity) {
            unmatched.push(
              index +
                2 +
                "行目: " +
                code +
                "の決済に対応する建玉が不足しています（登録対象外）。",
            );
            continue;
          }
          let remaining = quantity;
          while (remaining > 0) {
            const lot = queue[0],
              matched = Math.min(remaining, lot.remaining);
            const t = {
              ...common,
              quantity: matched,
              trade_type: direction,
              buy_price: lot.price,
              sell_price: price,
              fees:
                Math.round(
                  (lot.feePerShare + fees / quantity) * matched * 100,
                ) / 100,
            };
            trades.push({ ...t, profit: tradeProfit(t) });
            lot.remaining -= matched;
            remaining -= matched;
            if (!lot.remaining) queue.shift();
          }
        }
      }
    } catch (e) {
      errors.push(
        index +
          2 +
          "行目: " +
          (e instanceof Error ? e.message : "読み取りエラー"),
      );
    }
  }
  for (const [key, queue] of lots) {
    const n = queue.reduce((s, l) => s + l.remaining, 0);
    if (n) unmatched.push(key + " " + n + "株が未決済です（登録対象外）。");
  }
  return { trades, errors, unmatched };
}
export function tradeFingerprint(
  t: Pick<
    Trade,
    | "stock_code"
    | "trade_date"
    | "buy_price"
    | "sell_price"
    | "quantity"
    | "type"
    | "trade_type"
  >,
) {
  return JSON.stringify([
    t.stock_code,
    t.trade_date,
    Number(t.buy_price),
    Number(t.sell_price),
    Number(t.quantity),
    t.type,
    t.trade_type,
  ]);
}
