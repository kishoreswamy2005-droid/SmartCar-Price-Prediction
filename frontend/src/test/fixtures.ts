import type {
  BrandPricesResponse,
  DashboardCharts,
  DashboardStats,
  FormOptions,
  FuelAnalysisResponse,
  HealthResponse,
  ModelInfoResponse,
  OverviewResponse,
  PredictionListResponse,
  PredictionRecord,
  PriceDistributionResponse,
  UsageAnalysisResponse,
  YearAnalysisResponse,
} from "@/types";

export function makeRecord(
  overrides: Partial<PredictionRecord> = {},
): PredictionRecord {
  return {
    prediction_id: "pred-0001",
    predicted_price: 511800.24,
    currency: "INR",
    car_details: {
      name: "Maruti Swift Dzire VDI",
      year: 2014,
      km_driven: 145500,
      fuel: "Diesel",
      seller_type: "Individual",
      transmission: "Manual",
      owner: "First Owner",
      mileage: 23.4,
      engine: 1248,
      max_power: 74,
      torque: "190Nm@ 2000rpm",
      seats: 5,
      car_age: 12,
    },
    created_at: "2026-03-01T10:00:00.000Z",
    model_name: "Linear Regression",
    disclaimer: "Estimates only.",
    ...overrides,
  };
}

export function makeList(
  items: PredictionRecord[],
  overrides: Partial<PredictionListResponse> = {},
): PredictionListResponse {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 10,
    total_pages: Math.max(1, Math.ceil(items.length / 10)),
    ...overrides,
  };
}

export const healthFixture: HealthResponse = {
  status: "ok",
  app: "SmartCar API",
  version: "1.0.0",
  model_loaded: true,
  model_path: "/models/smartcar_best_model.joblib",
  model_error: null,
  database_connected: true,
  database_error: null,
  dataset_loaded: true,
  dataset_rows: 6926,
};

export const statsFixture: DashboardStats = {
  total_predictions: 42,
  average_price: 605012,
  highest_price: 1450000,
  lowest_price: 125000,
  latest_price: 511800,
  available: true,
};

export const chartsFixture: DashboardCharts = {
  price_distribution: [
    { range: "0–2L", count: 5 },
    { range: "2–4L", count: 12 },
  ],
  activity: [
    { date: "2026-03-01", count: 3 },
    { date: "2026-03-02", count: 7 },
  ],
  available: true,
};

export const optionsFixture: FormOptions = {
  fuel: ["Petrol", "Diesel", "CNG", "LPG"],
  seller_type: ["Dealer", "Individual", "Trustmark Dealer"],
  transmission: ["Manual", "Automatic"],
  owner: [
    "First Owner",
    "Second Owner",
    "Third Owner",
    "Fourth & Above Owner",
    "Test Drive Car",
  ],
  seats: [2, 4, 5, 6, 7, 8, 9, 10],
  year_min: 1983,
  year_max: 2026,
  reference_year: 2026,
  car_names: [
    "Maruti Swift Dzire VDI",
    "Maruti Swift VXI",
    "Hyundai Creta 1.6 CRDi SX",
    "Honda City i VTEC VX",
  ],
};

export const overviewFixture: OverviewResponse = {
  dataset_rows: 6926,
  average_price: 647194,
  median_price: 450000,
  min_price: 30000,
  max_price: 12000000,
  std_price: 480000,
  total_brands: 31,
  total_models: 2058,
  year_min: 1983,
  year_max: 2020,
  top_brands: [
    { brand: "Maruti", average_price: 480000, count: 2100 },
    { brand: "Hyundai", average_price: 560000, count: 1400 },
  ],
};

export const brandPricesFixture: BrandPricesResponse = {
  items: [
    { brand: "Maruti", average_price: 480000, median_price: 390000, count: 2100 },
    { brand: "Hyundai", average_price: 560000, median_price: 470000, count: 1400 },
    { brand: "Honda", average_price: 620000, median_price: 520000, count: 700 },
  ],
};

