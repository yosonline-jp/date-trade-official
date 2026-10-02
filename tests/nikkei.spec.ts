import { test, expect } from "@playwright/test";
import {
  parseNikkeiPage,
  validateAgainstOfficialCsv,
  NIKKEI_SOURCE_URL,
  NIKKEI_WEIGHT_CSV_URL,
} from "../src/lib/nikkei/parse";

test("official constituents are current and validated against Nikkei CSV", async () => {
  const [page, csvResponse] = await Promise.all([
    fetch(`https://r.jina.ai/${NIKKEI_SOURCE_URL}`, {
      headers: { "X-No-Cache": "true" },
    }),
    fetch(NIKKEI_WEIGHT_CSV_URL),
  ]);
  expect(page.ok).toBe(true);
  expect(csvResponse.ok).toBe(true);
  const current = parseNikkeiPage(await page.text());
  const csv = new TextDecoder("shift_jis").decode(
    await csvResponse.arrayBuffer(),
  );
  const result = validateAgainstOfficialCsv(csv, current);
  expect(result.components).toHaveLength(225);
  expect(new Set(result.components.map((item) => item.code)).size).toBe(225);
  expect(
    result.components.find((item) => item.code === "285A")?.name,
  ).toContain("キオクシア");
});

test("refuses a truncated official list", () => {
  const markdown = `URL Source: ${NIKKEI_SOURCE_URL}\n構成銘柄：日経平均株価\n更新日付：2026.10.01\n### 自動車\n| 7203 | [トヨタ](https://www.nikkei.com/nkd/company/?scode=7203) | トヨタ自動車（株） |`;
  expect(() => parseNikkeiPage(markdown)).toThrow(/225件/);
});

test("Nikkei manager requires authentication", async ({ page }) => {
  await page.goto("/dashboard/nikkei225");
  await expect(page).toHaveURL(/\/sign-in/);
});
