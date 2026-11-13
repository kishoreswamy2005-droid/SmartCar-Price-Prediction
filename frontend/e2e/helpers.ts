import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API_BASE = "http://127.0.0.1:8000";

export interface PageIssues {
  errors: string[];
}

/** Collect uncaught exceptions and console errors for a page. */
export function collectIssues(page: Page): PageIssues {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Ignore missing-icon noise from the dev server.
    if (/favicon|vite\.svg/i.test(text)) return;
    errors.push(`console.error: ${text}`);
  });
  return { errors };
}

export interface PredictionSeed {
  name: string;
  year: number;
  km_driven: number;
  fuel: string;
  seller_type: string;
  transmission: string;
  owner: string;
  mileage?: number;
  engine?: number;
  max_power?: number;
  torque?: string;
  seats?: number;
}

/** Create a prediction directly through the API; returns the stored record. */
export async function seedPrediction(
  request: APIRequestContext,
  seed: Partial<PredictionSeed> = {},
): Promise<{
  prediction_id: string;
  predicted_price: number;
  car_details: { name: string };
}> {
  const payload: PredictionSeed = {
    name: "E2E Probe Maruti Alto LXi",
    year: 2016,
    km_driven: 61000,
    fuel: "Petrol",
    seller_type: "Individual",
    transmission: "Manual",
    owner: "First Owner",
    mileage: 19.7,
    engine: 998,
    max_power: 67,
    torque: "90Nm@3500rpm",
    seats: 5,
    ...seed,
  };
  const response = await request.post(`${API_BASE}/api/predict`, {
    data: payload,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as {
    prediction_id: string;
    predicted_price: number;
    car_details: { name: string };
  };
}

/** Best-effort cleanup so e2e runs do not leave junk in MongoDB. */
export async function cleanupPrediction(
  request: APIRequestContext,
  predictionId: string,
): Promise<void> {
  await request.delete(`${API_BASE}/api/predictions/${predictionId}`);
}
