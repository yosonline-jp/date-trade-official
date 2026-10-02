import { test, expect } from "@playwright/test";

test.skip(process.env.JOURNAL_UI_CHECK !== "1", "Isolated journal fixture is required.");

for (const locale of ["ja-JP", "en-US"]) {
  test.describe(locale, () => {
    test.use({ locale });

    test("calendar hydrates with consistent date attributes", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto("/journal-ui-check?view=calendar");
      const html = await response!.text();
      // The calendar must be rendered by the server, not mounted after hydration.
      expect(/<button\b[^>]*data-day="2026-10-01"/.test(html)).toBe(true);
      await expect(page.locator('button[data-day="2026-10-01"]')).toBeVisible();
      // Opening the interactive share dialog confirms hydration has completed.
      await page.getByRole("button", { name: "シェア", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(errors.filter((message) => /hydrat|didn't match|server rendered HTML/i.test(message))).toEqual([]);
    });
  });
}
