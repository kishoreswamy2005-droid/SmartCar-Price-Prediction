/** Type contracts mirroring the FastAPI response models. */

export type FuelType = "Petrol" | "Diesel" | "CNG" | "LPG";
export type SellerType = "Dealer" | "Individual" | "Trustmark Dealer";
export type TransmissionType = "Manual" | "Automatic";
export type OwnerType =
  | "First Owner"
  | "Second Owner"
  | "Third Owner"
  | "Fourth & Above Owner"
  | "Test Drive Car";

export interface CarPredictionRequest {
  name: string;
  year: number;
  km_driven: number;
  fuel: FuelType;
  seller_type: SellerType;
  transmission: TransmissionType;
  owner: OwnerType;
  mileage?: number | null;
  engine?: number | null;
  max_power?: number | null;
  torque?: string;
  seats?: number | null;
}

export interface CarDetails {
  name: string;
  year: number;
  km_driven: number;
  fuel: string;
  seller_type: string;
  transmission: string;
  owner: string;
  mileage: number | null;
  engine: number | null;
  max_power: number | null;
  torque: string;
  seats: number | null;
  car_age: number;
}

export interface PredictionRecord {
  prediction_id: string;
  predicted_price: number;
  currency: "INR";
  car_details: CarDetails;
  created_at: string;
  model_name?: string | null;
  disclaimer?: string | null;
}

export interface PredictionListResponse {
  items: PredictionRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardStats {
  total_predictions: number;
  average_price: number;
  highest_price: number;
  lowest_price: number;
  latest_price: number | null;
  available: boolean;
}

export interface DashboardCharts {
  price_distribution: { range: string; count: number }[];
  activity: { date: string; count: number }[];
  available: boolean;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  app: string;
  version: string;
  model_loaded: boolean;
  model_path: string | null;
  model_error: string | null;
  database_connected: boolean;
  database_error: string | null;
  dataset_loaded: boolean;
  dataset_rows: number;
}

export interface FormOptions {
  fuel: FuelType[];
  seller_type: SellerType[];
  transmission: TransmissionType[];
  owner: OwnerType[];
  seats: number[];
  year_min: number;
  year_max: number;
  reference_year: number;
  car_names: string[];
}

export interface OverviewResponse {
  dataset_rows: number;
  average_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  std_price: number;
  total_brands: number;
  total_models: number;
  year_min: number;
  year_max: number;
  top_brands: { brand: string; average_price: number; count: number }[];
}

export interface PricedItem {
  average_price: number;
  median_price: number;
  count: number;
}

export interface BrandPricesResponse {
  items: (PricedItem & { brand: string })[];
}

export interface FuelAnalysisResponse {
  items: (PricedItem & { fuel: string })[];
}

export interface YearAnalysisResponse {
  reference_year: number;
  items: (PricedItem & { year: number; car_age: number })[];
}

export interface PriceDistributionResponse {
  items: { from: number; to: number; label: string; count: number }[];
  min_price: number;
  max_price: number;
  mean_price: number;
  median_price: number;
}

export interface UsageAnalysisResponse {
  car_age_vs_price: { x: number; y: number | null }[];
  car_age_bins: {
    car_age: number;
    average_price: number;
    median_price: number;
    count: number;
  }[];
  km_vs_price: { km_driven: number; selling_price: number }[];
  km_buckets: (PricedItem & { bucket: string })[];
  age_scatter: { car_age: number; selling_price: number }[];
  transmission_prices: (PricedItem & { transmission: string })[];
}

export interface ModelEvaluation {
  source_notebook: string;
  note: string;
  selection_criterion: string;
  best_model: string;
  model_order_by_mae: string[];
  metrics: Record<string, { mae: number; rmse: number; r2: number }>;
  split: {
    test_size: number;
    random_state: number;
    train_rows: number;
    test_rows: number;
  };
  dataset: {
    file: string;
    raw_rows: number;
    raw_columns: number;
    duplicate_rows: number;
    cleaned_rows: number;
    target: string;
  };
  training_warnings: string[];
}

export interface ModelInfoResponse {
  model_name: string;
  algorithm: string;
  framework: string;
  features: string[];
  effective_numeric_features?: string[];
  effective_categorical_features?: string[];
  reference_year: number;
  loaded: boolean;
  n_features_in: number;
  intercept?: number;
  serialized_with: string;
  disclaimer: string;
  evaluation: ModelEvaluation | null;
}

export interface ApiFieldError {
  field: string;
  message: string;
}
