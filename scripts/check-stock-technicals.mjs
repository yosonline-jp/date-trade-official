import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, devices, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";
const output = "test-results/live-stock-technicals";
const fields = [
  "close",
  "volume",
  "rsi",
  "rci",
  "rci26",
  "k",
  "d",
  "j",
  "ema9",
  "ema20",
  "ema50",
  "ema100",
  "sma5",
  "sma25",
  "sma75",
  "macd",
  "macdSignal",
  "macdHistogram",
  "bbUpper",
  "bbMiddle",
  "bbLower",
  "bbPercentB",
  "bbBandwidth",
  "stochasticK",
  "stochasticD",
  "williamsR",
  "cci",
  "mfi",
  "obv",
  "plusDI",
  "minusDI",
  "adx",
  "atr",
  "roc",
  "vwap",
  "volumeRatio",
  "recentHigh",
  "recentLow",
];
const report = {
  checkedAt: new Date().toISOString(),
  baseURL,
  units: {
    JPY: [
      "close",
      "ema9",
      "ema20",
      "ema50",
      "ema100",
      "sma5",
      "sma25",
      "sma75",
      "macd",
      "macdSignal",
      "macdHistogram",
      "bbUpper",
      "bbMiddle",
      "bbLower",
      "atr",
      "vwap",
      "recentHigh",
      "recentLow",
    ],
    shares: ["volume", "obv"],
    percent: ["bbPercentB", "bbBandwidth", "roc"],
    ratio: ["volumeRatio"],
    index: [
      "rsi",
      "rci",
      "rci26",
      "k",
      "d",
      "j",
      "stochasticK",
      "stochasticD",
      "williamsR",
      "cci",
      "mfi",
      "plusDI",
      "minusDI",
      "adx",
    ],
  },
  checks: [],
};

function summarize(result, status, symbol, interval) {
  assert.equal(
    status,
    200,
    result.error ?? `${symbol}/${interval}: HTTP ${status}`,
  );
  assert.equal(result.symbol, symbol);
  assert.equal(result.interval, interval);
  assert.ok(result.source.bars > 0, "Actual history must contain candles");
  assert.ok(result.points.length > 0 && result.points.length <= 240);
  assert.ok(Number.isFinite(Date.parse(result.dataAt)));
  const duration = { "1m": 60, "5m": 300, "15m": 900 }[interval];
  const asOf = Date.parse(result.analyzedAt) / 1000;
  assert.ok(Number.isFinite(asOf));
  for (const [i, point] of result.points.entries()) {
    assert.ok(
      point.time + duration <= asOf,
      "Only completed candles may be returned",
    );
    if (i) assert.ok(result.points[i - 1].time < point.time);
    for (const field of fields) {
      assert.ok(
        Object.hasOwn(point, field),
        `Missing technical field: ${field}`,
      );
      assert.ok(
        point[field] === null || Number.isFinite(point[field]),
        `Invalid ${field}`,
      );
    }
  }
  const latest = result.points.at(-1);
  return {
    status,
    symbol,
    interval,
    bars: result.source.bars,
    points: result.points.length,
    dataAt: result.dataAt,
    analyzedAt: result.analyzedAt,
    source: result.source,
    available: fields.filter((field) => latest[field] !== null),
    unavailable: fields.filter((field) => latest[field] === null),
    values: Object.fromEntries(fields.map((field) => [field, latest[field]])),
    levels: result.levels,
  };
}

