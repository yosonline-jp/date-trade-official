import { test, expect } from "@playwright/test";
test.skip(
  !process.env.ACCOUNT_UI_CHECK,
  "Temporary development harness is required",
);
test("account deletion dialog confirmation, focus, pending, errors and layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/account-deletion-ui-check");
  const trigger = page.getByRole("button", {
    name: "アカウントを削除する",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole("button", {
    name: "キャンセル",
    exact: true,
  });
  await expect(cancel).toBeFocused();
  const submit = dialog.getByRole("button", {
    name: "アカウントを削除",
    exact: true,
  });
  const input = dialog.getByLabel("確認のため「削除する」と入力してください");
  await expect(submit).toBeDisabled();
  await input.fill("削除");
  await expect(submit).toBeDisabled();
  await input.fill("削除する");
  await expect(submit).toBeEnabled();
  const bounds = await dialog.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await dialog.locator(".account-delete-body").evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  const footer = await dialog.locator(".account-delete-footer").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await page.screenshot({
    path: "test-results/account-deletion-" + testInfo.project.name + ".png",
    fullPage: true,
  });
  await cancel.click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(input).toHaveValue("");
  await input.fill("削除する");
  await submit.click();
  await expect(dialog.getByRole("button", { name: "削除中…" })).toBeDisabled();
  await expect(cancel).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText(
    "アカウントは残っています",
  );
  await expect(submit).toBeEnabled();
  await expect(input).toHaveValue("削除する");
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