export const fuelFixture: FuelAnalysisResponse = {
  items: [
    { fuel: "Diesel", average_price: 720000, median_price: 550000, count: 2200 },
    { fuel: "Petrol", average_price: 540000, median_price: 400000, count: 4000 },
    { fuel: "CNG", average_price: 430000, median_price: 380000, count: 600 },
  ],
};

export const yearFixture: YearAnalysisResponse = {
  reference_year: 2026,
  items: [
    { year: 2015, car_age: 11, average_price: 500000, median_price: 420000, count: 400 },
    { year: 2018, car_age: 8, average_price: 700000, median_price: 600000, count: 500 },
  ],
};

export const priceDistFixture: PriceDistributionResponse = {
  items: [
    { from: 0, to: 200000, label: "0–2L", count: 500 },
    { from: 200000, to: 400000, label: "2–4L", count: 1500 },
  ],
  min_price: 30000,
  max_price: 12000000,
  mean_price: 647194,
  median_price: 450000,
};

export const usageFixture: UsageAnalysisResponse = {
  car_age_vs_price: [
    { x: 5, y: 600000 },
    { x: 10, y: 400000 },
  ],
  car_age_bins: [
    { car_age: 5, average_price: 600000, median_price: 550000, count: 300 },
    { car_age: 10, average_price: 400000, median_price: 350000, count: 400 },
  ],
  km_vs_price: [
    { km_driven: 20000, selling_price: 700000 },
    { km_driven: 80000, selling_price: 350000 },
  ],
  km_buckets: [{ bucket: "0–20k", average_price: 700000, median_price: 650000, count: 500 }],
  age_scatter: [
    { car_age: 5, selling_price: 650000 },
    { car_age: 12, selling_price: 300000 },
  ],
  transmission_prices: [
    { transmission: "Manual", average_price: 540000, median_price: 430000, count: 4500 },
    { transmission: "Automatic", average_price: 810000, median_price: 650000, count: 1400 },
  ],
};

export const modelInfoFixture: ModelInfoResponse = {
  model_name: "Linear Regression",
  algorithm: "Linear Regression",
  framework: "scikit-learn",
  features: [
    "name",
    "year",
    "km_driven",
    "fuel",
    "seller_type",
    "transmission",
    "owner",
    "mileage",
    "engine",
    "max_power",
    "torque",
    "seats",
    "car_age",
  ],
  reference_year: 2026,
  loaded: true,
  n_features_in: 13,
  serialized_with: "joblib 1.4.2 / scikit-learn 1.6.1",
  disclaimer: "Estimates only — actual prices vary.",
  evaluation: {
    source_notebook: "SmartCar_Used_Car_Price_Prediction (1).ipynb",
    note: "Transcribed from the notebook evaluation cells.",
    selection_criterion: "Lowest MAE on the test split",
    best_model: "Linear Regression",
    model_order_by_mae: [
      "Linear Regression",
      "Random Forest",
      "Decision Tree",
      "Gradient Boosting",
    ],
    metrics: {
      "Linear Regression": { mae: 95266.71671, rmse: 255037.314897, r2: 0.703431 },
      "Random Forest": { mae: 105127.111513, rmse: 251826.522978, r2: 0.710851 },
      "Decision Tree": { mae: 107289.409692, rmse: 280816.223958, r2: 0.640447 },
      "Gradient Boosting": { mae: 142846.717565, rmse: 284382.795066, r2: 0.631256 },
    },
    split: {
      test_size: 0.2,
      random_state: 42,
      train_rows: 5540,
      test_rows: 1386,
    },
    dataset: {
      file: "Car details v3.csv",
      raw_rows: 8128,
      raw_columns: 14,
      duplicate_rows: 1202,
      cleaned_rows: 6926,
      target: "selling_price",
    },
    training_warnings: [
      "13 features were used; brand is derived from the model name.",
    ],
  },
};
