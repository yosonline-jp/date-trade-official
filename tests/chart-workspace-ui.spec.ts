import { test, expect, type Locator, type Page } from "@playwright/test";
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
  (["1m", "5m", "15m"] as Interval[]).map((interval, index) => {
    const factor = index + 1;
    const bars = history[interval].map((bar, i) => ({
      ...bar,
      open: bar.open * factor,
      high: bar.high * factor,
      low: bar.low * factor,
      close: bar.close * factor,
      // Keep the price candle while leaving a visible gap in the volume pane.
      volume: i === history[interval].length - 10 ? NaN : bar.volume,
    }));
    const dataAt = new Date(
      (bars.at(-1)!.time + seconds[interval]) * 1000,
    ).toISOString();
    const result: StockTechnicalData = {
      symbol: "285A",
      name: "キオクシアホールディングス",
      interval,
      points: technicalSeries(bars).slice(-1200),
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
const apiPattern = "**/api/stocks/285A/technicals?*";
type CapturedErrors = {
  page: string[];
  console: Array<{ text: string; url: string }>;
  expectedStatuses: Set<number>;
};
const captured = new WeakMap<Page, CapturedErrors>();

test.beforeEach(async ({ page }) => {
  const errors: CapturedErrors = {
    page: [],
    console: [],
    expectedStatuses: new Set(),
  };
  captured.set(page, errors);
  page.on("pageerror", (error) => errors.page.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.console.push({
        text: message.text(),
        url: message.location().url,
      });
  });
});

test.afterEach(async ({ page }) => {
  const errors = captured.get(page)!;
  const unexpected = errors.console.filter(
    (error) =>
      !(
        error.url.includes("/api/stocks/285A/technicals?") &&
        /Failed to load resource/i.test(error.text) &&
        [...errors.expectedStatuses].some((status) =>
          error.text.includes(String(status)),
        )
      ),
  );
  expect(errors.page, "unexpected page exceptions").toEqual([]);
  expect(unexpected, "unexpected console.error, including hydration").toEqual(
    [],
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "the workspace fits the desktop/mobile viewport",
  ).toBe(true);
});

async function openWorkspace(page: Page) {
  await page.goto("/chart?code=285A");
  const workspace = page.getByRole("region", {
    name: "チャートワークスペース",
  });
  await expect(workspace).toBeVisible();
  const chart = workspace.getByRole("region", {
    name: "トレーディングチャート",
  });
  await expect(chart.getByRole("img")).toBeVisible();
  return {
    workspace,
    chart,
    tabs: workspace.getByRole("group", { name: "チャートの時間足" }),
    // Retain a DOM locator so hidden loading/error charts can also be checked.
    svg: workspace.locator('svg[role="img"]'),
  };
}

async function mockIntraday(page: Page) {
  const calls: Interval[] = [];
  await page.route(apiPattern, async (route) => {
    const url = new URL(route.request().url());
    const interval = url.searchParams.get("interval") as Interval;
    expect(route.request().method()).toBe("GET");
    expect(url.searchParams.get("limit")).toBe("1200");
    calls.push(interval);
    await route.fulfill({ json: fixtures[interval] });
  });
  return calls;
}

async function selectedData(svg: Locator, interval: Interval) {
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute(
    "data-last-close",
    String(fixtures[interval].points.at(-1)!.close),
  );
}

function numberText(value: number) {
  return value.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function parseCsv(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .map((row) =>
      [...row.matchAll(/"((?:[^"]|"")*)"/g)].map((match) =>
        match[1].replaceAll('""', '"'),
      ),
    );
}

test("saved daily and weekly charts need no technical API and preserve display controls", async ({
  page,
}, info) => {
  const calls = await mockIntraday(page);
  const { workspace, chart, tabs, svg } = await openWorkspace(page);
  await expect(
    tabs.getByRole("button", { name: "日足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(svg).toHaveAccessibleName(
    "株価ローソク足チャート。緑は陽線、赤は陰線。",
  );
  await expect(
    chart.getByRole("button", { name: "90本", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    chart.getByRole("button", { name: "MA25 ON", exact: true }),
  ).toBeVisible();
  await expect(
    chart.getByRole("button", { name: "出来高 ON", exact: true }),
  ).toBeVisible();
  await expect(
    chart.getByRole("button", { name: "VWAP OFF", exact: true }),
  ).toBeDisabled();
  const dailyCount = Number(await svg.getAttribute("data-visible-count"));
  const dailyClose = await svg.getAttribute("data-last-close");
  expect(dailyCount).toBeGreaterThan(0);
  expect(calls).toEqual([]);

  const formats = chart.getByRole("group", { name: "チャート表示形式" });
  await formats
    .getByRole("button", { name: "終値ライン", exact: true })
    .click();
  await expect(svg).toHaveAccessibleName("株価終値ラインチャート。");
  await expect(svg.locator('[data-series="終値"]')).toHaveCount(1);
  await expect(svg.locator("[data-candle]")).toHaveCount(0);
  await formats.getByRole("button", { name: "平均足", exact: true }).click();
  await expect(svg).toHaveAccessibleName(
    "株価平均足チャート。表示価格は合成値です。",
  );
  await expect(
    chart.getByText("OHLCは実価格・描画は平均足", { exact: true }),
  ).toBeVisible();
  await expect(svg.locator("[data-candle]")).toHaveCount(dailyCount);
  await expect(svg).toHaveAttribute("data-last-close", dailyClose!);

  await chart
    .getByRole("button", { name: "デイトレード", exact: true })
    .click();
  for (const name of ["EMA9 ON", "EMA20 ON", "BB ON", "RSI ON"])
    await expect(
      chart.getByRole("button", { name, exact: true }),
    ).toBeVisible();
  await expect(svg.locator('[data-pane="rsi"]')).toHaveCount(1);
  await expect(svg.locator('[data-series="BB上限"]')).toHaveCount(1);
  await chart.getByRole("button", { name: "トレンド", exact: true }).click();
  for (const name of ["MA5 ON", "MA25 ON", "MA75 ON", "MACD ON"])
    await expect(
      chart.getByRole("button", { name, exact: true }),
    ).toBeVisible();
  await expect(svg.locator('[data-pane="macd"]')).toHaveCount(1);
  await chart.getByRole("button", { name: "標準", exact: true }).click();
  await expect(
    chart.getByRole("button", { name: "MACD OFF", exact: true }),
  ).toBeVisible();

  await chart.getByText("詳細設定・描画ツール", { exact: true }).click();
  const period = chart.getByRole("spinbutton", {
    name: "追加する移動平均の期間",
  });
  await period.fill("201");
  await chart
    .getByRole("button", { name: "移動平均を追加", exact: true })
    .click();
  expect(
    await period.evaluate((input) =>
      (input as HTMLInputElement).checkValidity(),
    ),
  ).toBe(false);
  await expect(
    chart.getByRole("button", { name: "EMA201 ON", exact: true }),
  ).toHaveCount(0);
  await period.fill("13");
  await chart
    .getByRole("button", { name: "移動平均を追加", exact: true })
    .click();
  await expect(
    chart.getByRole("button", { name: "EMA13 ON", exact: true }),
  ).toBeVisible();
  await expect(svg.locator('[data-series="EMA13"]')).toHaveCount(1);
  await chart
    .getByRole("combobox", { name: "追加する移動平均の種類" })
    .selectOption("sma");
  await chart
    .getByRole("button", { name: "移動平均を追加", exact: true })
    .click();
  await expect(svg.locator('[data-series="MA13"]')).toHaveCount(1);
  await chart.getByRole("button", { name: "MA13を削除", exact: true }).click();
  await expect(svg.locator('[data-series="MA13"]')).toHaveCount(0);

  await tabs.getByRole("button", { name: "週足", exact: true }).click();
  await expect(workspace.getByText(/を週足\d+本へ集計/)).toBeVisible();
  await expect(
    workspace.getByText(/進行中の週は途中値を含みます/),
  ).toBeVisible();
  await expect(
    chart.getByRole("button", { name: "前週高安 OFF", exact: true }),
  ).toBeVisible();
  await expect(
    chart.getByRole("button", { name: "EMA13 ON", exact: true }),
  ).toBeVisible();
  expect(
    Number(await svg.getAttribute("data-visible-count")),
  ).toBeLessThanOrEqual(dailyCount);
  await tabs.getByRole("button", { name: "日足", exact: true }).click();
  await expect(svg).toHaveAttribute("data-last-close", dailyClose!);
  expect(calls).toEqual([]);
  await workspace.screenshot({ path: info.outputPath("chart-workspace.png") });
});

test("visible bars, zoom, pan, range and keyboard navigation stay within acquired history", async ({
  page,
}) => {
  await mockIntraday(page);
  const { chart, tabs, svg } = await openWorkspace(page);
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  await selectedData(svg, "1m");
  const total = fixtures["1m"].points.length;
  for (const count of [30, 90, 180]) {
    await chart
      .getByRole("button", { name: `${count}本`, exact: true })
      .click();
    await expect(svg).toHaveAttribute("data-visible-count", String(count));
    await expect(svg).toHaveAttribute(
      "data-window-start",
      String(total - count),
    );
  }
  await chart.getByRole("button", { name: "全期間", exact: true }).click();
  await expect(svg).toHaveAttribute("data-visible-count", String(total));
  await expect(svg).toHaveAttribute("data-window-start", "0");
  await expect(chart.getByRole("slider", { name: "表示位置" })).toBeDisabled();
  await chart
    .getByRole("button", { name: "表示をリセット", exact: true })
    .click();
  await expect(svg).toHaveAttribute("data-visible-count", "90");
  await chart.getByRole("button", { name: "拡大", exact: true }).click();
  await expect(svg).toHaveAttribute("data-visible-count", "60");
  await chart.getByRole("button", { name: "縮小", exact: true }).click();
  await expect(svg).toHaveAttribute("data-visible-count", "90");
  const start = Number(await svg.getAttribute("data-window-start"));
  await chart.getByRole("button", { name: "過去へ", exact: true }).click();
  expect(Number(await svg.getAttribute("data-window-start"))).toBeLessThan(
    start,
  );
  await chart.getByRole("button", { name: "最新へ", exact: true }).click();
  await expect(svg).toHaveAttribute("data-window-start", String(total - 90));
  const range = chart.getByRole("slider", { name: "表示位置" });
  await range.focus();
  await range.press("Home");
  await expect(svg).toHaveAttribute("data-window-start", "0");
  await svg.focus();
  await svg.press("End");
  await expect(svg).toHaveAttribute("data-window-start", String(total - 90));
  await svg.press("Shift+ArrowLeft");
  expect(Number(await svg.getAttribute("data-window-start"))).toBeLessThan(
    total - 90,
  );
  await svg.press("+");
  await expect(svg).toHaveAttribute("data-visible-count", "60");
  await chart
    .getByRole("button", { name: "表示をリセット", exact: true })
    .click();
  await expect(svg).toHaveAttribute("data-window-start", String(total - 90));
  await selectedData(svg, "1m");
});

test("crosshair, two-point measurement, horizontal prices and missing volume use real candles", async ({
  page,
}) => {
  await mockIntraday(page);
  const { chart, tabs, svg } = await openWorkspace(page);
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  await selectedData(svg, "1m");
  await chart.getByRole("button", { name: "30本", exact: true }).click();
  await expect(svg.locator("[data-candle]")).toHaveCount(30);
  await expect(svg.locator("[data-volume]")).toHaveCount(29);
  await svg.focus();
  // Start keyboard checks at the latest bar independently of pointer hover.
  await svg.press("End");
  await expect(svg.locator('[data-crosshair="true"]')).toHaveCount(0);
  await svg.press("ArrowLeft");
  await expect(svg.locator('[data-crosshair="true"]')).toHaveCount(1);
  await expect(
    chart.getByText(`終 ${numberText(fixtures["1m"].points.at(-2)!.close)}`, {
      exact: true,
    }),
  ).toBeVisible();
  await chart.getByRole("button", { name: "平均足", exact: true }).click();
  await chart.getByRole("button", { name: "2点測定 OFF", exact: true }).click();
  await svg.focus();
  // Start keyboard checks at the latest bar independently of pointer hover.
  await svg.press("End");
  await expect(svg.locator('[data-crosshair="true"]')).toHaveCount(0);
  await svg.press("ArrowLeft");
  await svg.press("Enter");
  await svg.press("ArrowLeft");
  await svg.press("Enter");
  const result = chart.getByRole("status", { name: "測定結果" });
  await expect(result).toContainText(
    `${numberText(fixtures["1m"].points.at(-2)!.close)} → ${numberText(fixtures["1m"].points.at(-3)!.close)}円`,
  );
  await expect(result).toContainText("経過 1本");
  await expect(result).toContainText("%");
  await chart.getByRole("button", { name: "測定を解除", exact: true }).click();
  await expect(result).toHaveCount(0);

  // Pointer selection follows the same real close series in average-candle mode.
  await svg.scrollIntoViewIfNeeded();
  const bounds = await svg.boundingBox();
  expect(bounds).not.toBeNull();
  await svg.click({ position: { x: bounds!.width * 0.2, y: 80 } });
  await svg.click({ position: { x: bounds!.width * 0.6, y: 80 } });
  await expect(result).toBeVisible();
  await expect(result).toContainText(/経過 [1-9]\d*本/);
  await chart.getByRole("button", { name: "2点測定 ON", exact: true }).click();
  await expect(result).toHaveCount(0);
  await chart.getByText("詳細設定・描画ツール", { exact: true }).click();
  const price = fixtures["1m"].points.at(-1)!.close;
  await chart
    .getByRole("spinbutton", { name: "水平線の価格" })
    .fill(String(price));
  await chart
    .getByRole("button", { name: "水平線を追加", exact: true })
    .click();
  await expect(svg.locator("[data-horizontal-price]")).toHaveAttribute(
    "data-horizontal-price",
    String(price),
  );
  await chart
    .getByRole("button", { name: `水平線 ${price}を削除`, exact: true })
    .click();
  await expect(svg.locator("[data-horizontal-price]")).toHaveCount(0);
});

test("additional oscillator panes share the time axis and preserve the selected price series", async ({
  page,
}) => {
  await mockIntraday(page);
  const { chart, tabs, svg } = await openWorkspace(page);
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  await selectedData(svg, "1m");
  const lastClose = await svg.getAttribute("data-last-close");
  const extras = [
    ["RCI", "rci", ["RCI7", "RCI26"]],
    ["ストキャス", "stochastic", ["Stoch%K", "Stoch%D"]],
    ["ADX/DMI", "dmi", ["ADX", "+DI", "-DI"]],
    ["ATR", "atr", ["ATR"]],
  ] as const;
  const panels = chart.getByRole("group", { name: "補助チャート" });
  for (const [label, pane, series] of extras) {
    await expect(
      panels.getByRole("button", { name: `${label} OFF`, exact: true }),
    ).toBeVisible();
    await panels
      .getByRole("button", { name: `${label} OFF`, exact: true })
      .click();
    await expect(svg.locator(`[data-pane="${pane}"]`)).toHaveCount(1);
    for (const name of series) {
      const line = svg.locator(`[data-series="${name}"]`);
      await expect(line).toHaveCount(1);
      await expect(line).toHaveAttribute("d", /^M/);
    }
    await expect(svg).toHaveAttribute("data-last-close", lastClose!);
    await panels
      .getByRole("button", { name: `${label} ON`, exact: true })
      .click();
    await expect(svg.locator(`[data-pane="${pane}"]`)).toHaveCount(0);
  }
  const overlays = chart.getByRole("group", { name: "価格オーバーレイ" });
  for (const label of ["前日高安", "ピボット"])
    await overlays
      .getByRole("button", { name: `${label} OFF`, exact: true })
      .click();
  await expect(svg.locator('[data-level="P"]')).toHaveCount(1);
  const paths = await svg
    .locator("path")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("d") || ""),
    );
  expect(paths.some((value) => /NaN|Infinity|undefined/.test(value))).toBe(
    false,
  );
  await expect(svg).toHaveAttribute("data-last-close", lastClose!);
});

test("CSV keeps visible real OHLC in average-candle mode and SVG includes every enabled pane", async ({
  page,
}) => {
  await mockIntraday(page);
  const { chart, tabs, svg } = await openWorkspace(page);
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  await selectedData(svg, "1m");
  await chart.getByRole("button", { name: "30本", exact: true }).click();
  await chart.getByRole("button", { name: "平均足", exact: true }).click();
  await chart.getByRole("button", { name: "RSI OFF", exact: true }).click();
  await chart.getByRole("button", { name: "MACD OFF", exact: true }).click();
  const csvEvent = page.waitForEvent("download");
  await chart.getByRole("button", { name: "CSVを保存", exact: true }).click();
  const csvDownload = await csvEvent;
  expect(csvDownload.suggestedFilename()).toMatch(/^chart-1m-\d+\.csv$/);
  const csvStream = await csvDownload.createReadStream();
  const csvChunks: Buffer[] = [];
  for await (const chunk of csvStream!) csvChunks.push(Buffer.from(chunk));
  const [header, ...rows] = parseCsv(Buffer.concat(csvChunks).toString("utf8"));
  expect(rows).toHaveLength(30);
  const visible = fixtures["1m"].points.slice(-30);
  for (const [i, point] of visible.entries()) {
    expect(rows[i][header.indexOf("timestamp_utc")]).toBe(
      new Date(point.time * 1000).toISOString(),
    );
    for (const field of ["open", "high", "low", "close"] as const)
      expect(Number(rows[i][header.indexOf(field)])).toBeCloseTo(
        point[field],
        10,
      );
    expect(rows[i][header.indexOf("volume")]).toBe(
      point.volume === null ? "" : String(point.volume),
    );
    // This value was warmed up on more history than the exported 30 candles.
    expect(Number(rows[i][header.indexOf("MA25")])).toBeCloseTo(
      point.sma25!,
      10,
    );
  }
  const svgEvent = page.waitForEvent("download");
  await chart.getByRole("button", { name: "SVGを保存", exact: true }).click();
  const svgDownload = await svgEvent;
  expect(svgDownload.suggestedFilename()).toMatch(/^chart-1m-\d+\.svg$/);
  const svgStream = await svgDownload.createReadStream();
  const svgChunks: Buffer[] = [];
  for await (const chunk of svgStream!) svgChunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(svgChunks).toString("utf8");
  const summary = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    return {
      error: !!doc.querySelector("parsererror"),
      panes: [...doc.querySelectorAll("[data-pane]")].map((element) =>
        element.getAttribute("data-pane"),
      ),
      title: doc.querySelector("title")?.textContent,
      description: doc.querySelector("desc")?.textContent,
      text: doc.documentElement.textContent,
      interaction: doc.querySelectorAll('[data-interaction="true"]').length,
    };
  }, exported);
  expect(summary.error).toBe(false);
  expect(summary.panes).toEqual(["volume", "rsi", "macd"]);
  expect(summary.title).toContain("平均足");
  expect(summary.description).toContain("取得履歴");
  expect(summary.text).toContain("1m");
  expect(summary.text).toContain("JST");
  expect(summary.text).toContain("MA25");
  expect(summary.interaction).toBe(0);

  await chart.getByRole("button", { name: "全画面", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => !!document.fullscreenElement)) ||
        (await chart
          .getByRole("status")
          .filter({ hasText: /全画面表示/ })
          .isVisible()),
    )
    .toBe(true);
  if (await page.evaluate(() => !!document.fullscreenElement)) {
    await chart
      .getByRole("button", { name: "全画面を終了", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(false);
  } else {
    await expect(chart.getByRole("status")).toContainText(/全画面表示/);
  }
});

test("intraday selection is on demand, caches briefly and refreshes explicitly without losing controls", async ({
  page,
}) => {
  const calls: Interval[] = [];
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(apiPattern, async (route) => {
    const url = new URL(route.request().url());
    const interval = url.searchParams.get("interval") as Interval;
    expect(route.request().method()).toBe("GET");
    expect(url.searchParams.get("limit")).toBe("1200");
    calls.push(interval);
    if (interval === "1m" && calls.length === 1) await gate;
    await route.fulfill({ json: fixtures[interval] });
  });
  const { workspace, chart, tabs, svg } = await openWorkspace(page);
  expect(calls).toEqual([]);
  await chart.getByText("詳細設定・描画ツール", { exact: true }).click();
  await chart
    .getByRole("button", { name: "移動平均を追加", exact: true })
    .click();
  await expect(
    chart.getByRole("button", { name: "EMA13 ON", exact: true }),
  ).toBeVisible();
  // Wait on the real clock, rather than mocking time, to avoid expiring across a minute boundary.
  await page.waitForFunction(() => Date.now() % 60000 < 45000, undefined, {
    timeout: 16000,
  });
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  try {
    await expect(workspace.getByRole("status")).toHaveText(
      "1分足のデータを取得しています…",
    );
    await expect(svg).toBeHidden();
    await expect.poll(() => calls).toEqual(["1m"]);
    await expect(
      workspace.getByRole("button", { name: "分足を更新", exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await selectedData(svg, "1m");
  await expect(
    chart.getByRole("button", { name: "EMA13 ON", exact: true }),
  ).toBeVisible();
  await tabs.getByRole("button", { name: "日足", exact: true }).click();
  await expect(
    workspace.getByText("保存済みの日足", { exact: true }),
  ).toBeVisible();
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  await selectedData(svg, "1m");
  expect(calls).toEqual(["1m"]);
  await workspace
    .getByRole("button", { name: "分足を更新", exact: true })
    .click();
  await expect.poll(() => calls).toEqual(["1m", "1m"]);
  await selectedData(svg, "1m");
  await chart.getByRole("button", { name: "VWAP OFF", exact: true }).click();
  await expect(svg.locator('[data-series="VWAP"]')).toHaveCount(1);
  for (const interval of ["5m", "15m"] as Interval[]) {
    await tabs
      .getByRole("button", { name: labels[interval], exact: true })
      .click();
    await selectedData(svg, interval);
    await expect(svg).toHaveAttribute(
      "data-window-start",
      String(fixtures[interval].points.length - 90),
    );
    await expect(
      chart.getByRole("button", { name: "EMA13 ON", exact: true }),
    ).toBeVisible();
    await expect(
      chart.getByRole("button", { name: "VWAP ON", exact: true }),
    ).toBeVisible();
  }
  await expect(workspace.getByText(/確定足の終了時刻 .* JST/)).toBeVisible();
  await expect(workspace.getByText(/取引時間外.*Yahoo Finance/)).toBeVisible();
  await expect(
    workspace.getByText("配信元の履歴制限を確認してください。", {
      exact: true,
    }),
  ).toBeVisible();
  expect(calls).toEqual(["1m", "1m", "5m", "15m"]);
});

test("rate limits and provider errors hide stale charts and explicit retry restores the selected data", async ({
  page,
}) => {
  captured.get(page)!.expectedStatuses = new Set([429, 503]);
  let calls = 0;
  await page.route(apiPattern, (route) => {
    calls++;
    return route.fulfill(
      calls === 1
        ? {
            status: 429,
            json: { error: "株価APIのリクエスト制限に達しました。" },
          }
        : calls === 2
          ? {
              status: 503,
              json: { error: "配信元から株価データを取得できませんでした。" },
            }
          : { json: fixtures["5m"] },
    );
  });
  const { workspace, tabs, svg } = await openWorkspace(page);
  await tabs.getByRole("button", { name: "5分足", exact: true }).click();
  await expect(workspace.getByRole("alert")).toContainText("リクエスト制限");
  await expect(svg).toBeHidden();
  await workspace.getByRole("button", { name: "再試行", exact: true }).click();
  await expect(workspace.getByRole("alert")).toContainText(
    "配信元から株価データ",
  );
  await expect(svg).toBeHidden();
  await workspace.getByRole("button", { name: "再試行", exact: true }).click();
  await selectedData(svg, "5m");
  await expect(workspace.getByRole("alert")).toHaveCount(0);
  await expect(
    tabs.getByRole("button", { name: "5分足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(calls).toBe(3);
});

test("late cancelled requests cannot replace another intraday timeframe or saved daily data", async ({
  page,
}) => {
  let oneCalls = 0,
    fiveCalls = 0,
    releaseOne = () => {},
    releaseFive = () => {},
    oneFinished = false,
    fiveFinished = false;
  const oneGate = new Promise<void>((resolve) => {
    releaseOne = resolve;
  });
  const fiveGate = new Promise<void>((resolve) => {
    releaseFive = resolve;
  });
  await page.route(apiPattern, async (route) => {
    const interval = new URL(route.request().url()).searchParams.get(
      "interval",
    ) as Interval;
    if (interval === "1m" && ++oneCalls === 1) {
      await oneGate;
      await route.fulfill({ json: fixtures[interval] }).catch(() => {});
      oneFinished = true;
      return;
    }
    if (interval === "5m" && ++fiveCalls === 1) {
      await fiveGate;
      await route.fulfill({ json: fixtures[interval] }).catch(() => {});
      fiveFinished = true;
      return;
    }
    await route.fulfill({ json: fixtures[interval] });
  });
  const { workspace, tabs, svg } = await openWorkspace(page);
  const dailyClose = await svg.getAttribute("data-last-close");
  try {
    await tabs.getByRole("button", { name: "1分足", exact: true }).click();
    await expect(workspace.getByRole("status")).toBeVisible();
    await expect.poll(() => oneCalls).toBe(1);
    await tabs.getByRole("button", { name: "15分足", exact: true }).click();
    await selectedData(svg, "15m");
  } finally {
    releaseOne();
  }
  await expect.poll(() => oneFinished).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await selectedData(svg, "15m");
  await expect(
    tabs.getByRole("button", { name: "15分足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  try {
    await tabs.getByRole("button", { name: "5分足", exact: true }).click();
    await expect(workspace.getByRole("status")).toBeVisible();
    await expect.poll(() => fiveCalls).toBe(1);
    await tabs.getByRole("button", { name: "日足", exact: true }).click();
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("data-last-close", dailyClose!);
  } finally {
    releaseFive();
  }
  await expect.poll(() => fiveFinished).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(svg).toHaveAttribute("data-last-close", dailyClose!);
  await expect(
    tabs.getByRole("button", { name: "日足", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(workspace.getByRole("status")).toHaveCount(0);
  await tabs.getByRole("button", { name: "1分足", exact: true }).click();
  await selectedData(svg, "1m");
  expect(oneCalls).toBe(2);
});
