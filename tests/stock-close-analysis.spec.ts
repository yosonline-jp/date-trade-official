import { test, expect } from "@playwright/test";
import type { StockCloseAnalysis } from "../src/lib/market/close-forecast";

const result: StockCloseAnalysis = {
  code: "285A",
  name: "キオクシアホールディングス",
  tradingDate: "2026-10-02",
  analyzedAt: "2026-10-04T01:00:00Z",
  isCurrentDate: false,
  historyRange: "1mo",
  targetTimestamp: 1790899200,
  startPrice: 110,
  startPriceSource: "open",
  analysisClose: 113,
  predictedClose: 114.5,
  changePercent: 4.09,
  score: 4,
  dataPoints: 21,
  indicators: {
    ema5: 112,
    ema20: 108,
    rsi14: 61,
    macd: 1.25,
    macdSignal: 1.1,
    macdHistogram: 0.15,
    atr14: 4.6,
    atrPercent: 4.07,
  },
  ruleScores: { trend: 2, rsi: 1, macd: 1 },
};

test("stock detail analyzes an alphanumeric code only when clicked", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let requests = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/stocks/285A/close-analysis", async (route) => {
    requests++;
    expect(route.request().method()).toBe("POST");
    await gate;
    await route.fulfill({ json: result });
  });
  await page.goto("/stocks/285A");
  const panel = page.getByRole("region", { name: "終値予測" });
  await expect(panel).toBeVisible();
  expect(requests).toBe(0);
  await panel.getByRole("button", { name: "終値を分析", exact: true }).click();
  try {
    await expect(panel.getByRole("button", { name: "分析中…" })).toBeDisabled();
    await expect.poll(() => requests).toBe(1);
  } finally {
    release();
  }
  await expect(panel.getByText("¥114.5", { exact: true })).toBeVisible();
  await expect(panel.getByText(/直近取引日/)).toBeVisible();
  await panel.getByText("計算の根拠を見る").click();
  await expect(panel.getByText("112 / 108 円", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await panel.screenshot({ path: testInfo.outputPath("close-analysis.png") });
});

test("stock detail shows an analysis error and allows retry", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/stocks/285A/close-analysis", async (route) => {
    requests++;
    if (requests === 1)
      await route.fulfill({
        status: 503,
        json: { error: "株価データを取得できませんでした。" },
      });
    else
      await route.fulfill({
        json: { ...result, startPriceSource: "close", analysisClose: 110 },
      });
  });
  await page.goto("/stocks/285A");
  const panel = page.getByRole("region", { name: "終値予測" });
  await panel.getByRole("button", { name: "終値を分析", exact: true }).click();
  await expect(panel.getByRole("alert")).toHaveText(
    "株価データを取得できませんでした。",
  );
  await expect(panel.getByText("¥114.5", { exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: "終値を分析", exact: true }).click();
  await expect(panel.getByText("¥114.5", { exact: true })).toBeVisible();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(
    panel.getByText("基準価格（始値未取得）", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText(/始値が未取得のため/)).toBeVisible();
});

test("close analysis endpoint rejects invalid codes", async ({ request }) => {
  const response = await request.post("/api/stocks/invalid/close-analysis");
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({
    error: "銘柄コードが正しくありません。",
  });
});
