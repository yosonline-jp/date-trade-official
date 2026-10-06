import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, devices, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";
const output = "test-results/live-chart-workspace";
const requiredFields = [
  "time",
  "open",
  "high",
  "low",
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
const report = { checkedAt: new Date().toISOString(), baseURL, checks: [] };

function summarize(result, status, symbol, interval) {
  assert.equal(
    status,
    200,
    result.error ?? `${symbol}/${interval}: HTTP ${status}`,
  );
  assert.equal(result.symbol, symbol);
  assert.equal(result.interval, interval);
  assert.ok(Number.isInteger(result.source.bars) && result.source.bars > 0);
  assert.equal(result.points.length, Math.min(result.source.bars, 1200));
  const duration = { "1m": 60, "5m": 300, "15m": 900 }[interval];
  const asOf = Date.parse(result.analyzedAt) / 1000;
  assert.ok(Number.isFinite(asOf));
  for (const [i, point] of result.points.entries()) {
    assert.ok(
      point.time + duration <= asOf,
      "Only completed candles may be returned",
    );
    if (i)
      assert.ok(
        result.points[i - 1].time < point.time,
        "Candles must be chronological and unique",
      );
    for (const field of requiredFields) {
      assert.ok(
        Object.hasOwn(point, field),
        `Missing technical field: ${field}`,
      );
      assert.ok(
        point[field] === null || Number.isFinite(point[field]),
        `Invalid ${field}`,
      );
    }
    assert.ok(point.open > 0 && point.close > 0 && point.low > 0);
    assert.ok(point.high >= Math.max(point.open, point.close));
    assert.ok(point.low <= Math.min(point.open, point.close));
    for (const field of ["rsi", "adx", "mfi", "stochasticK", "stochasticD"])
      if (point[field] !== null)
        assert.ok(
          point[field] >= -1e-8 && point[field] <= 100 + 1e-8,
          `${field} range`,
        );
    for (const field of ["rci", "rci26"])
      if (point[field] !== null)
        assert.ok(Math.abs(point[field]) <= 100 + 1e-8, `${field} range`);
  }
  const latest = result.points.at(-1);
  assert.equal(Date.parse(result.dataAt) / 1000, latest.time + duration);
  for (const value of Object.values(result.levels))
    assert.ok(value === null || Number.isFinite(value));
  return {
    symbol,
    interval,
    status,
    bars: result.source.bars,
    points: result.points.length,
    dataAt: result.dataAt,
    analyzedAt: result.analyzedAt,
    marketState: result.source.marketState,
    availableFields: requiredFields.filter((field) => latest[field] !== null)
      .length,
    unavailableFields: requiredFields.filter((field) => latest[field] === null),
    completedCandlesOnly: true,
  };
}

function csvRows(content) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  const text = content.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\r" || char === "\n") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  assert.equal(quoted, false, "CSV quoted fields must close");
  if (row.length || cell) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function exportCheck(page, chart, kind, name, result) {
  const filename = `${output}/${name}.${kind}`;
  const pending = page.waitForEvent("download");
  await chart
    .getByRole("button", { name: `${kind.toUpperCase()}を保存`, exact: true })
    .click();
  const download = await pending;
  assert.ok(download.suggestedFilename().endsWith(`.${kind}`));
  await download.saveAs(filename);
  const content = await readFile(filename, "utf8");
  const bytes = Buffer.byteLength(content);
  assert.ok(bytes > 100, "Downloaded file must contain content");
  if (kind === "csv") {
    const rows = csvRows(content),
      header = rows.shift();
    const image = chart.getByRole("img");
    const start = Number(await image.getAttribute("data-window-start"));
    const visible = Number(await image.getAttribute("data-visible-count"));
    assert.equal(rows.length, visible);
    for (const field of [
      "timestamp_utc",
      "timestamp_jst",
      "open",
      "high",
      "low",
      "close",
      "rsi",
      "macd",
      "EMA13",
    ])
      assert.ok(header.includes(field), `CSV field ${field}`);
    for (const [i, row] of rows.entries()) {
      assert.equal(row.length, header.length);
      const original = result.points[start + i];
      assert.equal(
        row[header.indexOf("timestamp_utc")],
        new Date(original.time * 1000).toISOString(),
      );
      for (const field of ["open", "high", "low", "close"])
        assert.equal(
          Number(row[header.indexOf(field)]),
          original[field],
          `CSV must use original ${field}`,
        );
      assert.notEqual(row[header.indexOf("EMA13")], "");
      assert.ok(Number.isFinite(Number(row[header.indexOf("EMA13")])));
    }
    return { file: filename, bytes, rows: rows.length, columns: header.length };
  }
  const parsed = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    return {
      parserErrors: doc.querySelectorAll("parsererror").length,
      root: doc.documentElement.localName,
      namespace: doc.documentElement.namespaceURI,
      elements: doc.querySelectorAll("*").length,
      paths: doc.querySelectorAll("path").length,
      interactions: doc.querySelectorAll('[data-interaction="true"]').length,
      rsi: doc.querySelectorAll('[data-pane="rsi"]').length,
      macd: doc.querySelectorAll('[data-pane="macd"]').length,
      invalidGeometry: [...doc.querySelectorAll("*")].some((element) =>
        [...element.attributes].some(
          (attribute) =>
            /^(?:d|x|y|x1|x2|y1|y2|width|height|viewBox|points)$/.test(
              attribute.name,
            ) && /NaN|Infinity|undefined/.test(attribute.value),
        ),
      ),
    };
  }, content);
  assert.equal(parsed.parserErrors, 0);
  assert.equal(parsed.root, "svg");
  assert.equal(parsed.namespace, "http://www.w3.org/2000/svg");
  assert.ok(parsed.paths > 0);
  assert.equal(parsed.interactions, 0);
  assert.equal(parsed.rsi, 1);
  assert.equal(parsed.macd, 1);
  assert.equal(parsed.invalidGeometry, false);
  return {
    file: filename,
    bytes,
    elements: parsed.elements,
    paths: parsed.paths,
  };
}

