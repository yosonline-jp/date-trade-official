import { expect, test, type Page } from "@playwright/test";
import {
  technicalLevels,
  technicalSeries,
  type StockTechnicalData,
} from "../src/lib/analysis/stock-technicals";
import type { Interval } from "../src/lib/analysis/types";
import { seconds } from "../src/lib/analysis/similarity";
import { historyKey, type HistoryEntry } from "../src/lib/stock-history";
import { intradayHistory } from "./fixtures/intraday";

const key = historyKey("chart");
const history = intradayHistory(3);
const fixtures = Object.fromEntries(
  (["1m", "5m", "15m"] as Interval[]).map((interval, index) => {
    const bars = history[interval].map((bar) => ({
      ...bar,
      open: bar.open * (index + 1),
      high: bar.high * (index + 1),
      low: bar.low * (index + 1),
      close: bar.close * (index + 1),
    }));
    const dataAt = new Date(
      (bars.at(-1)!.time + seconds[interval]) * 1000,
    ).toISOString();
    const fixture: StockTechnicalData = {
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
        warnings: [],
      },
    };
    return [interval, fixture];
  }),
) as Record<Interval, StockTechnicalData>;

type Errors = { page: string[]; console: { text: string; url: string }[] };
const captured = new WeakMap<Page, Errors>();
test.beforeEach(async ({ page }) => {
  const errors: Errors = { page: [], console: [] };
  captured.set(page, errors);
  page.on("pageerror", (error) => errors.page.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.console.push({
        text: message.text(),
        url: message.location().url,
      });
    }
  });
});
test.afterEach(async ({ page }) => {
  const errors = captured.get(page)!;
  expect(errors.page).toEqual([]);
  expect(
    errors.console.filter(
      (error) =>
        !(
          error.url.includes("/api/stocks/285A/technicals?") &&
          /Failed to load resource/.test(error.text) &&
          error.text.includes("503")
        ),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

async function entries(page: Page): Promise<HistoryEntry[]> {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw).entries : [];
  }, key);
}
function workspace(page: Page) {
  return page.getByRole("region", {
    name: "チャートワークスペース",
    exact: true,
  });
}
function chart(page: Page) {
  return workspace(page).getByRole("region", {
    name: "トレーディングチャート",
    exact: true,
  });
}
function recent(page: Page) {
  return workspace(page).getByRole("region", {
    name: "チャートの閲覧履歴",
    exact: true,
  });
}
function openHistory(page: Page, code = "285A") {
  return recent(page).getByRole("button", {
    name: new RegExp("（" + code + "）を履歴から開く$"),
  });
}
async function mockIntraday(
  page: Page,
  options: { empty?: Interval; fail?: Interval } = {},
) {
  const calls: { code: string; interval: Interval }[] = [];
  await page.route("**/api/stocks/*/technicals?*", async (route) => {
    const url = new URL(route.request().url());
    const interval = url.searchParams.get("interval") as Interval;
    const code = url.pathname.split("/")[3];
    expect(url.searchParams.get("limit")).toBe("1200");
    calls.push({ code, interval });
    if (options.fail === interval) {
      await route.fulfill({
        status: 503,
        json: { error: "履歴テスト: 分足を取得できませんでした。" },
      });
      return;
    }
    await route.fulfill({
      json: {
        ...fixtures[interval],
        symbol: code,
        points: options.empty === interval ? [] : fixtures[interval].points,
      },
    });
  });
  return calls;
}

test("successful URL-restored charts save metadata and survive reload without price snapshots", async ({
  page,
}) => {
  await mockIntraday(page);
  await page.goto("/chart?code=285A&interval=5m&preset=daytrade");
  await expect(
    chart(page).getByRole("button", { name: "EMA9 ON", exact: true }),
  ).toBeVisible();
  await expect(
    chart(page).getByRole("button", { name: "VWAP ON", exact: true }),
  ).toBeVisible();
  await expect(
    workspace(page)
      .getByRole("group", { name: "チャートの時間足" })
      .getByRole("button", { name: "5分足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => (await entries(page))[0])
    .toMatchObject({
      code: "285A",
      timeframe: "5m",
      preset: "daytrade",
      chartOpen: true,
    });
  const saved = (await entries(page))[0];
  expect(saved.name).not.toBe("285A");
  expect(saved.viewedAt).toBeGreaterThan(0);
  expect(Object.keys(saved).sort()).toEqual([
    "chartOpen",
    "code",
    "market",
    "name",
    "preset",
    "timeframe",
    "viewedAt",
  ]);
  await page.reload();
  await expect(
    chart(page).getByRole("button", { name: "VWAP ON", exact: true }),
  ).toBeVisible();
  await expect(openHistory(page)).toBeVisible();
  await expect.poll(async () => (await entries(page)).length).toBe(1);
});

test("one history selection restores another symbol's timeframe and preset with a fresh data request", async ({
  page,
}) => {
  const calls = await mockIntraday(page);
  await page.goto("/chart?code=285A&interval=1m&preset=trend");
  await expect(
    chart(page).getByRole("button", { name: "MACD ON", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await entries(page))[0])
    .toMatchObject({
      code: "285A",
      timeframe: "1m",
      preset: "trend",
    });
  await page.goto("/chart?code=7203");
  await expect.poll(async () => (await entries(page))[0]?.code).toBe("7203");
  const before = calls.length;
  await openHistory(page).click();
  await expect
    .poll(() => new URL(page.url()).search)
    .toBe("?code=285A&interval=1m&preset=trend");
  await expect(
    chart(page).getByRole("button", { name: "MA5 ON", exact: true }),
  ).toBeVisible();
  await expect(
    chart(page).getByRole("button", { name: "MA75 ON", exact: true }),
  ).toBeVisible();
  await expect(
    chart(page).getByRole("button", { name: "MACD ON", exact: true }),
  ).toBeVisible();
  await expect.poll(() => calls.length).toBeGreaterThan(before);
  await expect.poll(async () => (await entries(page))[0]?.code).toBe("285A");
  expect((await entries(page)).map((entry) => entry.code)).toEqual([
    "285A",
    "7203",
  ]);
});

test("the current symbol's history also restores canonical indicators after manual changes", async ({
  page,
}) => {
  await mockIntraday(page);
  await page.goto("/chart?code=285A&interval=1m&preset=trend");
  await expect(openHistory(page)).toBeVisible();
  await chart(page)
    .getByRole("button", { name: "MA5 ON", exact: true })
    .click();
  await expect(
    chart(page).getByRole("button", { name: "MA5 OFF", exact: true }),
  ).toBeVisible();
  await openHistory(page).click();
  await expect(
    chart(page).getByRole("button", { name: "MA5 ON", exact: true }),
  ).toBeVisible();
  await expect(
    chart(page).getByRole("button", { name: "MACD ON", exact: true }),
  ).toBeVisible();
  await expect.poll(async () => (await entries(page)).length).toBe(1);
});

test("empty and failed frames do not overwrite the last successful history settings", async ({
  page,
}) => {
  await mockIntraday(page, { empty: "1m", fail: "15m" });
  await page.goto("/chart?code=285A&interval=1m&preset=daytrade");
  await expect(
    workspace(page).getByText("チャートデータはありません。", { exact: true }),
  ).toBeVisible();
  await expect(
    recent(page).getByText("履歴を読み込んでいます…", { exact: true }),
  ).toHaveCount(0);
  expect(await entries(page)).toEqual([]);
  const timeframes = workspace(page).getByRole("group", {
    name: "チャートの時間足",
  });
  await timeframes.getByRole("button", { name: "5分足", exact: true }).click();
  await expect
    .poll(async () => (await entries(page))[0])
    .toMatchObject({
      code: "285A",
      timeframe: "5m",
      preset: "daytrade",
    });
  await timeframes.getByRole("button", { name: "15分足", exact: true }).click();
  await expect(workspace(page).getByRole("alert")).toContainText("履歴テスト:");
  expect((await entries(page))[0].timeframe).toBe("5m");
});

test("clearing or removing the current history does not immediately re-register the displayed chart", async ({
  page,
}) => {
  await page.goto("/chart?code=285A");
  await expect(openHistory(page)).toBeVisible();
  await recent(page)
    .getByRole("button", { name: "チャートの履歴をすべて削除", exact: true })
    .click();
  await expect(openHistory(page)).toHaveCount(0);
  expect(await entries(page)).toEqual([]);
  await chart(page).getByRole("button", { name: "30本", exact: true }).click();
  await expect(
    chart(page).getByRole("button", { name: "30本", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await entries(page)).toEqual([]);
  await chart(page)
    .getByRole("button", { name: "トレンド", exact: true })
    .click();
  await expect(openHistory(page)).toBeVisible();
  await recent(page)
    .getByRole("button", { name: /（285A）の履歴を削除$/ })
    .click();
  await expect(openHistory(page)).toHaveCount(0);
  expect(await entries(page)).toEqual([]);
});

test("blocked local storage leaves the chart and in-memory history usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value(this: Storage, storageKey: string, value?: string) {
          if (storageKey.startsWith("daytrade.recent.")) {
            throw new DOMException(
              "History storage is blocked",
              "SecurityError",
            );
          }
          return method === "setItem"
            ? (original as Storage["setItem"]).call(this, storageKey, value!)
            : (original as Storage["getItem"]).call(this, storageKey);
        },
      });
    }
  });
  await page.goto("/chart?code=285A");
  await expect(chart(page).getByRole("img")).toBeVisible();
  await expect(recent(page).getByRole("status")).toContainText(
    "このブラウザーでは履歴を保存できません",
  );
  await expect(openHistory(page)).toBeVisible();
  await recent(page)
    .getByRole("button", { name: "チャートの履歴をすべて削除", exact: true })
    .click();
  await expect(openHistory(page)).toHaveCount(0);
  await expect(chart(page).getByRole("img")).toBeVisible();
});