async function captureViewport(page, locator, filename) {
  await page.evaluate(() => document.fonts.ready);
  await locator.evaluate((element) => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo({
      top: Math.max(
        0,
        window.scrollY + element.getBoundingClientRect().top - 120,
      ),
      left: 0,
      behavior: "instant",
    });
  });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: `${output}/${filename}.png`,
    animations: "disabled",
    fullPage: false,
    scale: "css",
  });
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1440, height: 1100 } }],
    ["mobile", devices["iPhone 13"]],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(90_000);
    const errors = [];
    let technicalRequests = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/stocks/285A/technicals")
        technicalRequests++;
    });

    await page.goto(`${baseURL}/stocks/285A`);
    const panel = page.getByRole("region", {
      name: "デイトレード指標",
      exact: true,
    });
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "日足", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const rsiLabel = panel.getByText("RSI(14)", { exact: true }).first();
    await expect(rsiLabel).toBeVisible();
    const dailyRsi = await rsiLabel.locator("..").locator("strong").innerText();
    assert.notEqual(
      dailyRsi,
      "—",
      "285A saved daily history should display RSI",
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(
      technicalRequests,
      0,
      "The initial daily view must make no technical API requests",
    );
    await captureViewport(page, panel, `${name}-panel`);

    const pendingResponse = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          url.pathname === "/api/stocks/285A/technicals" &&
          url.searchParams.get("interval") === "1m"
        );
      },
      { timeout: 90_000 },
    );
    await panel.getByRole("button", { name: "1分足", exact: true }).click();
    const response = await pendingResponse;
    const result = await response.json();
    const apiSummary = summarize(result, response.status(), "285A", "1m");
    await expect(panel.getByRole("status")).toHaveCount(0);
    await expect(panel.getByRole("alert")).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "1分足", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await panel
      .getByRole("button", { name: "指標チャートを表示", exact: true })
      .click();
    const choice = panel.getByLabel("表示する指標", { exact: true });
    const charts = [];
    for (const [kind, title] of [
      ["rsi", "RSI(14)"],
      ["macd", "MACD(12,26,9)"],
      ["price", "株価・移動平均・ボリンジャーバンド"],
    ]) {
      await choice.selectOption(kind);
      const chart = panel.getByRole("img", {
        name: `${title}の指標チャート`,
        exact: true,
      });
      await expect(chart).toBeVisible();
      await expect(chart.locator("svg.recharts-surface")).toBeVisible();
      assert.ok(
        await chart.evaluate(
          (element) =>
            element.getBoundingClientRect().width > 0 &&
            element.getBoundingClientRect().height > 0,
        ),
      );
      charts.push(kind);
    }
    await panel.getByRole("checkbox", { name: "EMA9", exact: true }).check();
    await expect(
      panel.getByRole("checkbox", { name: "EMA9", exact: true }),
    ).toBeChecked();
    await panel.getByRole("checkbox", { name: "EMA9", exact: true }).uncheck();
    const priceChart = panel.getByRole("img", {
      name: "株価・移動平均・ボリンジャーバンドの指標チャート",
      exact: true,
    });
    await captureViewport(page, priceChart, `${name}-chart`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `${name} must not overflow horizontally`);
    assert.deepEqual(errors, [], `${name} browser errors`);
    assert.equal(
      technicalRequests,
      1,
      "Chart switching must reuse fetched data",
    );
    report.checks.push({
      name,
      initialDailyRsi: dailyRsi,
      initialTechnicalRequests: 0,
      technicalRequests,
      charts,
      errors,
      overflow,
      ...apiSummary,
    });
    await context.close();
  }

  const context = await browser.newContext();
  for (const [symbol, interval] of [
    ["285A", "5m"],
    ["285A", "15m"],
    ["7203", "1m"],
  ]) {
    const response = await context.request.get(
      `${baseURL}/api/stocks/${symbol}/technicals?interval=${interval}`,
      { timeout: 90_000 },
    );
    const result = await response.json();
    report.checks.push({
      name: "live-api",
      ...summarize(result, response.status(), symbol, interval),
    });
  }
  await context.close();
} catch (error) {
  report.failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        checkedAt: report.checkedAt,
        checks: report.checks.map(
          ({
            name,
            symbol,
            interval,
            status,
            bars,
            dataAt,
            available,
            overflow,
          }) => ({
            name,
            symbol,
            interval,
            status,
            bars,
            dataAt,
            available: available.length,
            overflow,
          }),
        ),
        failure: report.failure,
        report: `${output}/report.json`,
      },
      null,
      2,
    ),
  );
}
