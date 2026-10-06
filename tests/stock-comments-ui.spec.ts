import { test, expect } from "@playwright/test";

test("anonymous stock comments show login guidance and preserve the destination", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/stocks/285A");
  const comments = page.getByRole("region", {
    name: "銘柄コメント",
    exact: true,
  });
  await expect(comments).toBeVisible();
  await expect(
    comments.getByText("コメントを投稿するにはログインが必要です。", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(comments.getByRole("textbox")).toHaveCount(0);
  await expect(
    comments.getByRole("button", { name: "コメントする", exact: true }),
  ).toHaveCount(0);
  await expect(
    comments.getByRole("heading", { name: "コメント一覧", exact: true }),
  ).toBeVisible();
  const login = comments.getByRole("link", {
    name: "ログインしてコメントする",
    exact: true,
  });
  await expect(login).toHaveAttribute(
    "href",
    "/sign-in?redirect_to=%2Fstocks%2F285A%23stock-comments",
  );
  await login.click();
  await expect(
    page.getByRole("heading", { name: "ログイン", exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[name="redirect_to"]')).toHaveValue(
    "/stocks/285A#stock-comments",
  );
  await expect(
    page.getByRole("button", { name: "Googleでログイン", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xでログイン", exact: true }),
  ).toBeVisible();
  await page.goto(
    "/sign-in?redirect_to=https%3A%2F%2Fexample.com%2F&error=" +
      encodeURIComponent("認証を開始できませんでした。"),
  );
  await expect(page.locator('input[name="redirect_to"]')).toHaveValue(
    "/dashboard",
  );
  await expect(
    page.getByText("認証を開始できませんでした。", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
