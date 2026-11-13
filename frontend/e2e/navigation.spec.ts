import { expect, test } from "@playwright/test";

import { collectIssues } from "./helpers.js";

const PAGES = [
  { path: "/", heading: "Dashboard" },
  { path: "/predict", heading: "Car Price Prediction" },
  { path: "/history", heading: "Prediction History" },
  { path: "/analytics", heading: "Analytics" },
  { path: "/about", heading: "About & Model Information" },
];

test.describe("all pages load", () => {
  for (const { path, heading } of PAGES) {
    test(`${path} renders the correct heading with a healthy API`, async ({
      page,
    }) => {
      const issues = collectIssues(page);
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      // Backend + model + MongoDB reachable (real health probe in the header).
      await expect(page.getByText("API online")).toBeVisible({ timeout: 20_000 });

      expect(issues.errors).toEqual([]);
    });
  }

  test("unknown routes show the 404 page", async ({ page }) => {
    const issues = collectIssues(page);
    await page.goto("/definitely-not-a-page");

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
    expect(issues.errors).toEqual([]);
  });
});

test.describe("navigation", () => {
  test("sidebar links move between every page", async ({ page }) => {
    const issues = collectIssues(page);
    await page.goto("/");
    await expect(page.getByText("Total Predictions")).toBeVisible();

    await page.getByRole("link", { name: "Predict Price" }).click();
    await expect(page).toHaveURL(/\/predict$/);
    await expect(
      page.getByRole("form", { name: "Car price prediction form" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Prediction History" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByText("Clear history")).toBeVisible();

    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(
      page.getByText("How these numbers are calculated"),
    ).toBeVisible();

    await page.getByRole("link", { name: "About & Model" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText("Model Performance Metrics")).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Total Predictions")).toBeVisible();

    expect(issues.errors).toEqual([]);
  });

  test("browser back and forward restore pages", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/analytics$/);

    await page.goBack();
    await expect(page.getByText("Total Predictions")).toBeVisible();

    await page.goForward();
    await expect(
      page.getByText("How these numbers are calculated"),
    ).toBeVisible();
  });
});

test.describe("theme", () => {
  test("toggle switches dark mode and persists across reload", async ({
    page,
  }) => {
    await page.goto("/");
    const html = page.locator("html");

    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(html).toHaveClass(/dark/);
    await expect(html).toHaveCSS("color-scheme", "dark");

    await page.reload();
    await expect(html).toHaveClass(/dark/);
    await expect(
      page.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });
});
