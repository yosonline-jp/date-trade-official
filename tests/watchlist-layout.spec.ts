import { test, expect } from "@playwright/test";

test.skip(
  process.env.JOURNAL_UI_CHECK !== "1",
  "Isolated journal fixture is required.",
);

test("watchlist keeps long notes, charts and actions within the panel", async ({
  page,
}, testInfo) => {
  await page.goto("/journal-ui-check?view=watch");
  const table = page.locator(".watchlist-table");
  await expect(table).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("watchlist.png"),
    fullPage: true,
  });
  const note = page.locator(".journal-watch-note").last();
    const noteLayout = await note.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return {
        wraps: range.getClientRects().length > 1,
        fits: element.scrollWidth <= element.clientWidth,
      };
    });
    expect(noteLayout).toEqual({ wraps: true, fits: true });
  const layout = await page.evaluate(() => {
    const panel = document.querySelector(".watchlist-panel")!;
    const bounds = panel.getBoundingClientRect();
    const controls = Array.from(panel.querySelectorAll("button, select"));
    const charts = Array.from(panel.querySelectorAll(".watchlist-sparkline"));
      const actions = Array.from(panel.querySelectorAll(".watchlist-actions"));
    return {
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      overflow: panel.scrollWidth > panel.clientWidth,
      controlsFit: controls.every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= bounds.left && rect.right <= bounds.right;
      }),
      chartsFit: charts.every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= bounds.left && rect.right <= bounds.right;
      }),
        actionsAligned: actions.every((element) => {
          const [memo, remove] = Array.from(element.children).map((button) => button.getBoundingClientRect());
          return Math.abs(memo.top - remove.top) < 2 && memo.right <= remove.left;
        }),
    };
  });
  expect(layout).toEqual({
    pageOverflow: false,
    overflow: false,
    controlsFit: true,
    chartsFit: true,
      actionsAligned: true,
  });
  await page.getByLabel("分類で絞り込み").selectOption("押し目待ち");
  await expect(page.getByText("1銘柄")).toBeVisible();
  await page.getByRole("button", { name: "メモ", exact: true }).click();
  await expect(page.getByLabel("注目理由")).toHaveValue("決算を確認してから");
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await page.getByLabel("分類で絞り込み").selectOption("未分類");
  await expect(page.getByRole("link", { name: /ソニー 6758/ })).toBeVisible();
});
