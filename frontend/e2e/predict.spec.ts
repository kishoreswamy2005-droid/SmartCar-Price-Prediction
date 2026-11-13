import { expect, test } from "@playwright/test";

import { API_BASE, cleanupPrediction, collectIssues } from "./helpers.js";

test.describe("prediction form", () => {
  test("empty submit shows validation errors and never hits the API", async ({
    page,
  }) => {
    const issues = collectIssues(page);
    const predictRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/predict") && request.method() === "POST") {
        predictRequests.push(request.url());
      }
    });

    await page.goto("/predict");
    await page.getByRole("button", { name: "Predict Car Price" }).click();

    await expect(page.getByText("Car name is required")).toBeVisible();
    await expect(page.getByText("Manufacturing year is required")).toBeVisible();
    await expect(page.getByText("Kilometers driven is required")).toBeVisible();
    await expect(page.getByText("Select a fuel type")).toBeVisible();
    await expect(page.getByText("Select a seller type")).toBeVisible();
    await expect(page.getByText("Select a transmission type")).toBeVisible();
    await expect(page.getByText("Select an owner type")).toBeVisible();

    expect(predictRequests).toHaveLength(0);
    expect(issues.errors).toEqual([]);
  });

  test("out-of-range year is rejected inline", async ({ page }) => {
    await page.goto("/predict");
    await page.getByLabel(/Manufacturing Year/).fill("1500");
    await page.getByRole("button", { name: "Predict Car Price" }).click();

    await expect(
      page.getByText("Manufacturing year must be at least 1983"),
    ).toBeVisible();
  });

  test("sample data submits and renders a real model estimate", async ({
    page,
    request,
  }) => {
    const issues = collectIssues(page);
    let createdId: string | undefined;

    try {
      await page.goto("/predict");
      await page.getByRole("button", { name: "Load Sample Data" }).click();
      await expect(page.getByLabel(/Manufacturing Year/)).toHaveValue("2014");
      await expect(
        page.getByPlaceholder("e.g. Maruti Swift Dzire VDI"),
      ).toHaveValue("Maruti Swift Dzire VDI");

      const [predictResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/predict") &&
            response.request().method() === "POST",
        ),
        page.getByRole("button", { name: "Predict Car Price" }).click(),
      ]);
      expect(predictResponse.ok()).toBeTruthy();
      const record = (await predictResponse.json()) as {
        prediction_id: string;
        predicted_price: number;
      };
      createdId = record.prediction_id;
      // Numeric, finite model output (never a hardcoded constant).
      expect(Number.isFinite(record.predicted_price)).toBeTruthy();
      expect(record.predicted_price).toBeGreaterThan(0);

      // Result panel: exact model output with Indian currency formatting.
      await expect(page.getByText("Estimated resale value")).toBeVisible();
      await expect(
        page.getByText(/· model output, not a quoted price/),
      ).toBeVisible();
      const priceText = await page
        .getByText(/^₹[\d,]+$/)
        .first()
        .textContent();
      expect(priceText).toMatch(/^₹[\d,]+$/);
      await expect(
        page.getByRole("button", { name: "Print Prediction Summary" }),
      ).toBeVisible();

      // Toast confirms the save.
      await expect(page.getByText("Prediction ready")).toBeVisible();

      // The record is persisted in history.
      await page.getByRole("link", { name: "View Prediction History" }).click();
      await expect(page).toHaveURL(/\/history$/);
      await expect(
        page
          .getByRole("button", {
            name: `View details for Maruti Swift Dzire VDI`,
          })
          .first(),
      ).toBeVisible();

      expect(issues.errors).toEqual([]);
    } finally {
      if (createdId) await cleanupPrediction(request, createdId);
    }
  });

  test("shows an actionable error when the backend is unreachable", async ({
    page,
  }) => {
    // Block only the prediction call; everything else keeps working.
    await page.route("**/api/predict", (route) =>
      route.request().method() === "POST"
        ? route.abort("connectionrefused")
        : route.continue(),
    );

    await page.goto("/predict");
    await page.getByRole("button", { name: "Load Sample Data" }).click();
    await page.getByRole("button", { name: "Predict Car Price" }).click();

    await expect(page.getByText("Prediction failed")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Estimated resale value")).toHaveCount(0);
  });

  test("searchable car name suggests dataset entries", async ({ page }) => {
    await page.goto("/predict");
    const input = page.getByPlaceholder("e.g. Maruti Swift Dzire VDI");
    await input.click();
    await input.type("swift dzire");

    const listbox = page.getByRole("listbox", {
      name: "Car name suggestions",
    });
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole("option").first()).toContainText(
      /Swift Dzire/i,
    );

    await listbox.getByRole("option").first().click();
    await expect(input).toHaveValue(/Swift Dzire/i);
    await expect(listbox).toBeHidden();
  });
});

test.describe("API contract", () => {
  test("health endpoint reports model and database status", async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE}/api/health`);
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as {
      status: string;
      model_loaded: boolean;
      database_connected: boolean;
      dataset_rows: number;
    };
    expect(body.status).toBe("ok");
    expect(body.model_loaded).toBeTruthy();
    expect(body.database_connected).toBeTruthy();
    expect(body.dataset_rows).toBeGreaterThan(0);
  });

  test("model info serves notebook metrics verbatim", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/model/info`);
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as {
      evaluation: {
        best_model: string;
        metrics: Record<string, { mae: number; r2: number }>;
      } | null;
    };
    expect(body.evaluation).not.toBeNull();
    expect(body.evaluation?.best_model).toBe("Linear Regression");
    // Notebook's Linear Regression MAE, transcribed, never recomputed.
    expect(body.evaluation?.metrics["Linear Regression"].mae).toBeCloseTo(
      95266.71671,
      3,
    );
    expect(body.evaluation?.metrics["Linear Regression"].r2).toBeCloseTo(
      0.703431,
      5,
    );
  });
});
