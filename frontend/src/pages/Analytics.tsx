import { AlertCircle, BarChart3, CarFront, Fuel, Gauge, IndianRupee, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandPricesChart } from "@/components/charts/BrandPricesChart";
import { ChartCard } from "@/components/charts/ChartCard";
import { FuelPriceBarChart } from "@/components/charts/FuelPriceBarChart";
import { PriceHistogramChart } from "@/components/charts/PriceHistogramChart";
import { AgePriceScatterChart, KmPriceScatterChart } from "@/components/charts/ScatterCharts";
import { TransmissionChart } from "@/components/charts/TransmissionChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBrandPrices,
  getFuelAnalysis,
  getOverview,
  getPriceDistribution,
  getUsageAnalysis,
} from "@/services/analyticsService";
import type {
  BrandPricesResponse,
  FuelAnalysisResponse,
  OverviewResponse,
  PriceDistributionResponse,
  UsageAnalysisResponse,
} from "@/types";
import { formatINR, formatNumber } from "@/utils/format";

function StatCard({
  label,
  value,
  hint,
  icon,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                {value}
              </p>
            )}
            {hint && !loading && (
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
          </div>
          <div className="text-primary/70">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function reasonMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The request failed.";
}

interface AnalyticsData {
  overview: OverviewResponse | null;
  brands: BrandPricesResponse | null;
  fuel: FuelAnalysisResponse | null;
  usage: UsageAnalysisResponse | null;
  dist: PriceDistributionResponse | null;
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    overview: null,
    brands: null,
    fuel: null,
    usage: null,
    dist: null,
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      getOverview(),
      getBrandPrices(12),
      getFuelAnalysis(),
      getUsageAnalysis(),
      getPriceDistribution(),
    ]).then(([overview, brands, fuel, usage, dist]) => {
      if (cancelled) return;
      setData({
        overview: overview.status === "fulfilled" ? overview.value : null,
        brands: brands.status === "fulfilled" ? brands.value : null,
        fuel: fuel.status === "fulfilled" ? fuel.value : null,
        usage: usage.status === "fulfilled" ? usage.value : null,
        dist: dist.status === "fulfilled" ? dist.value : null,
      });
      setErrors({
        overview: overview.status === "rejected" ? reasonMessage(overview.reason) : undefined,
        brands: brands.status === "rejected" ? reasonMessage(brands.reason) : undefined,
        fuel: fuel.status === "rejected" ? reasonMessage(fuel.reason) : undefined,
        usage: usage.status === "rejected" ? reasonMessage(usage.reason) : undefined,
        dist: dist.status === "rejected" ? reasonMessage(dist.reason) : undefined,
      });
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const { overview, brands, fuel, usage, dist } = data;
  const globalError = errors.overview ?? errors.brands ?? errors.fuel ?? errors.usage ?? errors.dist ?? null;

  const manual = usage?.transmission_prices.find((row) => row.transmission === "Manual");
  const automatic = usage?.transmission_prices.find((row) => row.transmission === "Automatic");
  const transmissionCount = (usage?.transmission_prices ?? []).reduce((sum, row) => sum + row.count, 0);
  const bucketCount = (dist?.items ?? []).reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Aggregated insights computed from the full CarDekho dataset — every number below
          comes from the API, nothing is hardcoded.
        </p>
      </div>

      {globalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Some analytics could not be loaded</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <section aria-label="Price summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average Price"
          value={overview ? formatINR(overview.average_price) : "—"}
          hint={`Across ${formatNumber(overview?.dataset_rows ?? 0)} cleaned records`}
          icon={<Wallet className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Median Price"
          value={overview ? formatINR(overview.median_price) : "—"}
          hint="50th percentile listing price"
          icon={<TrendingUp className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Price Range"
          value={
            overview
              ? `${formatINR(overview.min_price)} – ${formatINR(overview.max_price)}`
              : "—"
          }
          hint={
            overview
              ? `Spread of ±${formatINR(overview.std_price)} (std. deviation)`
              : "Min to max listing price"
          }
          icon={<Gauge className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          label="Manual / Automatic Average"
          value={
            manual && automatic
              ? `${formatINR(manual.average_price)} / ${formatINR(automatic.average_price)}`
              : "—"
          }
          hint="Average selling price by transmission"
          icon={<IndianRupee className="h-5 w-5" />}
          loading={loading}
        />
      </section>

      <section aria-label="Brand and fuel analysis" className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Brand Price Comparison"
          description="Average selling price of the top 12 brands in the dataset"
          icon={<CarFront className="h-4 w-4" />}
          loading={loading}
          error={errors.brands}
          empty={!loading && !errors.brands && (brands?.items.length ?? 0) === 0}
          emptyMessage="No brand data available."
          height={340}
        >
          {brands && <BrandPricesChart data={brands.items} />}
        </ChartCard>

        <ChartCard
          title="Fuel Type Price Analysis"
          description="Average vs median selling price for each fuel type"
          icon={<Fuel className="h-4 w-4" />}
          loading={loading}
          error={errors.fuel}
          empty={!loading && !errors.fuel && (fuel?.items.length ?? 0) === 0}
          emptyMessage="No fuel-type data available."
          height={340}
        >
          {fuel && <FuelPriceBarChart data={fuel.items} />}
        </ChartCard>
      </section>

      <section aria-label="Transmission and price distribution" className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Transmission Comparison"
          description="Average vs median price for manual and automatic cars"
          icon={<Gauge className="h-4 w-4" />}
          loading={loading}
          error={errors.usage}
          empty={!loading && !errors.usage && (usage?.transmission_prices.length ?? 0) === 0}
          emptyMessage="No transmission data available."
          height={300}
        >
          {usage && <TransmissionChart data={usage.transmission_prices} />}
        </ChartCard>

        <ChartCard
          title="Price Distribution"
          description="How listing prices cluster across the whole dataset"
          icon={<BarChart3 className="h-4 w-4" />}
          loading={loading}
          error={errors.dist}
          empty={!loading && !errors.dist && (dist?.items.length ?? 0) === 0}
          emptyMessage="No price distribution available."
          height={300}
        >
          {dist && (
            <PriceHistogramChart data={dist.items.map(({ label, count }) => ({ label, count }))} />
          )}
        </ChartCard>
      </section>

      <section aria-label="Usage analysis" className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Car Age vs Price"
          description="Sampled listings — older cars generally sell for less"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={loading}
          error={errors.usage}
          empty={!loading && !errors.usage && (usage?.age_scatter.length ?? 0) === 0}
          emptyMessage="No car-age samples available."
          height={300}
        >
          {usage && <AgePriceScatterChart data={usage.age_scatter} />}
        </ChartCard>

        <ChartCard
          title="Kilometers Driven vs Price"
          description="Sampled listings — higher mileage usually lowers the price"
          icon={<Gauge className="h-4 w-4" />}
          loading={loading}
          error={errors.usage}
          empty={!loading && !errors.usage && (usage?.km_vs_price.length ?? 0) === 0}
          emptyMessage="No mileage samples available."
          height={300}
        >
          {usage && <KmPriceScatterChart data={usage.km_vs_price} />}
        </ChartCard>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>How these numbers are calculated</CardTitle>
          <CardDescription>Aggregation scope and methodology</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Every figure on this page is computed server-side by MongoDB aggregation queries
            over the persisted CarDekho dataset — no values are hardcoded in the UI.
          </p>
          <p>
            Car age is measured from the reference year{" "}
            <strong className="text-foreground">2026</strong>, consistent with the model's
            training pipeline. Scatter plots show a sampled subset of listings for legibility.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">
              {formatNumber(overview?.dataset_rows ?? 0)} cleaned records
            </Badge>
            <Badge variant="outline">{formatNumber(bucketCount)} priced records</Badge>
            <Badge variant="outline">{formatNumber(transmissionCount)} transmission records</Badge>
            <Badge variant="outline">{formatNumber(overview?.total_brands ?? 0)} brands</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Analytics;
