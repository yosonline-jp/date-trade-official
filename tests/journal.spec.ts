import { test, expect } from "@playwright/test";
test.skip(
  process.env.JOURNAL_UI_CHECK !== "1",
  "Isolated journal fixture is required.",
);
test.beforeEach(async ({ page }) => {
  await page.goto("/journal-ui-check");
});
test.describe("journal UI", () => {
  test.skip(
    process.env.JOURNAL_UI_CHECK !== "1",
    "Run via the isolated fixture route.",
  );

  test("analytics mode and date filters update actual statistics", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "成績分析" })).toBeVisible();
    await expect(
      page.locator(".journal-stat").filter({ hasText: "合計損益" }),
    ).toContainText("+¥90");
    await page.getByLabel("口座").selectOption("demo");
    await expect(
      page.locator(".journal-stat").filter({ hasText: "合計損益" }),
    ).toContainText("+¥100");
    await page.getByLabel("開始日").fill("2026-10-03");
    await page.getByLabel("終了日").fill("2026-10-01");
    await expect(
      page.getByText("終了日は開始日以降を選択してください。"),
    ).toBeVisible();
  });
  test("review editor preserves privacy and short trade labels", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "編集を表示" }).click();
    await expect(page.getByLabel("公開範囲")).toHaveValue("private");
    await page.getByLabel("取引区分").selectOption("売建");
    await expect(page.getByLabel("建値・売建（円）")).toBeVisible();
    await expect(page.getByLabel("決済値・買返済（円）")).toBeVisible();
    await page.getByLabel("エントリー理由").fill("ブレイクを確認");
    await page
      .getByLabel("タグ（カンマ区切り・12個まで）")
      .fill("順張り, 検証");
    await page.getByRole("button", { name: "キャンセル", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
  test("CSV preview rejects existing duplicates and requires review acknowledgement", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "取り込みを表示" }).click();
    await page
      .getByLabel("CSVファイル")
      .setInputFiles({
        name: "trades.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "銘柄コード,銘柄名,取引日,買値,売値,数量,取引区分,手数料\n7203,トヨタ,2026-10-01,100,120,10,現物,5\n6501,日立,2026-10-02,100,130,10,現物,0\n",
        ),
      });
    await expect(page.getByText("1件を登録予定 / 重複1件")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "プレビューの取引を登録" }),
    ).toBeDisabled();
    await page.getByLabel("プレビューと除外内容を確認しました").check();
    await expect(
      page.getByRole("button", { name: "プレビューの取引を登録" }),
    ).toBeEnabled();
  });
  test("monthly and weekly report ranges and share PNG work on all viewports", async ({
    page,
  }, testInfo) => {
    await page.getByRole("button", { name: "レポートを表示" }).click();
    await page.getByLabel("対象日").fill("2026-10-02");
    await expect(page.locator(".journal-report-image")).toContainText(
      "2026-10-01 〜 2026-10-31",
    );
    await page.getByLabel("今回できたこと・改善点").fill("計画を守れた");
    await expect(page.locator(".journal-report-image")).toContainText(
      "計画を守れた",
    );
    await page
      .getByRole("combobox", { name: "期間", exact: true })
      .selectOption("week");
    await expect(page.locator(".journal-report-image")).toContainText(
      "2026-09-28 〜 2026-10-04",
    );
    await page.getByRole("button", { name: "シェア", exact: true }).click();
    await page.getByLabel("金額を非表示にする").check();
    await page.getByLabel("運用元本（円・任意）").fill("10000");
    await page.getByRole("button", { name: "プレビューを作成" }).click();
    await expect(page.getByRole("img", { name: /共有プレビュー/ })).toBeVisible(
      { timeout: 30000 },
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "画像を保存", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/journal-week-2026-09-28.*\.png$/);
    await file.saveAs(testInfo.outputPath("share.png"));
    const tweet = page.getByRole("link", { name: "画像を保存してXで投稿" });
    await expect(tweet).toHaveAttribute(
      "href",
      /損益率|%E6%90%8D%E7%9B%8A%E7%8E%87/,
    );
  });
});

test("calendar export includes all seven columns on narrow screens", async ({
  page,
}, testInfo) => {
  await page.getByRole("button", { name: "カレンダーを表示" }).click();
  await expect(
    page.getByRole("button", { name: "2026/10/1、収支 195円、編集" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "シェア", exact: true }).click();
  await page.getByRole("button", { name: "プレビューを作成" }).click();
  await expect(page.getByRole("img", { name: /共有プレビュー/ })).toBeVisible({
    timeout: 30000,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "画像を保存", exact: true }).click();
  await (await download).saveAs(testInfo.outputPath("calendar-share.png"));
  const dimensions = await page
    .getByRole("img", { name: /共有プレビュー/ })
    .evaluate((img: HTMLImageElement) => ({
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));
  expect(dimensions.width).toBe(1920);
  expect(dimensions.height).toBeGreaterThan(500);
});
test("watchlist filters categories and edits private notes", async ({
  page,
}) => {
  await page.getByRole("button", { name: "ウォッチを表示" }).click();
  await page.getByLabel("分類で絞り込み").selectOption("押し目待ち");
  await expect(page.getByText("1銘柄")).toBeVisible();
  await expect(page.getByText("決算を確認してから")).toBeVisible();
  await page.getByRole("button", { name: "メモ", exact: true }).click();
  await expect(page.getByLabel("注目理由")).toHaveValue("決算を確認してから");
  await expect(page.getByLabel("想定価格（円・任意）")).toHaveValue("100");
  await page.getByLabel("分類", { exact: false }).last().fill("決算待ち");
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
});