test("invalid or repeated query settings fall back to the standard daily chart", async ({
  page,
}) => {
  const calls = await mockIntraday(page);
  await page.goto("/chart?code=285A&interval=5m&interval=1m&preset=invalid");
  await expect(
    workspace(page)
      .getByRole("group", { name: "チャートの時間足" })
      .getByRole("button", { name: "日足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    chart(page).getByRole("button", { name: "MA25 ON", exact: true }),
  ).toBeVisible();
  await expect(
    chart(page).getByRole("button", { name: "MACD OFF", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await entries(page))[0])
    .toMatchObject({
      code: "285A",
      timeframe: "daily",
      preset: "standard",
    });
  expect(calls).toEqual([]);
});

test("history controls wait for the current data request before allowing deletion", async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/stocks/285A/technicals?*", async (route) => {
    await gate;
    await route.fulfill({ json: fixtures["1m"] });
  });
  await page.goto("/chart?code=285A");
  await expect(openHistory(page)).toBeVisible();
  await workspace(page)
    .getByRole("group", { name: "チャートの時間足" })
    .getByRole("button", { name: "1分足", exact: true })
    .click();
  try {
    await expect(
      recent(page).getByRole("button", { name: "チャートの履歴をすべて削除" }),
    ).toBeDisabled();
    await expect(openHistory(page)).toBeDisabled();
    await expect(
      recent(page).getByRole("button", { name: /（285A）の履歴を削除$/ }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect.poll(async () => (await entries(page))[0].timeframe).toBe("1m");
  await recent(page)
    .getByRole("button", { name: "チャートの履歴をすべて削除" })
    .click();
  await expect(openHistory(page)).toHaveCount(0);
  await expect(chart(page).getByRole("img")).toBeVisible();
});
