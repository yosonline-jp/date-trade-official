import { expect, test } from "@playwright/test";

for (const path of ["/stocks/285A", "/stocks/9984/trades"]) {
  test(
    "anonymous watchlist login guidance preserves " +
      path +
      " without submitting a mutation",
    async ({ page }, testInfo) => {
      const errors: string[] = [];
      const actionPosts: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("request", (request) => {
        if (request.method() === "POST" && request.headers()["next-action"])
          actionPosts.push(request.headers()["next-action"]);
      });
      await page.goto(path);
      const login = page.getByRole("link", {
        name: "ログインしてウォッチリストに追加",
        exact: true,
      });
      await expect(login).toBeVisible();
      await expect(login).toHaveText("ログインして追加");
      await expect(login).toHaveAttribute(
        "href",
        "/sign-in?redirect_to=" + encodeURIComponent(path),
      );
      await expect(
        page.getByText("ウォッチリストへの登録にはログインが必要です。", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "ウォッチリストから削除",
          exact: true,
        }),
      ).toHaveCount(0);
      const control = page.getByRole("group").filter({ has: login });
      await expect(control.getByRole("alert")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("anonymous-watchlist.png"),
      });
      // Initial server-side status checks are allowed. The guest control must
      // navigate to sign-in without posting an add/remove server action.
      const statusCheckCount = actionPosts.length;
      await login.click();
      await expect(
        page.getByRole("heading", { name: "ログイン", exact: true }),
      ).toBeVisible();
      await expect(page.locator('input[name="redirect_to"]')).toHaveValue(path);
      expect(new URL(page.url()).searchParams.get("redirect_to")).toBe(path);
      expect(actionPosts).toHaveLength(statusCheckCount);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    },
  );
}
