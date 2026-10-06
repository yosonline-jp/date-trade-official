import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, devices, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";
const output = "test-results/brand-theme";
const routes = [
  ["home", "/"],
  ["chart", "/chart?code=285A"],
  ["stock-detail", "/stocks/285A"],
  ["stock-analysis", "/stock-analysis"],
  ["sign-in", "/sign-in"],
  ["watchlist", "/watchlist"],
  ["learn", "/learn/basics"],
  ["stocks", "/stocks"],
  ["contact", "/contact"],
  ["about", "/about"],
];
const report = { checkedAt: new Date().toISOString(), baseURL, checks: [] };

async function inViewport(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect(),
      style = getComputedStyle(element);
    return (
      rect.width > 4 &&
      rect.height > 4 &&
      rect.right > 0 &&
      rect.left < innerWidth &&
      rect.bottom > 0 &&
      rect.top < innerHeight &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  });
}

async function logoCheck(page, name) {
  const images = page.locator('img[src*="logo-dt"]');
  await expect.poll(() => images.count()).toBeGreaterThan(0);
  let logo;
  for (const image of await images.all()) {
    if (await inViewport(image)) {
      logo = image;
      break;
    }
  }
  let openedMenu = false;
  if (!logo) {
    const menu = page.getByRole("button", {
      name: "メニューを開く",
      exact: true,
    });
    if ((await menu.count()) && (await menu.isVisible())) {
      await menu.click();
      openedMenu = true;
      for (const image of await images.all()) {
        if (await inViewport(image)) {
          logo = image;
          break;
        }
      }
    }
  }
  assert.ok(
    logo,
    "The original logo must be visible in the header or opened navigation",
  );
  await expect
    .poll(() =>
      logo.evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  const data = await logo.evaluate((element) => {
    const style = getComputedStyle(element),
      rect = element.getBoundingClientRect();
    return {
      src: element.getAttribute("src"),
      alt: element.getAttribute("alt"),
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      width: rect.width,
      height: rect.height,
      objectFit: style.objectFit,
      filter: style.filter,
      boxShadow: style.boxShadow,
    };
  });
  assert.ok(data.src.includes("logo-dt"));
  assert.ok(data.alt?.trim(), "The logo needs meaningful alternative text");
  assert.equal(
    data.filter,
    "none",
    "The original logo must not be recolored with a filter",
  );
  assert.equal(
    data.boxShadow,
    "none",
    "The original logo must not receive an added shadow",
  );
  if (openedMenu) {
    await page.screenshot({
      path: `${output}/${name}-logo-menu.png`,
      animations: "disabled",
      fullPage: false,
      scale: "css",
    });
    const close = page.getByRole("button", {
      name: "メニューを閉じる",
      exact: true,
    });
    for (const button of await close.all()) {
      if (await inViewport(button)) {
        await button.click();
        break;
      }
    }
  }
  return { ...data, navigationOpened: openedMenu };
}

async function contrastCheck(page) {
  return page.evaluate(() => {
    function rgba(color) {
      const match = color.match(/^rgba?\((.+)\)$/);
      if (!match) return null;
      const parts = match[1]
        .replaceAll(",", " ")
        .replace("/", " ")
        .trim()
        .split(/\s+/)
        .map(Number);
      if (parts.length < 3 || parts.some((part) => !Number.isFinite(part)))
        return null;
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    }
    const composite = (foreground, background) =>
      foreground
        .slice(0, 3)
        .map(
          (value, i) =>
            value * foreground[3] + background[i] * (1 - foreground[3]),
        );
    const luminance = (color) =>
      color.reduce((sum, value, i) => {
        const normalized = value / 255;
        const linear =
          normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][i];
      }, 0);
    const hex = (color) =>
      `#${color.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
    function backdrop(element) {
      const layers = [];
      let current = element;
      while (current) {
        const style = getComputedStyle(current);
        if (Number(style.opacity) < 1)
          return { reason: "ancestor opacity needs pixel-level verification" };
        if (style.filter !== "none")
          return { reason: "CSS filter needs pixel-level verification" };
        const color = rgba(style.backgroundColor);
        if (!color) return { reason: "unsupported CSS color syntax" };
        if (style.backgroundImage !== "none")
          return {
            reason: "gradient or image background needs visual verification",
          };
        layers.push(color);
        if (color[3] === 1) break;
        current = current.parentElement;
      }
      let color = [255, 255, 255];
      for (const layer of layers.reverse()) color = composite(layer, color);
      return { color };
    }
    const definitions = [
      ["heading", "main h1, .auth-card h1, h1", 1],
      ["body", "main .page-heading p:last-child, main p, .auth-card p", 2],
      [
        "active-navigation",
        '.terminal-nav-link.active, nav a[aria-current="page"]',
        1,
      ],
      [
        "primary-action",
        ".terminal-button:not(.secondary):not(:disabled), .auth-submit:not(:disabled), button[type=submit]:not(:disabled)",
        2,
      ],
      [
        "form-label",
        "main label:not(.sr-only), .auth-card label:not(.sr-only), form label:not(.sr-only)",
        2,
      ],
      [
        "form-value",
        "main input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), .auth-card input:not([type=hidden])",
        1,
      ],
      [
        "accent",
        '.heading-dot, .cms-tabs a[aria-current="page"], button[aria-pressed="true"]',
        2,
      ],
      [
        "widget",
        'main [role="region"] h2, main .terminal-panel h2, main svg text',
        2,
      ],
    ];
    const samples = [],
      skipped = [],
      visited = new Set();
    for (const [category, selector, limit] of definitions) {
      let count = 0;
      for (const element of document.querySelectorAll(selector)) {
        if (count >= limit) break;
        if (visited.has(element)) continue;
        const rect = element.getBoundingClientRect(),
          style = getComputedStyle(element);
        if (
          rect.width <= 4 ||
          rect.height <= 4 ||
          rect.right <= 0 ||
          rect.left >= innerWidth ||
          rect.bottom <= 0 ||
          rect.top >= innerHeight ||
          style.visibility === "hidden" ||
          style.display === "none" ||
          element.closest("[hidden]")
        )
          continue;
        let text = element.textContent?.trim();
        let foreground = rgba(style.color);
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          text = element.value || element.placeholder;
          if (!element.value && element.placeholder)
            foreground = rgba(getComputedStyle(element, "::placeholder").color);
        }
        if (!text) continue;
        visited.add(element);
        const background = backdrop(element);
        const description = {
          category,
          text: text.replace(/\s+/g, " ").slice(0, 70),
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        };
        if (!foreground || background.reason) {
          skipped.push({
            ...description,
            reason: background.reason ?? "unsupported foreground color syntax",
          });
          continue;
        }
        const visibleForeground = composite(foreground, background.color);
        const light = luminance(visibleForeground),
          dark = luminance(background.color);
        const contrast =
          (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
        samples.push({
          ...description,
          foreground: hex(visibleForeground),
          background: hex(background.color),
          contrast: Number(contrast.toFixed(3)),
          passes: contrast >= 4.5,
        });
        count++;
      }
    }
    const style = getComputedStyle(document.documentElement);
    const tokens = [...style]
      .filter((name) =>
        /^--(?:dt-|brand|surface|text|border|positive|negative|warning|background|foreground|primary|ring)/.test(
          name,
        ),
      )
      .map((name) => [name, style.getPropertyValue(name).trim()]);
    const body = getComputedStyle(document.body);
    const shell = document.querySelector(".terminal-shell");
    return {
      samples,
      skipped,
      failures: samples.filter((sample) => !sample.passes),
      tokens: Object.fromEntries(tokens),
      body: { background: body.backgroundColor, foreground: body.color },
      shell: shell
        ? {
            background: getComputedStyle(shell).backgroundColor,
            foreground: getComputedStyle(shell).color,
          }
        : null,
    };
  });
}

async function captureViewport(page, locator, name) {
  await page.evaluate(() => document.fonts.ready);
  if (locator)
    await locator.evaluate((element) => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY + element.getBoundingClientRect().top - 100,
        ),
        left: 0,
        behavior: "instant",
      });
    });
  else
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: `${output}/${name}.png`,
    fullPage: false,
    scale: "css",
    animations: "disabled",
  });
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [layout, options] of [
    ["desktop", { viewport: { width: 1440, height: 1100 } }],
    ["mobile", devices["iPhone 13"]],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(90_000);
    for (const [name, route] of routes) {
      const errors = [];
      const pageError = (error) =>
        errors.push({ type: "pageerror", message: error.message });
      const consoleError = (message) => {
        if (message.type() === "error")
          errors.push({ type: "console", message: message.text() });
      };
      page.on("pageerror", pageError);
      page.on("console", consoleError);
      const response = await page.goto(`${baseURL}${route}`);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const landed = new URL(page.url()).pathname;
      const check = {
        layout,
        name,
        requested: route,
        landed,
        status: response?.status(),
        redirected: landed !== new URL(route, baseURL).pathname,
        errors,
      };
      report.checks.push(check);
      assert.ok(
        response?.ok(),
        `${layout}/${name}: page HTTP ${response?.status()}`,
      );
      if (name === "watchlist" && check.redirected)
        assert.ok(
          /sign-in|login/.test(landed),
          "Unauthenticated watchlist may redirect to sign-in",
        );
      check.logo = await logoCheck(page, `${layout}-${name}`);
      await expect(
        page.locator('link[rel="icon"][href="/logo-dt.png"]'),
      ).toHaveCount(1);
      check.browserBranding = await page.evaluate(() => ({
        icons: [...document.querySelectorAll('link[rel*="icon"]')].map((link) =>
          link.getAttribute("href"),
        ),
        themeColor: document
          .querySelector('meta[name="theme-color"]')
          ?.getAttribute("content"),
      }));
      assert.equal(check.browserBranding.themeColor, "#0b1623");
      await captureViewport(page, null, `${layout}-${name}-top`);
      check.styles = await contrastCheck(page);
      assert.ok(
        check.styles.samples.length > 0,
        `${name} needs contrast samples`,
      );
      check.overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(
        check.overflow,
        false,
        `${layout}/${name}: horizontal overflow`,
      );
      if (name === "chart" || name === "stock-detail") {
        const widget =
          name === "chart"
            ? page.getByRole("region", {
                name: "トレーディングチャート",
                exact: true,
              })
            : page.getByRole("region", {
                name: "デイトレード指標",
                exact: true,
              });
        await expect(widget).toBeVisible();
        await captureViewport(page, widget, `${layout}-${name}-widget`);
        check.widgetStyles = await contrastCheck(page);
        const widgetOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        assert.equal(
          widgetOverflow,
          false,
          `${layout}/${name}: widget horizontal overflow`,
        );
      }
      assert.deepEqual(errors, [], `${layout}/${name}: browser errors`);
      page.off("pageerror", pageError);
      page.off("console", consoleError);
    }
    await context.close();
  }
  const contrastFailures = report.checks.flatMap((check) =>
    [...check.styles.failures, ...(check.widgetStyles?.failures ?? [])].map(
      (failure) => ({ layout: check.layout, name: check.name, ...failure }),
    ),
  );
  report.contrastFailures = contrastFailures;
  assert.deepEqual(
    contrastFailures,
    [],
    "Major sampled UI text and accents must meet 4.5:1 contrast",
  );
} catch (error) {
  report.failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        checkedAt: report.checkedAt,
        pages: report.checks.length,
        logos: report.checks.filter((check) => check.logo).length,
        contrastSamples: report.checks.reduce(
          (sum, check) =>
            sum +
            (check.styles?.samples.length ?? 0) +
            (check.widgetStyles?.samples.length ?? 0),
          0,
        ),
        contrastFailures: report.contrastFailures?.length,
        failure: report.failure,
        report: `${output}/report.json`,
      },
      null,
      2,
    ),
  );
}
