import { test, expect } from "@playwright/test";
const pages = [
  { path: "/about", title: "記録から、次の判断へ." },
  { path: "/contact", title: "お問い合わせ." },
  { path: "/privacy-policy", title: "プライバシーポリシー." },
  { path: "/disclaimer", title: "免責事項." },
];
test("information pages render on desktop and mobile without overflow", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const item of pages) {
    await page.goto(item.path);
    await expect(
      page.getByRole("heading", { level: 1, name: item.title, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "サイト情報" })
        .locator("[aria-current=page]"),
    ).toHaveAttribute("href", item.path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    if (item.path.includes("policy") || item.path === "/disclaimer") {
      const toc = page.getByRole("navigation", { name: "このページの目次" });
      const anchor = toc.locator("a").last();
      const href = await anchor.getAttribute("href");
      await anchor.click();
      await expect(page.locator(href!)).toBeInViewport();
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.screenshot({
      path:
        "test-results/information-" +
        item.path.slice(1) +
        "-" +
        testInfo.project.name +
        ".png",
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
async function fillContact(page: import("@playwright/test").Page) {
  await page.getByLabel("お名前", { exact: true }).fill("画面検証");
  await page
    .getByLabel("メールアドレス", { exact: true })
    .fill("test@example.com");
  await page
    .getByLabel("メールアドレス（確認）", { exact: true })
    .fill("test@example.com");
  await page.getByLabel("件名", { exact: true }).fill("画面検証の件名");
  await page
    .getByLabel("お問い合わせ内容", { exact: true })
    .fill("画面検証のみです。実際には送信しません。");
  await page.getByRole("checkbox").check();
}
test("contact validates locally and preserves input after a failed submission", async ({
  page,
}) => {
  let posts = 0;
  await page.route("**/contact", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    await route.fulfill({
      status: 200,
      contentType: "text/x-component",
      body: '0:{"a":{"ok":false,"error":"送信できませんでした。入力内容は残っています。"},"f":[]}\n',
    });
  });
  await page.goto("/contact");
  await page
    .getByRole("button", { name: "お問い合わせを送信", exact: true })
    .click();
  await expect(
    page.getByText("お名前を入力してください。", { exact: true }),
  ).toBeVisible();
  expect(posts).toBe(0);
  await fillContact(page);
  await page
    .getByLabel("メールアドレス（確認）", { exact: true })
    .fill("wrong@example.com");
  await page
    .getByRole("button", { name: "お問い合わせを送信", exact: true })
    .click();
  await expect(
    page.getByText("メールアドレスが一致しません。", { exact: true }),
  ).toBeVisible();
  expect(posts).toBe(0);
  await page
    .getByLabel("メールアドレス（確認）", { exact: true })
    .fill("test@example.com");
  await page
    .getByRole("button", { name: "お問い合わせを送信", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "入力内容は残っています",
  );
  await expect(page.getByLabel("件名", { exact: true })).toHaveValue(
    "画面検証の件名",
  );
  await expect(
    page.getByRole("button", { name: "お問い合わせを送信", exact: true }),
  ).toBeEnabled();
  expect(posts).toBe(1);
});
test("contact pending state prevents duplicates and success offers a new form", async ({
  page,
}) => {
  let posts = 0;
  let finish: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/contact", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    await gate;
    await route.fulfill({
      status: 200,
      contentType: "text/x-component",
      body: '0:{"a":{"ok":true},"f":[]}\n',
    });
  });
  await page.goto("/contact");
  await fillContact(page);
  await page
    .getByRole("button", { name: "お問い合わせを送信", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "送信中…", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("お名前", { exact: true })).toBeDisabled();
  expect(posts).toBe(1);
  finish();
  await expect(
    page.getByRole("heading", {
      name: "お問い合わせを受け付けました。",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "別のお問い合わせを送る", exact: true })
    .click();
  await expect(page.getByLabel("お名前", { exact: true })).toHaveValue("");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});
