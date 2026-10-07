import { expect, test } from "@playwright/test";

const analysisKey = "daytrade.recent.analysis.v1";
const chartKey = "daytrade.recent.chart.v1";
const entry = (code: string, name: string, viewedAt: number) => ({
  code,
  name,
  market: null,
  viewedAt,
  timeframe: "5m",
  preset: "standard",
  chartOpen: false,
});

test("history changes synchronize between tabs and clearing preserves the other feature", async ({
  page,
  context,
}) => {
  await page.goto("/stock-analysis");
  const initial = [
    entry("7203", "テスト銘柄A", Date.now()),
    entry("285A", "テスト銘柄B", Date.now() - 1000),
  ];
  const otherHistory = JSON.stringify({
    version: 1,
    entries: [{ ...initial[0], timeframe: "daily", chartOpen: true }],
  });
  await page.evaluate(
    ({ analysisKey, chartKey, initial, otherHistory }) => {
      localStorage.setItem(
        analysisKey,
        JSON.stringify({ version: 1, entries: initial }),
      );
      localStorage.setItem(chartKey, otherHistory);
    },
    { analysisKey, chartKey, initial, otherHistory },
  );
  await page.reload();
  const panel = page.getByRole("region", { name: "デイトレード分析の履歴" });
  await expect(
    panel.getByRole("button", { name: "テスト銘柄A（7203）を履歴から開く" }),
  ).toBeVisible();

  const second = await context.newPage();
  await second.goto("/stock-analysis");
  const secondPanel = second.getByRole("region", {
    name: "デイトレード分析の履歴",
  });
  await expect(
    secondPanel.getByRole("button", {
      name: "テスト銘柄A（7203）を履歴から開く",
    }),
  ).toBeVisible();

  const newEntry = entry("9984", "テスト銘柄C", Date.now() + 1000);
  await second.evaluate(
    ({ key, entries }) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, entries }));
    },
    { key: analysisKey, entries: [newEntry, ...initial] },
  );
  await expect(
    panel.getByRole("button", { name: "テスト銘柄C（9984）を履歴から開く" }),
  ).toBeVisible();

  // A mutation reads the latest disk copy even when another tab made the change.
  await panel
    .getByRole("button", { name: "テスト銘柄A（7203）の履歴を削除" })
    .click();
  await expect(
    secondPanel.getByRole("button", {
      name: "テスト銘柄A（7203）を履歴から開く",
    }),
  ).toHaveCount(0);
  await expect(
    secondPanel.getByRole("button", {
      name: "テスト銘柄C（9984）を履歴から開く",
    }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "デイトレード分析の履歴をすべて削除" })
    .click();
  await expect(secondPanel.getByText("0 / 20")).toBeVisible();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), analysisKey))
    .toBeNull();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), chartKey),
  ).toBe(otherHistory);
  // Browsers may deliver a queued event after a newer local deletion.
  await page.evaluate(
    ({ key, initial }) => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key,
          newValue: JSON.stringify({ version: 1, entries: initial }),
          storageArea: window.localStorage,
        }),
      );
    },
    { key: analysisKey, initial },
  );
  await expect(panel.getByText("0 / 20")).toBeVisible();
  await page.reload();
  await expect(panel.getByText("0 / 20")).toBeVisible();
  await second.close();
});

test("broken stored data is ignored and expanded history remains usable on narrow screens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/stock-analysis");
  await page.evaluate(
    (key) => localStorage.setItem(key, "{broken"),
    analysisKey,
  );
  await page.reload();
  const panel = page.getByRole("region", { name: "デイトレード分析の履歴" });
  await expect(panel.getByText("0 / 20")).toBeVisible();

  const entries = Array.from({ length: 20 }, (_, i) =>
    entry(
      String(1000 + i),
      "長い銘柄名の表示と履歴削除を確認するためのテスト銘柄" + i,
      Date.now() - i * 1000,
    ),
  );
  await page.evaluate(
    ({ key, entries }) =>
      localStorage.setItem(key, JSON.stringify({ version: 1, entries })),
    { key: analysisKey, entries },
  );
  await page.reload();
  await expect(panel.getByText("20 / 20")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: /を履歴から開く$/ }),
  ).toHaveCount(4);
  await panel.getByRole("button", { name: /履歴をすべて表示/ }).click();
  await expect(
    panel.getByRole("button", { name: /を履歴から開く$/ }),
  ).toHaveCount(20);
  await panel.getByRole("button", { name: "履歴を折りたたむ" }).click();
  await expect(
    panel.getByRole("button", { name: /を履歴から開く$/ }),
  ).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
