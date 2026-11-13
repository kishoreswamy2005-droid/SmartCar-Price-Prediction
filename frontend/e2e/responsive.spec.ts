import { expect, test, type Page } from "@playwright/test";

import { collectIssues } from "./helpers.js";

interface Viewport {
  label: string;
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { label: "mobile-375", width: 375, height: 812 },
  { label: "mobile-430", width: 430, height: 932 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "laptop-1024", width: 1024, height: 768 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

const PAGES = [
  { path: "/", ready: "Total Predictions" },
  { path: "/predict", ready: "Car Name / Model" },
  { path: "/history", ready: "Clear history" },
  { path: "/analytics", ready: "How these numbers are calculated" },
  { path: "/about", ready: "Model Performance Metrics" },
];

/** Wait until the page finished its initial data fetch. */
async function gotoAndSettle(page: Page, path: string, readyText: string) {
  await page.goto(path);
  await expect(
    page.getByText(readyText, { exact: false }).first(),
  ).toBeVisible({ timeout: 20_000 });
  // Let charts paint after their data arrives.
  await page.waitForTimeout(600);
}

/** No horizontal scrolling anywhere on the document. */
async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => {
    // Elements sticking out past the viewport that nothing clips or scrolls.
    const offenders: string[] = [];
    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.right <= window.innerWidth + 2) continue;

      let clipped = false;
      for (
        let parent = element.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      ) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") {
          clipped = true;
          break;
        }
      }
      if (!clipped) {
        offenders.push(
          `${element.tagName.toLowerCase()}.${element.className || ""}`.slice(0, 120),
        );
      }
    }
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      innerWidth: window.innerWidth,
      offenders,
    };
  });

  expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.offenders).toEqual([]);
}

/** Every rendered chart must have a real, non-collapsed box. */
async function expectChartsSized(page: Page) {
  const charts = page.locator(".recharts-wrapper");
  const count = await charts.count();
  if (count === 0) return;

  for (let index = 0; index < count; index += 1) {
    const box = await charts.nth(index).boundingBox();
    expect(box, `chart #${index} has no box`).not.toBeNull();
    expect(box!.width, `chart #${index} collapsed`).toBeGreaterThan(80);
    expect(box!.height, `chart #${index} collapsed`).toBeGreaterThan(60);
  }
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.label} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const { path, ready } of PAGES) {
      test(`${path} has no overflow and renders correctly`, async ({ page }) => {
        const issues = collectIssues(page);
        await gotoAndSettle(page, path, ready);

        await expectNoHorizontalOverflow(page);
        await expectChartsSized(page);
        expect(issues.errors).toEqual([]);
      });
    }

    if (viewport.width < 1024) {
      test("mobile drawer opens and navigates", async ({ page }) => {
        const issues = collectIssues(page);
        await gotoAndSettle(page, "/", "Total Predictions");

        // Desktop sidebar is hidden below lg; the hamburger replaces it.
        await expect(page.locator("aside")).toBeHidden();
        await page.getByRole("button", { name: "Open menu" }).click();

        const dialog = page.getByRole("dialog", { name: "Navigation menu" });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText("Prediction History");

        await dialog.getByRole("link", { name: "Analytics" }).click();
        await expect(page).toHaveURL(/\/analytics$/);
        await expect(dialog).toBeHidden();

        expect(issues.errors).toEqual([]);
      });

      test("theme toggle and header stay reachable", async ({ page }) => {
        await gotoAndSettle(page, "/predict", "Car Name / Model");
        await page.getByRole("button", { name: "Switch to dark mode" }).click();
        await expect(page.locator("html")).toHaveClass(/dark/);
        await expectNoHorizontalOverflow(page);
      });
    }

    if (viewport.width >= 1024) {
      test("desktop sidebar is visible", async ({ page }) => {
        await gotoAndSettle(page, "/", "Total Predictions");
        await expect(page.locator("aside")).toBeVisible();
        await expect(page.getByRole("link", { name: "Predict Price" })).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Open menu" }),
        ).toBeHidden();
      });
    }
  });
}

test.describe("chart rendering across viewports", () => {
  for (const viewport of [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[4]]) {
    test(`dashboard charts size correctly at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await gotoAndSettle(page, "/", "Total Predictions");
      await expect(page.locator(".recharts-wrapper").first()).toBeVisible({
        timeout: 15_000,
      });
      await expectChartsSized(page);
      await expectNoHorizontalOverflow(page);
    });
  }
});
