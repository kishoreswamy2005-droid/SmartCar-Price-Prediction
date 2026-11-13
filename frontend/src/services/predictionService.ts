/** Prediction, history, health and metadata endpoints. */
import { api, queryString } from "@/services/api";
import type {
  CarPredictionRequest,
  FormOptions,
  HealthResponse,
  ModelInfoResponse,
  PredictionListResponse,
  PredictionRecord,
} from "@/types";

export interface HistoryQuery {
  page?: number;
  page_size?: number;
  search?: string;
  fuel?: string;
  min_price?: number | null;
  max_price?: number | null;
  sort_by?: "created_at" | "predicted_price" | "car_name" | "year" | "km_driven";
  sort_dir?: "asc" | "desc";
}

export function getHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>("/api/health");
}

export function predictCar(payload: CarPredictionRequest): Promise<PredictionRecord> {
  return api.post<PredictionRecord>("/api/predict", payload);
}

export function listPredictions(query: HistoryQuery = {}): Promise<PredictionListResponse> {
  return api.get<PredictionListResponse>(
    `/api/predictions${queryString({ ...query })}`,
  );
}

export function getPrediction(id: string): Promise<PredictionRecord> {
  return api.get<PredictionRecord>(`/api/predictions/${encodeURIComponent(id)}`);
}

export function deletePrediction(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/api/predictions/${encodeURIComponent(id)}`);
}

export function clearHistory(): Promise<{ deleted: boolean; count: number }> {
  return api.delete<{ deleted: boolean; count: number }>("/api/predictions");
}

export function getFuelOptions(): Promise<string[]> {
  return api.get<string[]>("/api/predictions/fuel-options");
}

export function getFormOptions(): Promise<FormOptions> {
  return api.get<FormOptions>("/api/meta/options");
}

export function getModelInfo(): Promise<ModelInfoResponse> {
  return api.get<ModelInfoResponse>("/api/model/info");
}
