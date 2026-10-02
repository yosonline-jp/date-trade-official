import { test, expect } from "@playwright/test";
import { parseJpxActions } from "../src/lib/jpx/parse";
import { compareStocks, stockRowsForChanges } from "../src/lib/jpx/diff";

const fixture = (count = 3600) => ({
  actions: [
    { id: "1;a", state: "SUCCESS", returnValue: "2026-10-01" },
    {
      id: "2;a",
      state: "SUCCESS",
      returnValue: [
        ...Array.from({ length: count }, (_, i) => ({
          Code__c: `${String(1000 + i)}0`,
          IssueName__c: `銘柄${i}`,
          ProductClassification__c: "株式",
          MarketSection__c: "プライム",
          Sector__c: "電気機器",
          DomesticForeign__c: "国内",
        })),
        {
          Code__c: "72030",
          IssueName__c: "トヨタ自動車",
          ProductClassification__c: "株式",
          MarketSection__c: "プライム",
          Sector__c: "輸送用機器",
          DomesticForeign__c: "国内",
        },
        {
          Code__c: "90050",
          IssueName__c: "ETF",
          ProductClassification__c: "ETF",
          MarketSection__c: "その他",
          Sector__c: "",
          DomesticForeign__c: "国内",
        },
        {
          Code__c: "99990",
          IssueName__c: "旧会社",
          ProductClassification__c: "株式",
          MarketSection__c: "上場廃止",
          Sector__c: "電気機器",
          DomesticForeign__c: "国内",
        },
      ],
    },
  ],
});

test("JPX parser keeps listed equities and rejects incomplete downloads", () => {
  const now = new Date("2026-10-01T03:00:00Z");
  const source = parseJpxActions(fixture(), now);
  expect(source.stocks).toHaveLength(3601);
  expect(source.stocks.find((stock) => stock.code === "7203")?.name).toBe(
    "トヨタ自動車",
  );
  expect(
    source.stocks.some(
      (stock) => stock.code === "9005" || stock.code === "9999",
    ),
  ).toBe(false);
  expect(() => parseJpxActions(fixture(100), now)).toThrow(/件数/);
  const duplicated = fixture();
  const duplicatedRows = duplicated.actions[1].returnValue;
  if (!Array.isArray(duplicatedRows)) throw new Error("fixture error");
  duplicatedRows.push(duplicatedRows[0]);
  expect(() => parseJpxActions(duplicated, now)).toThrow(/件数/);
});

test("stock master updates only changed metadata and preserves broad industry", () => {
  const source = [
    {
      code: "7203",
      name: "トヨタ自動車",
      market: "プライム",
      sector: "輸送用機器",
      domestic: true,
    },
  ];
  const current = [
    {
      code: "7203",
      name: "トヨタ",
      market: "プライム（内国株式）",
      category: "輸送用機器",
      industry: "自動車・輸送機",
    },
  ];
  const changes = compareStocks(source, current);
  expect(changes[0]).toMatchObject({ kind: "changed", fields: ["銘柄名"] });
  expect(
    stockRowsForChanges(changes, current, "2026-10-01T00:00:00Z")[0],
  ).toMatchObject({
    name: "トヨタ自動車",
    industry: "自動車・輸送機",
    market: "プライム（内国株式）",
  });
  expect(
    stockRowsForChanges(
      compareStocks(source, [{ ...current[0], name: "トヨタ自動車" }]),
      current,
      "now",
    ),
  ).toHaveLength(0);
});

test("stock master requires authentication", async ({ page }) => {
  await page.goto("/dashboard/stock-master");
  await expect(page).toHaveURL(/\/sign-in/);
});
