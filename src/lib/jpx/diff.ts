import type { JpxStock } from "./parse";

export type CurrentStock = {
  code: string;
  name: string;
  market: string | null;
  category: string | null;
  industry: string | null;
};

export type StockChange = {
  item: JpxStock;
  kind: "new" | "changed" | "unchanged";
  fields: string[];
};

export function marketLabel(item: JpxStock) {
  return item.market === "TOKYO PRO Market"
    ? item.market
    : `${item.market}（${item.domestic ? "内国" : "外国"}株式）`;
}

export function compareStocks(source: JpxStock[], current: CurrentStock[]) {
  const byCode = new Map(current.map((item) => [item.code, item]));
  return source.map((item): StockChange => {
    const old = byCode.get(item.code);
    if (!old) return { item, kind: "new", fields: ["新規"] };
    const fields = [
      old.name !== item.name ? "銘柄名" : "",
      old.market !== marketLabel(item) ? "市場" : "",
      old.category !== item.sector ? "業種" : "",
    ].filter(Boolean);
    return { item, kind: fields.length ? "changed" : "unchanged", fields };
  });
}

export function stockRowsForChanges(
  changes: StockChange[],
  current: CurrentStock[],
  updatedAt: string,
) {
  const byCode = new Map(current.map((item) => [item.code, item]));
  return changes
    .filter((change) => change.kind !== "unchanged")
    .map(({ item }) => ({
      code: item.code,
      name: item.name,
      market: marketLabel(item),
      category: item.sector,
      industry: byCode.get(item.code)?.industry || item.sector,
      updated_at: updatedAt,
    }));
}
