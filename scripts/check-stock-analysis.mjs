import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";
const output = "test-results/live-stock-analysis";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1440, height: 1100 } }],
    ["mobile", devices["iPhone 13"]],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/stock-analysis?code=7203`);
    const response = page.waitForResponse((r) =>
      r.url().endsWith("/api/stock-analysis"),
    );
    await page.getByRole("button", { name: "分析する", exact: true }).click();
    const api = await response,
      result = await api.json();
    if (!api.ok())
      throw new Error(result.error ?? `Analysis returned ${api.status()}`);
    await page.getByRole("heading", { name: "RCI Price Projection" }).waitFor();
    await page
      .getByRole("button", { name: "チャートを表示", exact: true })
      .click();
    await page
      .getByRole("img", { name: "株価・EMA20・EMA50・VWAP", exact: true })
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    await page.screenshot({
      path: `${output}/${name}.png`,
      fullPage: true,
      animations: "disabled",
      scale: "css",
    });
    await page.screenshot({
      path: `${output}/${name}-top.png`,
      animations: "disabled",
      scale: "css",
    });
    await page
      .getByRole("heading", { name: /^15分足/ })
      .evaluate((element) => {
        window.scrollTo({
          top: window.scrollY + element.getBoundingClientRect().top - 80,
          behavior: "instant",
        });
      });
    await page.screenshot({
      path: `${output}/${name}-indicators.png`,
      animations: "disabled",
      scale: "css",
    });
    await page
      .getByRole("img", { name: "株価・EMA20・EMA50・VWAP", exact: true })
      .evaluate((element) => {
        window.scrollTo({
          top: window.scrollY + element.getBoundingClientRect().top - 120,
          behavior: "instant",
        });
      });
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `${output}/${name}-charts.png`,
      animations: "disabled",
      scale: "css",
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (errors.length || overflow)
      throw new Error(JSON.stringify({ name, errors, overflow }));
    report.push({
      name,
      status: api.status(),
      symbol: result.symbol,
      signal: result.signal,
      score: result.score,
      samples: result.statistics.samples,
      bars: result.source.bars,
      dataAt: result.dataAt,
      errors,
      overflow,
    });
    await context.close();
  }
  const context = await browser.newContext();
  const response = await context.request.post(`${baseURL}/api/stock-analysis`, {
    data: { symbol: "285A" },
    timeout: 75000,
  });
  const result = await response.json();
  report.push({
    name: "alphanumeric-api",
    status: response.status(),
    symbol: result.symbol,
    error: result.error,
    bars: result.source?.bars,
    samples: result.statistics?.samples,
  });
  if (!response.ok()) throw new Error(`285A: ${result.error}`);
  await context.close();
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
