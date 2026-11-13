import { expect, test, type Page } from "@playwright/test";

import {
  API_BASE,
  cleanupPrediction,
  collectIssues,
  seedPrediction,
} from "./helpers.js";

/** Narrow the table to exactly this record via the debounced search box. */
async function isolate(page: Page, predictionId: string): Promise<void> {
  await page
    .getByPlaceholder("Search by car name, ID, fuel…")
    .fill(predictionId);
  await expect
    .poll(async () => page.locator("tbody tr").count(), { timeout: 10_000 })
    .toBe(1);
}

test.describe("prediction history", () => {
  test("lists stored records with formatted prices", async ({ page, request }) => {
    const issues = collectIssues(page);
    const seed = await seedPrediction(request);

    try {
      await page.goto("/history");
      await isolate(page, seed.prediction_id);
      await expect(
        page.getByRole("button", {
          name: `View details for ${seed.car_details.name}`,
        }),
      ).toBeVisible();
      // Indian currency grouping in the price column.
      await expect(page.getByText(/^₹[\d,]+$/).first()).toBeVisible();
      expect(issues.errors).toEqual([]);
    } finally {
      await cleanupPrediction(request, seed.prediction_id);
    }
  });

  test("search by prediction id isolates the record", async ({
    page,
    request,
  }) => {
    const seed = await seedPrediction(request);

    try {
      await page.goto("/history");
      await page
        .getByPlaceholder("Search by car name, ID, fuel…")
        .fill(seed.prediction_id);

      await expect
        .poll(async () => page.locator("tbody tr").count(), { timeout: 10_000 })
        .toBe(1);
      await expect(page.locator("tbody tr").first()).toContainText(
        seed.car_details.name,
      );
      await expect(page.getByText(/predictions \(filtered\)/)).toBeVisible();

      // Clearing restores the full list.
      await page.getByPlaceholder("Search by car name, ID, fuel…").fill("");
      await expect(page.getByText(/predictions \(filtered\)/)).toHaveCount(0, {
        timeout: 10_000,
      });
    } finally {
      await cleanupPrediction(request, seed.prediction_id);
    }
  });

  test("sort by predicted price toggles aria-sort", async ({ page }) => {
    await page.goto("/history");
    const header = page.getByRole("columnheader", { name: "Predicted Price" });

    await expect(header).toHaveAttribute("aria-sort", "none");
    await page.getByRole("button", { name: "Predicted Price" }).click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await page.getByRole("button", { name: "Predicted Price" }).click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
  });

  test("min-price filter reaches the API", async ({ page }) => {
    await page.goto("/history");

    const [filteredRequest] = await Promise.all([
      page.waitForRequest((request) => request.url().includes("min_price=")),
      page.getByLabel("Min ₹").fill("10000000"),
    ]);
    expect(filteredRequest.url()).toContain("min_price=10000000");
  });

  test("deleting asks for confirmation, then removes the record", async ({
    page,
    request,
  }) => {
    const issues = collectIssues(page);
    const seed = await seedPrediction(request);

    try {
      await page.goto("/history");
      await isolate(page, seed.prediction_id);
      await page
        .getByRole("button", {
          name: `Delete prediction for ${seed.car_details.name}`,
        })
        .click();

      await expect(page.getByText("Delete this prediction?")).toBeVisible();
      await expect(page.getByText(/This action cannot be undone/)).toBeVisible();

      // Cancel keeps the record.
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Delete this prediction?")).toHaveCount(0);
      const stillThere = await request.get(
        `${API_BASE}/api/predictions/${seed.prediction_id}`,
      );
      expect(stillThere.ok()).toBeTruthy();

      // Confirm deletes it for real.
      await page
        .getByRole("button", {
          name: `Delete prediction for ${seed.car_details.name}`,
        })
        .click();
      await page.getByRole("button", { name: "Delete" }).click();

      await expect
        .poll(
          async () => {
            const response = await request.get(
              `${API_BASE}/api/predictions/${seed.prediction_id}`,
            );
            return response.status();
          },
          { timeout: 10_000 },
        )
        .toBe(404);
      expect(issues.errors).toEqual([]);
    } finally {
      await cleanupPrediction(request, seed.prediction_id);
    }
  });

  test("view details dialog shows the full record", async ({ page, request }) => {
    const seed = await seedPrediction(request);

    try {
      await page.goto("/history");
      await isolate(page, seed.prediction_id);
      await page
        .getByRole("button", {
          name: `View details for ${seed.car_details.name}`,
        })
        .click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("Prediction details")).toBeVisible();
      await expect(dialog.getByText(seed.prediction_id)).toBeVisible();
      await expect(dialog.getByText("Estimated value")).toBeVisible();

      // Escape closes it.
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    } finally {
      await cleanupPrediction(request, seed.prediction_id);
    }
  });

  test("empty state offers a path back to the filters", async ({ page }) => {
    // Filter that matches nothing shows the filtered empty state.
    await page.goto("/history");
    await page
      .getByPlaceholder("Search by car name, ID, fuel…")
      .fill("zzzz-no-such-record");

    await expect(page.getByText("No matching predictions")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: "Clear filters" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByText("No matching predictions")).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
