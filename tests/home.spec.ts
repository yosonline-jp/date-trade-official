import { test, expect } from "@playwright/test";
test("market workspace renders without horizontal overflow", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "マーケット概要." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /トヨタ自動車/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "3M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "1M", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "1M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/overview-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("stock search uses the saved stock catalogue", async ({ page }) => {
  await page.goto("/stocks");
  await page.getByRole("textbox", { name: "銘柄名・コード" }).fill("7203");
  await page.getByRole("button", { name: "検索", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("7203");
  await expect(page.locator("tbody")).toContainText("トヨタ");
});
test("candlestick period and moving average can be changed", async ({
  page,
}) => {
  await page.goto("/chart?code=7203");
  await expect(page.getByRole("img", { name: /株価ローソク足/ })).toBeVisible();
  await page.getByRole("button", { name: "30本", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "30本", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "MA25 ON" }).click();
  await expect(page.getByRole("button", { name: "MA25 OFF" })).toBeVisible();
});
test("bot monitor handles invalid dates and an empty dataset", async ({
  page,
}) => {
  await page.goto("/bot-trades?date=invalid");
  await expect(
    page.getByRole("heading", { name: "Botモニター." }),
  ).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "日付を正しく",
  );
});
test("CMS requires authentication", async ({ page }) => {
  await page.goto("/dashboard/cms");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
test("mobile navigation opens and navigates", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto("/");
  await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("link", { name: "日本株を探す" })
    .click();
  await expect(page).toHaveURL(/\/stocks/);
  await expect(
    page.getByRole("button", { name: "メニューを開く" }),
  ).toHaveAttribute("aria-expanded", "false");
});
