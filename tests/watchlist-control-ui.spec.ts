import { expect, test, type Page } from "@playwright/test";

test.skip(
  process.env.WATCHLIST_UI_CHECK !== "1",
  "Isolated watchlist fixture is required.",
);

async function openFixture(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/watchlist-ui-check");
  await expect(
    page.getByRole("heading", {
      name: "ウォッチリスト操作の検証",
      exact: true,
    }),
  ).toBeVisible();
  return errors;
}

test("registration and removal show pending feedback and prevent duplicate submissions", async ({
  page,
}) => {
  const errors = await openFixture(page);
  const control = page.getByRole("region", {
    name: "通常の登録・削除",
    exact: true,
  });
  const add = control.getByRole("button", {
    name: "ウォッチリストに追加",
    exact: true,
  });
  await expect(add).toHaveAttribute("aria-pressed", "false");
  await add.evaluate((element) => {
    const button = element as HTMLButtonElement;
    button.click();
    button.click();
  });
  await expect(
    control.getByRole("button", { name: "追加中…", exact: true }),
  ).toBeDisabled();
  await expect(control.getByTestId("add-count")).toHaveText("1");
  const remove = control.getByRole("button", {
    name: "ウォッチリストから削除",
    exact: true,
  });
  await expect(remove).toHaveAttribute("aria-pressed", "true");
  await expect(control.getByRole("status")).toHaveText(
    "ウォッチリストに追加しました。",
  );
  await remove.click();
  await expect(
    control.getByRole("button", { name: "削除中…", exact: true }),
  ).toBeDisabled();
  await expect(add).toHaveAttribute("aria-pressed", "false");
  await expect(control.getByRole("status")).toHaveText(
    "ウォッチリストから削除しました。",
  );
  await expect(control.getByTestId("add-count")).toHaveText("1");
  await expect(control.getByTestId("remove-count")).toHaveText("1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("an expired session replaces the mutation button with a login link preserving the destination", async ({
  page,
}) => {
  const errors = await openFixture(page);
  const control = page.getByRole("region", {
    name: "セッション失効",
    exact: true,
  });
  await control
    .getByRole("button", { name: "ウォッチリストに追加", exact: true })
    .click();
  const login = control.getByRole("link", {
    name: "ログインしてウォッチリストを更新",
    exact: true,
  });
  await expect(login).toHaveText("ログインし直す");
  await expect(login).toHaveAttribute(
    "href",
    "/sign-in?redirect_to=%2Fstocks%2F285A%2Ftrades%23stock-trade-records",
  );
  await expect(control.getByRole("status")).toHaveText(
    "ログイン状態を確認できませんでした。ログインし直すとウォッチリストを更新できます。",
  );
  await expect(
    control.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
  ).toHaveCount(0);
  await expect(control.getByRole("alert")).toHaveCount(0);
  await expect(control.getByTestId("add-count")).toHaveText("1");
  expect(errors).toEqual([]);
});

test("a failed registration keeps the prior state and can be retried successfully", async ({
  page,
}) => {
  const errors = await openFixture(page);
  const control = page.getByRole("region", {
    name: "登録失敗後の再試行",
    exact: true,
  });
  const add = control.getByRole("button", {
    name: "ウォッチリストに追加",
    exact: true,
  });
  await add.click();
  await expect(control.getByRole("alert")).toHaveText(
    "登録を保存できませんでした。",
  );
  await expect(add).toBeEnabled();
  await expect(add).toHaveAttribute("aria-pressed", "false");
  await add.click();
  await expect(
    control.getByRole("button", {
      name: "ウォッチリストから削除",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(control.getByRole("status")).toHaveText(
    "ウォッチリストに追加しました。",
  );
  await expect(control.getByRole("alert")).toHaveCount(0);
  await expect(control.getByTestId("add-count")).toHaveText("2");
  expect(errors).toEqual([]);
});

test("a rejected removal keeps the saved state and reports a safe inline error before retry", async ({
  page,
}) => {
  const errors = await openFixture(page);
  const control = page.getByRole("region", {
    name: "削除通信エラー後の再試行",
    exact: true,
  });
  const remove = control.getByRole("button", {
    name: "ウォッチリストから削除",
    exact: true,
  });
  await remove.click();
  await expect(control.getByRole("alert")).toHaveText(
    "通信に失敗しました。再度お試しください。",
  );
  await expect(remove).toBeEnabled();
  await expect(remove).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("private-backend-connection-detail", { exact: true }),
  ).toHaveCount(0);
  await remove.click();
  await expect(
    control.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(control.getByRole("status")).toHaveText(
    "ウォッチリストから削除しました。",
  );
  await expect(control.getByTestId("remove-count")).toHaveText("2");
  expect(errors).toEqual([]);
});

test("initial registration status disables mutation until the check finishes", async ({
  page,
}) => {
  const errors = await openFixture(page);
  const control = page.getByRole("region", {
    name: "初期登録状態の確認中",
    exact: true,
  });
  await expect(
    control.getByRole("button", {
      name: "ウォッチリストの登録状態を確認中",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    control.getByRole("group", {
      name: "確認中の銘柄のウォッチリスト",
      exact: true,
    }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(
    control.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
  ).toHaveCount(0);
  await control
    .getByRole("button", { name: "登録状態の読み込みを完了", exact: true })
    .click();
  await expect(
    control.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
  ).toBeEnabled();
  await expect(
    control.getByRole("group", {
      name: "確認中の銘柄のウォッチリスト",
      exact: true,
    }),
  ).toHaveAttribute("aria-busy", "false");
  expect(errors).toEqual([]);
});

test("failed initial status can be checked again without attempting a mutation", async ({
  page,
}) => {
  const errors = await openFixture(page);
  const control = page.getByRole("region", {
    name: "初期状態の取得失敗",
    exact: true,
  });
  await expect(control.getByRole("alert")).toHaveText(
    "登録状態を取得できませんでした。",
  );
  await expect(
    control.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
  ).toHaveCount(0);
  const count = Number(await control.getByTestId("check-count").textContent());
  await control
    .getByRole("button", { name: "登録状態の再確認を許可", exact: true })
    .click();
  await control
    .getByRole("button", { name: "登録状態を再確認", exact: true })
    .click();
  await expect(
    control.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
  ).toBeEnabled();
  await expect(control.getByTestId("check-count")).toHaveText(
    String(count + 1),
  );
  await expect(control.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("changing stocks ignores a previous stock's delayed registration response", async ({
  page,
}) => {
  const errors = await openFixture(page);
  const control = page.getByRole("region", {
    name: "古い銘柄の応答を無視",
    exact: true,
  });
  await expect(
    control.getByRole("button", {
      name: "ウォッチリストの登録状態を確認中",
      exact: true,
    }),
  ).toBeDisabled();
  await control
    .getByRole("button", { name: "銘柄を7203に切り替える", exact: true })
    .click();
  const remove = control.getByRole("button", {
    name: "ウォッチリストから削除",
    exact: true,
  });
  await expect(remove).toHaveAttribute("aria-pressed", "true");
  await control
    .getByRole("button", { name: "古い285Aの応答を完了", exact: true })
    .click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(control.getByTestId("selected-code")).toHaveText("7203");
  await expect(remove).toHaveAttribute("aria-pressed", "true");
  await expect(
    control.getByRole("button", { name: "ウォッチリストに追加", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
