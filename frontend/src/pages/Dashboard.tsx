import {
  Activity,
  ArrowRight,
  BarChart3,
  CarFront,
  Database,
  Fuel,
  IndianRupee,
  LineChart as LineChartIcon,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { ActivityChart } from "@/components/charts/ActivityChart";
import { BrandPricesChart } from "@/components/charts/BrandPricesChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { FuelDonutChart } from "@/components/charts/FuelDonutChart";
import { PriceDistributionChart } from "@/components/charts/PriceDistributionChart";
import { YearAnalysisChart } from "@/components/charts/YearAnalysisChart";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getBrandPrices,
  getDashboardCharts,
  getDashboardStats,
  getFuelAnalysis,
  getOverview,
  getYearAnalysis,
} from "@/services/analyticsService";
import type {
  BrandPricesResponse,
  DashboardCharts,
  DashboardStats,
  FuelAnalysisResponse,
  OverviewResponse,
  YearAnalysisResponse,
} from "@/types";
import { formatINR, formatNumber } from "@/utils/format";

interface DatasetState {
  loading: boolean;
  overview: OverviewResponse | null;
  brands: BrandPricesResponse | null;
  fuels: FuelAnalysisResponse | null;
  years: YearAnalysisResponse | null;
  errors: Record<string, string | undefined>;
}

function reasonMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The request failed.";
}