async function captureViewport(page, locator, name) {
  await page.evaluate(() => document.fonts.ready);
  await locator.evaluate((element) => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo({
      top: Math.max(
        0,
        window.scrollY + element.getBoundingClientRect().top - 100,
      ),
      left: 0,
      behavior: "instant",
    });
  });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: `${output}/${name}.png`,
    animations: "disabled",
    fullPage: false,
    scale: "css",
  });
}

async function fetchFromButton(page, workspace, button, symbol, interval) {
  const pending = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === `/api/stocks/${symbol}/technicals` &&
        url.searchParams.get("interval") === interval &&
        url.searchParams.get("limit") === "1200"
      );
    },
    { timeout: 90_000 },
  );
  await button.click();
  const response = await pending,
    result = await response.json();
  const summary = summarize(result, response.status(), symbol, interval);
  await expect(workspace.getByRole("alert")).toHaveCount(0);
  await expect(
    workspace.getByRole("button", { name: "分足を更新", exact: true }),
  ).toBeEnabled();
  await expect(workspace.getByRole("img")).toBeVisible();
  return { result, summary };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1440, height: 1100 } }],
    ["mobile", devices["iPhone 13"]],
  ]) {
    const context = await browser.newContext({
      ...options,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(25_000);
    page.setDefaultNavigationTimeout(90_000);
    const errors = [],
      calls = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (/^\/api\/stocks\/[^/]+\/technicals$/.test(url.pathname))
        calls.push({
          path: url.pathname,
          interval: url.searchParams.get("interval"),
          limit: url.searchParams.get("limit"),
        });
    });
    const initial = [];
    for (const symbol of ["7203", "285A"]) {
      const previous = calls.length;
      await page.goto(`${baseURL}/chart?code=${symbol}`);
      const workspace = page.getByRole("region", {
        name: "チャートワークスペース",
        exact: true,
      });
      await expect(workspace).toBeVisible();
      await expect(
        workspace.getByRole("button", { name: "日足", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      const chart = workspace.getByRole("img", {
        name: "株価ローソク足チャート。緑は陽線、赤は陰線。",
        exact: true,
      });
      await expect(chart).toBeVisible();
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      assert.equal(
        calls.length - previous,
        0,
        `${symbol} initial daily view must not fetch intraday data`,
      );
      const source = await workspace.innerText();
      const dailyBars = Number(source.match(/保存済み日足(\d+)本/)?.[1]);
      assert.ok(dailyBars > 0);
      initial.push({ symbol, initialTechnicalRequests: 0, dailyBars });
    }
    const workspace = page.getByRole("region", {
      name: "チャートワークスペース",
      exact: true,
    });
    const tabs = workspace.getByRole("group", { name: "チャートの時間足" });
    const chart = workspace.getByRole("region", {
      name: "トレーディングチャート",
      exact: true,
    });
    await chart
      .getByRole("button", { name: "デイトレード", exact: true })
      .click();
    await expect(
      chart.getByRole("button", { name: "EMA9 ON", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      chart.getByRole("button", { name: "BB ON", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await chart.getByText("詳細設定・描画ツール", { exact: true }).click();
    await chart
      .getByLabel("追加する移動平均の種類", { exact: true })
      .selectOption("ema");
    await chart
      .getByLabel("追加する移動平均の期間", { exact: true })
      .fill("13");
    await chart
      .getByRole("button", { name: "移動平均を追加", exact: true })
      .click();
    await expect(
      chart.getByRole("button", { name: "EMA13 ON", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    const first = await fetchFromButton(
      page,
      workspace,
      tabs.getByRole("button", { name: "1分足", exact: true }),
      "285A",
      "1m",
    );
    assert.equal(first.result.points.length, 1200);
    await expect(
      chart.getByRole("button", { name: "EMA13 ON", exact: true }),
    ).toBeVisible();
    await chart.getByRole("button", { name: "VWAP OFF", exact: true }).click();
    await expect(
      chart.getByRole("button", { name: "VWAP ON", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const panes = chart.getByRole("group", { name: "補助チャート" });
    await expect(
      panes.getByRole("button", { name: "RSI ON", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await panes.getByRole("button", { name: "MACD OFF", exact: true }).click();
    await expect(chart.locator('[data-pane="rsi"]')).toHaveCount(1);
    await expect(chart.locator('[data-pane="macd"]')).toHaveCount(1);
    const styles = chart.getByRole("group", { name: "チャート表示形式" });
    for (const [button, title] of [
      ["平均足", "株価平均足チャート。表示価格は合成値です。"],
      ["終値ライン", "株価終値ラインチャート。"],
      ["ローソク足", "株価ローソク足チャート。緑は陽線、赤は陰線。"],
    ]) {
      await styles.getByRole("button", { name: button, exact: true }).click();
      await expect(
        chart.getByRole("img", { name: title, exact: true }),
      ).toBeVisible();
    }
    const image = chart.getByRole("img");
    const beforeZoom = Number(await image.getAttribute("data-visible-count"));
    await chart.getByRole("button", { name: "拡大", exact: true }).click();
    await expect
      .poll(async () => Number(await image.getAttribute("data-visible-count")))
      .toBeLessThan(beforeZoom);
    const beforePan = Number(await image.getAttribute("data-window-start"));
    await chart.getByRole("button", { name: "過去へ", exact: true }).click();
    await expect
      .poll(async () => Number(await image.getAttribute("data-window-start")))
      .toBeLessThan(beforePan);
    await chart.getByRole("button", { name: "最新へ", exact: true }).click();
    await expect
      .poll(
        async () =>
          Number(await image.getAttribute("data-window-start")) +
          Number(await image.getAttribute("data-visible-count")),
      )
      .toBe(1200);

    const previous = calls.length;
    await tabs.getByRole("button", { name: "週足", exact: true }).click();
    await expect(chart.getByRole("img")).toBeVisible();
    const weeklySource = await workspace.innerText();
    const weeklyBars = Number(weeklySource.match(/を週足(\d+)本へ集計/)?.[1]);
    assert.ok(
      weeklyBars > 0 &&
        weeklyBars <= initial.find((item) => item.symbol === "285A").dailyBars,
    );
    await expect(
      workspace.getByText(/進行中の週は途中値を含みます/),
    ).toBeVisible();
    await expect(
      chart.getByRole("button", { name: "EMA13 ON", exact: true }),
    ).toBeVisible();
    assert.equal(
      calls.length,
      previous,
      "Weekly aggregation must not fetch intraday data",
    );
    await tabs.getByRole("button", { name: "1分足", exact: true }).click();
    await expect(
      workspace.getByRole("button", { name: "分足を更新", exact: true }),
    ).toBeEnabled();
    const refreshed = await fetchFromButton(
      page,
      workspace,
      workspace.getByRole("button", { name: "分足を更新", exact: true }),
      "285A",
      "1m",
    );
    await expect(
      chart.getByRole("button", { name: "EMA13 ON", exact: true }),
    ).toBeVisible();
    await expect(chart.locator('[data-pane="rsi"]')).toHaveCount(1);
    await expect(chart.locator('[data-pane="macd"]')).toHaveCount(1);
    const exports = {
      csv: await exportCheck(
        page,
        chart,
        "csv",
        `${name}-chart`,
        refreshed.result,
      ),
      svg: await exportCheck(
        page,
        chart,
        "svg",
        `${name}-chart`,
        refreshed.result,
      ),
    };
    await captureViewport(page, chart.getByRole("img"), `${name}-chart`);
    await captureViewport(page, styles, `${name}-controls`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `${name} must not overflow horizontally`);
    assert.deepEqual(errors, [], `${name} browser errors`);
    report.checks.push({
      name,
      initial,
      weeklyBars,
      initialLoad: first.summary,
      refresh: refreshed.summary,
      requests: calls.length,
      customAverage: "EMA13",
      priceStyles: ["candle", "heikin", "line"],
      panes: ["volume", "rsi", "macd"],
      zoomAndPan: true,
      exports,
      overflow,
      errors,
    });
    await context.close();
  }
  const context = await browser.newContext();
  for (const [symbol, interval] of [
    ["285A", "5m"],
    ["285A", "15m"],
    ["7203", "5m"],
    ["7203", "15m"],
  ]) {
    const response = await context.request.get(
      `${baseURL}/api/stocks/${symbol}/technicals?interval=${interval}&limit=1200`,
      { timeout: 90_000 },
    );
    report.checks.push({
      name: "live-api",
      ...summarize(await response.json(), response.status(), symbol, interval),
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
        checks: report.checks.map((check) => ({
          name: check.name,
          symbol: check.symbol ?? check.initialLoad?.symbol,
          interval: check.interval ?? check.initialLoad?.interval,
          status: check.status ?? check.initialLoad?.status,
          bars: check.bars ?? check.initialLoad?.bars,
          points: check.points ?? check.initialLoad?.points,
          weeklyBars: check.weeklyBars,
          overflow: check.overflow,
          exports: check.exports,
        })),
        failure: report.failure,
        report: `${output}/report.json`,
      },
      null,
      2,
    ),
  );
}
