import { test, expect } from "@playwright/test";
import { analyzeMarket } from "../src/lib/analysis/engine";
import { intradayHistory } from "./fixtures/intraday";
const stock = { code: "7203", name: "トヨタ自動車", market: "プライム" };
const history = intradayHistory();
const result = analyzeMarket(stock, history, history["1m"].at(-100)!.time + 60);

test("search, selection, loading, results and lazy charts work on both layouts", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let calls = 0,
    release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/stocks/search?**", (route) =>
    route.fulfill({ json: [stock] }),
  );
  await page.route("**/api/stock-analysis", async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ symbol: "7203" });
    await gate;
    await route.fulfill({ json: result });
  });
  await page.goto("/stock-analysis");
  const button = page.getByRole("button", { name: "分析する", exact: true });
  await expect(button).toBeDisabled();
  await page.getByLabel("銘柄コード・銘柄名を検索").fill("トヨタ");
  await page.getByRole("button", { name: /7203 トヨタ自動車/ }).click();
  await expect(button).toBeEnabled();
  expect(calls).toBe(0);
  await button.click();
  try {
    await expect(page.getByRole("button", { name: "分析中…" })).toBeDisabled();
    await expect.poll(() => calls).toBe(1);
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: "エントリー予想" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "RCI Price Projection" }),
  ).toBeVisible();
  await expect(
    page.getByText(/勝率や将来予測の正確さではありません/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "チャートを表示", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "株価・EMA20・EMA50・VWAP", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "15分足", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "15分足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: info.outputPath("stock-analysis.png"),
    fullPage: true,
  });
});

test("data errors can be retried and no predicted prices appear on failure", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/stock-analysis", (route) => {
    calls++;
    return route.fulfill(
      calls === 1
        ? {
            status: 422,
            json: { error: "1mの分析に必要なデータが不足しています。" },
          }
        : { json: result },
    );
  });
  await page.goto("/stock-analysis?code=7203");
  await page.getByRole("button", { name: "分析する", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("不足");
  await expect(
    page.getByRole("heading", { name: "エントリー予想" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "分析する", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "エントリー予想" }),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("empty search and search errors are visible and do not start analysis", async ({
  page,
}) => {
  await page.route("**/api/stocks/search?**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/stock-analysis");
  await page.getByLabel("銘柄コード・銘柄名を検索").fill("見つからない");
  await expect(page.getByText(/候補が見つかりません/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "分析する", exact: true }),
  ).toBeDisabled();
  await page.unroute("**/api/stocks/search?**");
  await page.route("**/api/stocks/search?**", (route) =>
    route.fulfill({ status: 503, json: { error: "取得失敗" } }),
  );
  await page.getByLabel("銘柄コード・銘柄名を検索").fill("7203");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "検索できません",
  );
});

test("analysis API validates JSON and symbols and searches the real catalogue", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/stock-analysis", { data: { symbol: "bad" } })
    ).status(),
  ).toBe(400);
  expect(
    (await request.post("/api/stock-analysis", { data: "{" })).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/stock-analysis", { data: { symbol: "ZZZZZ" } })
    ).status(),
  ).toBe(404);
  const response = await request.get("/api/stocks/search?q=7203");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "7203" })]),
  );
});