export function Dashboard() {
  // --- MongoDB-backed group (KPIs + activity) ---
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dbCharts, setDbCharts] = useState<DashboardCharts | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // --- Dataset-backed group (brand / fuel / year) ---
  const [dataset, setDataset] = useState<DatasetState>({
    loading: true,
    overview: null,
    brands: null,
    fuels: null,
    years: null,
    errors: {},
  });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([getDashboardStats(), getDashboardCharts()])
      .then(([statsResult, chartsResult]) => {
        if (cancelled) return;
        if (statsResult.status === "rejected") {
          setDbError(reasonMessage(statsResult.reason));
        } else {
          setStats(statsResult.value);
        }
        if (chartsResult.status === "rejected") {
          setDbError((current) => current ?? reasonMessage(chartsResult.reason));
        } else {
          setDbCharts(chartsResult.value);
        }
        setDbLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      getOverview(),
      getBrandPrices(10),
      getFuelAnalysis(),
      getYearAnalysis(),
    ]).then(([overview, brands, fuels, years]) => {
      if (cancelled) return;
      setDataset({
        loading: false,
        overview: overview.status === "fulfilled" ? overview.value : null,
        brands: brands.status === "fulfilled" ? brands.value : null,
        fuels: fuels.status === "fulfilled" ? fuels.value : null,
        years: years.status === "fulfilled" ? years.value : null,
        errors: {
          overview: overview.status === "rejected" ? reasonMessage(overview.reason) : undefined,
          brands: brands.status === "rejected" ? reasonMessage(brands.reason) : undefined,
          fuels: fuels.status === "rejected" ? reasonMessage(fuels.reason) : undefined,
          years: years.status === "rejected" ? reasonMessage(years.reason) : undefined,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const total = stats?.total_predictions ?? 0;
  const noRecords = !dbLoading && dbError === null && stats !== null && total === 0;

  useEffect(() => {
    if (dbError) {
      toast.error("Dashboard data unavailable", {
        description: dbError,
        id: "dash-error",
      });
    }
  }, [dbError]);

  return (
    <div className="flex flex-col gap-6">
      {dbError && (
        <Alert variant="destructive">
          <Database className="h-4 w-4" />
          <AlertTitle>Some dashboard data could not be loaded</AlertTitle>
          <AlertDescription>
            {dbError} — dataset analytics below may still be available.
          </AlertDescription>
        </Alert>
      )}

      {/* Page intro + quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Overview</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Live numbers from your stored predictions, alongside analytics computed
            from the {formatNumber(dataset.overview?.dataset_rows ?? 6926)}-row
            CarDekho dataset.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/history">View history</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/predict">
              <Sparkles className="h-4 w-4" />
              New prediction
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI cards — real stored prediction records */}
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Predictions"
          icon={Database}
          loading={dbLoading}
          empty={noRecords}
          value={dbLoading ? "" : formatNumber(total)}
          sub={noRecords ? "No predictions stored yet" : "Stored in MongoDB"}
        />
        <KpiCard
          label="Average Predicted Price"
          icon={IndianRupee}
          loading={dbLoading}
          empty={noRecords}
          value={dbLoading ? "" : noRecords ? "₹ —" : formatINR(stats?.average_price)}
          sub={
            stats?.latest_price != null && !noRecords
              ? `Latest: ${formatINR(stats.latest_price)}`
              : "Across all records"
          }
        />
        <KpiCard
          label="Highest Predicted Price"
          icon={TrendingUp}
          iconClassName="bg-success/12 text-success ring-1 ring-success/20"
          loading={dbLoading}
          empty={noRecords}
          value={dbLoading ? "" : noRecords ? "₹ —" : formatINR(stats?.highest_price)}
          sub="Most optimistic estimate"
        />
        <KpiCard
          label="Lowest Predicted Price"
          icon={TrendingDown}
          iconClassName="bg-warning/12 text-warning ring-1 ring-warning/20"
          loading={dbLoading}
          empty={noRecords}
          value={dbLoading ? "" : noRecords ? "₹ —" : formatINR(stats?.lowest_price)}
          sub="Conservative estimate"
        />
      </section>

      {noRecords && (
        <Card className="border-dashed bg-gradient-to-b from-primary/[0.06] to-transparent">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
              <Sparkles className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">No predictions yet</h2>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                Your dashboard KPIs and activity chart fill in as soon as you run your
                first prediction. Dataset analytics are available right away.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/predict">
                  <CarFront className="h-4 w-4" />
                  Make your first prediction
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/analytics">
                  <BarChart3 className="h-4 w-4" />
                  Explore analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 1: DB-backed charts */}
      <section aria-label="Prediction charts" className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        <ChartCard
          className="lg:col-span-3"
          title="Predicted Price Distribution"
          description="How your stored predictions spread across price bands"
          icon={<IndianRupee className="h-4 w-4" />}
          loading={dbLoading}
          error={dbError}
          empty={!dbLoading && !dbError && (dbCharts?.price_distribution.length ?? 0) === 0}
          emptyMessage="Run a prediction to populate this chart."
          height={280}
        >
          {dbCharts && <PriceDistributionChart data={dbCharts.price_distribution} />}
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          title="Prediction Activity Over Time"
          description="Predictions stored per day (MongoDB records)"
          icon={<Activity className="h-4 w-4" />}
          loading={dbLoading}
          error={dbError}
          empty={!dbLoading && !dbError && (dbCharts?.activity.length ?? 0) === 0}
          emptyMessage="Activity appears after your first prediction."
          height={280}
        >
          {dbCharts && <ActivityChart data={dbCharts.activity} />}
        </ChartCard>
      </section>

      {/* Row 2: dataset-backed charts */}
      <section aria-label="Dataset charts" className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        <ChartCard
          className="lg:col-span-3"
          title="Car Brand Price Comparison"
          description={`Average selling price of the top brands in the ${formatNumber(
            dataset.overview?.dataset_rows ?? 6926,
          )}-row dataset`}
          icon={<CarFront className="h-4 w-4" />}
          loading={dataset.loading}
          error={dataset.errors.brands}
          empty={!dataset.loading && !dataset.errors.brands && dataset.brands === null}
          height={300}
        >
          {dataset.brands && (
            <BrandPricesChart
              data={dataset.brands.items.map(({ brand, average_price, count }) => ({
                brand,
                average_price,
                count,
              }))}
            />
          )}
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          title="Fuel Type Price Analysis"
          description="Listing share per fuel type, with average price in the tooltip"
          icon={<Fuel className="h-4 w-4" />}
          loading={dataset.loading}
          error={dataset.errors.fuels}
          empty={!dataset.loading && !dataset.errors.fuels && dataset.fuels === null}
          height={300}
        >
          {dataset.fuels && (
            <FuelDonutChart
              data={dataset.fuels.items.map(({ fuel, count, average_price }) => ({
                fuel,
                count,
                average_price,
              }))}
            />
          )}
        </ChartCard>
      </section>

      {/* Row 3: year analysis */}
      <section aria-label="Year analysis">
        <ChartCard
          title="Manufacturing Year Analysis"
          description="Average and median selling price by manufacturing year (dataset)"
          icon={<LineChartIcon className="h-4 w-4" />}
          loading={dataset.loading}
          error={dataset.errors.years}
          empty={!dataset.loading && !dataset.errors.years && dataset.years === null}
          height={300}
        >
          {dataset.years && (
            <YearAnalysisChart
              data={dataset.years.items.map(({ year, average_price, median_price, count }) => ({
                year,
                average_price,
                median_price,
                count,
              }))}
            />
          )}
        </ChartCard>
      </section>
    </div>
  );
}
