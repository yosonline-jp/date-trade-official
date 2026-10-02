export const JPX_PORTAL_URL =
  "https://clientportal.jpx.co.jp/ClientPortal/s/Issue?language=ja";
export const JPX_LIST_URL =
  "https://www.jpx.co.jp/markets/statistics-equities/misc/01.html";

export type JpxStock = {
  code: string;
  name: string;
  market: string;
  sector: string;
  domestic: boolean;
};

export type JpxSource = {
  sourceDate: string;
  sourceUrl: string;
  stocks: JpxStock[];
};

type PortalRow = {
  Code__c?: unknown;
  IssueName__c?: unknown;
  ProductClassification__c?: unknown;
  MarketSection__c?: unknown;
  Sector__c?: unknown;
  DomesticForeign__c?: unknown;
};

export function parseJpxActions(payload: unknown, now = new Date()): JpxSource {
  const actions = (
    payload as {
      actions?: Array<{ id?: string; state?: string; returnValue?: unknown }>;
    }
  )?.actions;
  const dateAction = actions?.find(
    (item) =>
      typeof item.returnValue === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.returnValue),
  );
  const stocksAction = actions?.find((item) => Array.isArray(item.returnValue));
  const sourceDate = dateAction?.returnValue;
  if (
    dateAction?.state !== "SUCCESS" ||
    stocksAction?.state !== "SUCCESS" ||
    typeof sourceDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(sourceDate) ||
    !Array.isArray(stocksAction.returnValue)
  ) {
    throw new Error("JPXの一覧形式が想定外です。更新を中止しました。");
  }
  const age = now.getTime() - Date.parse(`${sourceDate}T00:00:00+09:00`);
  if (!Number.isFinite(age) || age < -86400000 || age > 7 * 86400000)
    throw new Error(
      "JPXの一覧の日付が古い、または未来です。更新を中止しました。",
    );

  const stocks = (stocksAction.returnValue as PortalRow[])
    .filter(
      (row) =>
        row.ProductClassification__c === "株式" &&
        row.MarketSection__c !== "上場廃止",
    )
    .map((row) => {
      const rawCode = String(row.Code__c ?? "");
      const code = rawCode.slice(0, -1);
      const name = String(row.IssueName__c ?? "").trim();
      const market = String(row.MarketSection__c ?? "").trim();
      const sector = String(row.Sector__c ?? "").trim();
      const domestic = row.DomesticForeign__c === "国内";
      if (
        !/^[0-9A-Z]{4}0$/.test(rawCode) ||
        !name ||
        name.length > 120 ||
        !["プライム", "スタンダード", "グロース", "TOKYO PRO Market"].includes(
          market,
        ) ||
        !sector ||
        sector.length > 60 ||
        !["国内", "国外"].includes(String(row.DomesticForeign__c))
      ) {
        throw new Error("JPXの銘柄に不正な値があります。更新を中止しました。");
      }
      return { code, name, market, sector, domestic };
    });
  if (
    stocks.length < 3500 ||
    stocks.length > 4300 ||
    new Set(stocks.map((item) => item.code)).size !== stocks.length ||
    !stocks.some((item) => item.code === "7203")
  ) {
    throw new Error(
      "JPXの銘柄件数またはコードが想定外です。更新を中止しました。",
    );
  }
  return { sourceDate, sourceUrl: JPX_PORTAL_URL, stocks };
}
