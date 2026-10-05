import { test, expect } from "@playwright/test";
import {
  technicalLevels,
  technicalSeries,
  type StockTechnicalData,
} from "../src/lib/analysis/stock-technicals";
import type { Interval } from "../src/lib/analysis/types";
import { seconds } from "../src/lib/analysis/similarity";
import { intradayHistory } from "./fixtures/intraday";

const history = intradayHistory(7);
const labels: Record<Interval, string> = {
  "1m": "1分足",
  "5m": "5分足",
  "15m": "15分足",
};
const fixtures = Object.fromEntries(
  (["1m", "5m", "15m"] as Interval[]).map((interval, i) => {
    // Distinct valid prices make a stale response overwriting another timeframe observable.
    const factor = i + 1;
    const bars = history[interval].map((bar) => ({
      ...bar,
      open: bar.open * factor,
      high: bar.high * factor,
      low: bar.low * factor,
      close: bar.close * factor,
    }));
    const dataAt = new Date(
      (bars.at(-1)!.time + seconds[interval]) * 1000,
    ).toISOString();
    const result: StockTechnicalData = {
      symbol: "285A",
      name: "キオクシアホールディングス",
      interval,
      points: technicalSeries(bars).slice(-240),
      levels: technicalLevels(bars, "intraday"),
      dataAt,
      analyzedAt: dataAt,
      source: {
        provider: "Yahoo Finance",
        delay: "遅延の可能性があります。",
        marketState: "CLOSED",
        bars: bars.length,
        warnings: ["配信元の履歴制限を確認してください。"],
      },
    };
    return [interval, result];
  }),
) as Record<Interval, StockTechnicalData>;
function closeText(interval: Interval) {
  const close = fixtures[interval].points
    .at(-1)!
    .close.toLocaleString("ja-JP", {
      maximumFractionDigits: 2,
    });
  return `${labels[interval]} · 終値 ${close}円`;
}

