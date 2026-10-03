import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Save before/after captures outside Playwright's per-test cleanup cycle.
const output = process.argv[2] ?? "test-results/performance";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const [device, options] of [
    ["desktop", { viewport: { width: 1440, height: 1100 } }],
    ["mobile", { ...devices["iPhone 13"] }],
  ]) {
    const context = await browser.newContext(options);
    await context.addInitScript(() => {
      window.performanceCheck = { averageWindows: 0 };
      const slice = Array.prototype.slice;
      Array.prototype.slice = function (start, end) {
        if (
          start >= 0 &&
          end === start + 25 &&
          typeof this[start]?.close === "number"
        )
          window.performanceCheck.averageWindows++;
        return slice.call(this, start, end);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [name, route] of [
      ["home", "/"],
      ["stocks", "/stocks"],
      ["detail", "/stocks/285A"],
      ["chart", "/chart?code=7203"],
    ]) {
      await page.goto(`${baseURL}${route}`);
      await page.locator("main").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1800);
      await page.mouse.move(0, 0);
      await page.locator("main").screenshot({
        path: `${output}/${device}-${name}.png`,
        animations: "disabled",
      });
      const svg = page.getByRole("img", { name: /株価ローソク足/ });
      if (await svg.count()) {
        const variants = {};
        for (const period of [90, 30, 180, 0]) {
          await page
            .getByRole("button", {
              name: period ? `${period}本` : "全期間",
              exact: true,
            })
            .click();
          await page.mouse.move(0, 0);
          variants[period] = await svg.evaluate((element) => element.innerHTML);
        }
        await page.getByRole("button", { name: "90本", exact: true }).click();
        await page.mouse.move(0, 0);
        const bounds = await svg.boundingBox();
        await page.evaluate(() => {
          window.performanceCheck.averageWindows = 0;
        });
        for (let i = 0; i < 40; i++)
          await page.mouse.move(
            bounds.x + (bounds.width * (i + 1)) / 42,
            bounds.y + bounds.height / 2,
          );
        await page.mouse.move(0, 0);
        const averageWindows = await page.evaluate(
          () => window.performanceCheck.averageWindows,
        );
        report.push({ device, name, averageWindows, variants });
      }
    }
    if (errors.length) throw new Error(`${device}: ${errors.join("; ")}`);
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    report.map(({ variants, ...entry }) => entry),
    null,
    2,
  ),
);
