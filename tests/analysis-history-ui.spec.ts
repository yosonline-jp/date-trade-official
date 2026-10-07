import { expect, test, type Page } from "@playwright/test";
import { analyzeMarket } from "../src/lib/analysis/engine";
import type { HistoryEntry } from "../src/lib/stock-history";
import { intradayHistory } from "./fixtures/intraday";

const HISTORY_KEY = "daytrade.recent.analysis.v1";
const stock = { code: "7203", name: "トヨタ自動車", market: "プライム" };
const source = intradayHistory();
const result = analyzeMarket(stock, source, source["1m"].at(-100)!.time + 60);
const historySelect = "トヨタ自動車（7203）を履歴から開く";

async function storedHistory(page: Page): Promise<HistoryEntry[]> {
  return page.evaluate((key) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved).entries : [];
  }, HISTORY_KEY);
}

test("successful analysis persists settings and history starts fresh analysis for the chosen stock", async ({
  page,
}) => {
  let calls = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/stock-analysis", async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ symbol: "7203" });
    if (calls === 2) await gate;
    await route.fulfill({
      json: {
        ...result,
        reasons: [calls === 2 ? "履歴から新しく取得した分析" : "初回の分析"],
      },
    });
  });
  await page.goto("/stock-analysis?code=7203");
  const panel = page.getByRole("region", {
    name: "デイトレード分析の履歴",
    exact: true,
  });
  await expect.poll(() => calls).toBe(0);
  await page.getByRole("button", { name: "分析する", exact: true }).click();
  await expect(page.getByText("初回の分析", { exact: true })).toBeVisible();
  await expect
    .poll(() => storedHistory(page))
    .toEqual([
      expect.objectContaining({
        code: "7203",
        timeframe: "1m",
        chartOpen: false,
      }),
    ]);
  const savedMarket = (await storedHistory(page))[0].market;
  await page
    .getByRole("button", { name: "チャートを表示", exact: true })
    .click();
  await page.getByRole("button", { name: "15分足", exact: true }).click();
  await expect
    .poll(() => storedHistory(page))
    .toEqual([
      {
        ...stock,
        market: savedMarket,
        timeframe: "15m",
        preset: "standard",
        chartOpen: true,
        viewedAt: expect.any(Number),
      },
    ]);

  // A different current selection catches using an outdated selected closure.
  await page.goto("/stock-analysis?code=285A");
  await expect(
    panel.getByRole("button", { name: historySelect, exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
  await expect(page.getByLabel("銘柄コード・銘柄名を検索")).toHaveValue("285A");
  await expect(page.getByLabel("株式分析結果")).toHaveCount(0);
  await panel.getByRole("button", { name: historySelect, exact: true }).click();
  try {
    await expect.poll(() => calls).toBe(2);
    await expect(
      panel.getByRole("button", { name: historySelect, exact: true }),
    ).toBeDisabled();
    await expect(page.getByLabel("銘柄コード・銘柄名を検索")).toHaveValue(
      "7203",
    );
  } finally {
    release();
  }
  await expect(
    page.getByText("履歴から新しく取得した分析", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "チャートを閉じる", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "15分足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("img", { name: "株価・EMA20・EMA50・VWAP", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => storedHistory(page))
    .toEqual([
      expect.objectContaining({
        code: "7203",
        timeframe: "15m",
        chartOpen: true,
      }),
    ]);
});

test("searching, selecting and failed analysis do not add history", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/stocks/search?**", (route) =>
    route.fulfill({ json: [stock] }),
  );
  await page.route("**/api/stock-analysis", (route) => {
    calls++;
    return route.fulfill({
      status: 422,
      json: { error: "分析に必要なデータが不足しています。" },
    });
  });
  await page.goto("/stock-analysis");
  await page.getByLabel("銘柄コード・銘柄名を検索").fill("トヨタ");
  await page.getByRole("button", { name: /7203 トヨタ自動車/ }).click();
  expect(calls).toBe(0);
  expect(await storedHistory(page)).toEqual([]);
  await page.getByRole("button", { name: "分析する", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("不足");
  expect(calls).toBe(1);
  expect(await storedHistory(page)).toEqual([]);
  await expect(
    page.getByRole("button", { name: historySelect, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("株式分析結果")).toHaveCount(0);
});

test("clearing history keeps the result and does not restore the entry on render or reload", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/stock-analysis", (route) => {
    calls++;
    return route.fulfill({ json: result });
  });
  await page.goto("/stock-analysis?code=7203");
  await page.getByRole("button", { name: "分析する", exact: true }).click();
  await expect(
    page.getByRole("button", { name: historySelect, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "デイトレード分析の履歴をすべて削除",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: historySelect, exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("株式分析結果")).toBeVisible();
  await expect.poll(() => storedHistory(page)).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "デイトレード分析の履歴", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: historySelect, exact: true }),
  ).toHaveCount(0);
  expect(await storedHistory(page)).toEqual([]);
  expect(calls).toBe(1);
});

test("an invalid successful response is not displayed or stored for the wrong stock", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/stock-analysis", (route) => {
    calls++;
    return route.fulfill({
      json:
        calls === 1 ? { ...result, symbol: "285A" } : { ...result, name: " " },
    });
  });
  await page.goto("/stock-analysis?code=7203");
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "分析する", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "分析結果を確認できません",
    );
    await expect(page.getByLabel("株式分析結果")).toHaveCount(0);
    expect(await storedHistory(page)).toEqual([]);
  }
  expect(calls).toBe(2);
});

test("analysis still succeeds when LocalStorage cannot save history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "daytrade.recent.analysis.v1")
        throw new Error("Test storage blocked");
      return original.call(this, key, value);
    };
  });
  await page.route("**/api/stock-analysis", (route) =>
    route.fulfill({ json: result }),
  );
  await page.goto("/stock-analysis?code=7203");
  await page.getByRole("button", { name: "分析する", exact: true }).click();
  await expect(page.getByLabel("株式分析結果")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "エントリー予想", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});