test("stock details show daily indicators without a request and cache selected intraday timeframes", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const calls: Interval[] = [];
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/stocks/285A/technicals?interval=*",
    async (route) => {
      const interval = new URL(route.request().url()).searchParams.get(
        "interval",
      ) as Interval;
      calls.push(interval);
      expect(route.request().method()).toBe("GET");
      if (interval === "1m") await gate;
      await route.fulfill({ json: fixtures[interval] });
    },
  );
  await page.goto("/stocks/285A");
  const panel = page.getByRole("region", { name: "デイトレード指標" });
  const tabs = panel.getByRole("group", { name: "テクニカル指標の時間足" });
  await expect(panel).toBeVisible();
  await expect(
    tabs.getByRole("button", { name: "日足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    panel.getByText("保存済みの日足", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("RSI(14)", { exact: true })).toHaveCount(2);
  for (const name of [
    "勢い・過熱感",
    "トレンド",
    "値動き・ボラティリティ",
    "出来高・資金の動き",
    "支持・抵抗の目安",
  ])
    await expect(
      panel.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  expect(calls).toEqual([]);
  await expect(
    page.getByRole("img", {
      name: "株価ローソク足チャート。緑は陽線、赤は陰線。",
      exact: true,
    }),
  ).toBeVisible();

  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  try {
    await expect(panel.getByRole("status")).toHaveText(
      "1分足のデータと指標を取得しています…",
    );
    await expect.poll(() => calls).toEqual(["1m"]);
    await expect(panel.getByText("RSI(14)", { exact: true })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(panel.getByText(closeText("1m"), { exact: true })).toBeVisible();
  await expect(panel.getByText("VWAP", { exact: true })).toBeVisible();
  await expect(panel.getByText("取引時間外", { exact: true })).toBeVisible();
  await expect(
    panel.getByText("配信元の履歴制限を確認してください。", { exact: true }),
  ).toBeVisible();
  await tabs.getByRole("button", { name: "15分足", exact: true }).click();
  await expect(
    panel.getByText(closeText("15m"), { exact: true }),
  ).toBeVisible();
  await tabs.getByRole("button", { name: "日足", exact: true }).click();
  await expect(
    panel.getByText("保存済みの日足", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("VWAP", { exact: true })).toHaveCount(0);
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  await expect(panel.getByText(closeText("1m"), { exact: true })).toBeVisible();
  expect(calls).toEqual(["1m", "15m"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await panel.screenshot({ path: info.outputPath("stock-technicals.png") });
});

test("indicator charts load on demand and support selection and price overlays", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/api/stocks/285A/technicals?interval=*", (route) =>
    route.fulfill({ json: fixtures["1m"] }),
  );
  await page.goto("/stocks/285A");
  const panel = page.getByRole("region", { name: "デイトレード指標" });
  await panel.getByRole("button", { name: "1分足", exact: true }).click();
  await expect(panel.getByText(closeText("1m"), { exact: true })).toBeVisible();
  await expect(panel.getByRole("img")).toHaveCount(0);
  await expect(panel.getByLabel("表示する指標", { exact: true })).toHaveCount(
    0,
  );
  await panel
    .getByRole("button", { name: "指標チャートを表示", exact: true })
    .click();
  await expect(
    panel.getByRole("img", { name: "RSI(14)の指標チャート", exact: true }),
  ).toBeVisible();
  const choice = panel.getByLabel("表示する指標", { exact: true });
  await choice.selectOption("macd");
  await expect(
    panel.getByRole("img", {
      name: "MACD(12,26,9)の指標チャート",
      exact: true,
    }),
  ).toBeVisible();
  await choice.selectOption("price");
  await expect(
    panel.getByRole("img", {
      name: "株価・移動平均・ボリンジャーバンドの指標チャート",
      exact: true,
    }),
  ).toBeVisible();
  const overlays = panel.getByRole("group", {
    name: "株価チャートの重ね合わせ指標",
  });
  const ema20 = overlays.getByRole("checkbox", { name: "EMA20", exact: true });
  await expect(ema20).toBeChecked();
  await ema20.uncheck();
  await expect(ema20).not.toBeChecked();
  await expect(
    overlays.getByRole("checkbox", { name: "VWAP", exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "日足", exact: true }).click();
  await expect(
    overlays.getByRole("checkbox", { name: "VWAP", exact: true }),
  ).toHaveCount(0);
  await panel
    .getByRole("button", { name: "指標チャートを閉じる", exact: true })
    .click();
  await expect(panel.getByRole("img")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("rate limits and provider errors hide results and allow explicit retry", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/stocks/285A/technicals?interval=*", (route) => {
    calls++;
    return route.fulfill(
      calls === 1
        ? {
            status: 429,
            json: { error: "株価APIのリクエスト制限に達しました。" },
            headers: { "Retry-After": "60" },
          }
        : calls === 2
          ? {
              status: 503,
              json: { error: "配信元から株価データを取得できませんでした。" },
            }
          : { json: fixtures["5m"] },
    );
  });
  await page.goto("/stocks/285A");
  const panel = page.getByRole("region", { name: "デイトレード指標" });
  await panel.getByRole("button", { name: "5分足", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("リクエスト制限");
  await expect(panel.getByText("RSI(14)", { exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: "再試行", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("配信元から株価データ");
  await expect(panel.getByText(closeText("5m"), { exact: true })).toHaveCount(
    0,
  );
  await panel.getByRole("button", { name: "再試行", exact: true }).click();
  await expect(panel.getByText(closeText("5m"), { exact: true })).toBeVisible();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  expect(calls).toBe(3);
});

test("switching timeframe cancels a slow request so late data cannot replace the selected timeframe", async ({
  page,
}) => {
  let oneMinuteCalls = 0,
    release = () => {},
    oldFulfilled = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/stocks/285A/technicals?interval=*",
    async (route) => {
      const interval = new URL(route.request().url()).searchParams.get(
        "interval",
      ) as Interval;
      if (interval === "1m" && ++oneMinuteCalls === 1) {
        await gate;
        // The server can finish after the browser cancels; this response must stay ignored.
        await route.fulfill({ json: fixtures[interval] }).catch(() => {});
        oldFulfilled = true;
        return;
      }
      await route.fulfill({ json: fixtures[interval] });
    },
  );
  await page.goto("/stocks/285A");
  const panel = page.getByRole("region", { name: "デイトレード指標" });
  await panel.getByRole("button", { name: "1分足", exact: true }).click();
  await expect(panel.getByRole("status")).toBeVisible();
  await expect.poll(() => oneMinuteCalls).toBe(1);
  try {
    await panel.getByRole("button", { name: "15分足", exact: true }).click();
    await expect(
      panel.getByText(closeText("15m"), { exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect.poll(() => oldFulfilled).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    panel.getByText(closeText("15m"), { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "15分足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("status")).toHaveCount(0);
  await panel.getByRole("button", { name: "1分足", exact: true }).click();
  await expect(panel.getByText(closeText("1m"), { exact: true })).toBeVisible();
  expect(oneMinuteCalls).toBe(2);
});
