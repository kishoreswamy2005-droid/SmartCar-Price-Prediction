/** Dashboard and analytics endpoints (MongoDB- and dataset-backed). */
import { api, queryString } from "@/services/api";
import type {
  BrandPricesResponse,
  DashboardCharts,
  DashboardStats,
  FuelAnalysisResponse,
  OverviewResponse,
  PriceDistributionResponse,
  UsageAnalysisResponse,
  YearAnalysisResponse,
} from "@/types";

export function getDashboardStats(): Promise<DashboardStats> {
  return api.get<DashboardStats>("/api/dashboard/stats");
}

export function getDashboardCharts(): Promise<DashboardCharts> {
  return api.get<DashboardCharts>("/api/dashboard/charts");
}

export function getOverview(): Promise<OverviewResponse> {
  return api.get<OverviewResponse>("/api/analytics/overview");
}

export function getBrandPrices(limit = 15): Promise<BrandPricesResponse> {
  return api.get<BrandPricesResponse>(`/api/analytics/brand-prices${queryString({ limit })}`);
}

export function getFuelAnalysis(): Promise<FuelAnalysisResponse> {
  return api.get<FuelAnalysisResponse>("/api/analytics/fuel-analysis");
}

export function getYearAnalysis(): Promise<YearAnalysisResponse> {
  return api.get<YearAnalysisResponse>("/api/analytics/year-analysis");
}

export function getPriceDistribution(bins = 24): Promise<PriceDistributionResponse> {
  return api.get<PriceDistributionResponse>(
    `/api/analytics/price-distribution${queryString({ bins })}`,
  );
}

export function getUsageAnalysis(): Promise<UsageAnalysisResponse> {
  return api.get<UsageAnalysisResponse>("/api/analytics/usage-analysis");
}
