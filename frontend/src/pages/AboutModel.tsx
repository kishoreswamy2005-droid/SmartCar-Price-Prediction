import { AlertCircle, Brain, Database, GitBranch, ShieldAlert, Table2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getModelInfo } from "@/services/predictionService";
import type { ModelInfoResponse } from "@/types";
import { formatDecimal, formatINR, formatNumber } from "@/utils/format";

const featureDescriptions: Record<string, string> = {
  name: "Car model name (encoded by the training pipeline)",
  year: "Manufacturing year",
  km_driven: "Total kilometres driven",
  fuel: "Fuel type (Petrol / Diesel / CNG / LPG)",
  seller_type: "Seller type (Dealer / Individual / Trustmark Dealer)",
  transmission: "Manual or Automatic",
  owner: "Ownership history (First, Second, Third, Fourth & Above, Test Drive Car)",
  mileage: "Fuel efficiency (kmpl or km/kg)",
  engine: "Engine displacement in CC",
  max_power: "Maximum power output in bhp",
  torque: "Torque rating as recorded in the dataset",
  seats: "Number of seats",
  car_age: "Derived as reference year minus manufacturing year",
  brand: "Vehicle brand extracted from the model name",
};

export function AboutModel() {
  const [info, setInfo] = useState<ModelInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getModelInfo()
      .then((value) => {
        if (!cancelled) setInfo(value);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Failed to load model information",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Model info unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const evaluation = info?.evaluation ?? null;
  const metrics = evaluation
    ? evaluation.model_order_by_mae
        .filter((name) => evaluation.metrics[name] !== undefined)
        .map((name) => ({ name, ...evaluation.metrics[name] }))
    : [];
  const dataset = evaluation?.dataset ?? null;
  const split = evaluation?.split ?? null;
  const warnings = evaluation?.training_warnings ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Model Information</h2>
        <p className="text-sm text-muted-foreground">
          Training details, evaluation metrics and limitations — read directly from the
          notebook's evaluation artifact, never recomputed or invented.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">Best Model</span>
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-7 w-40" />
            ) : (
              <p className="mt-2 text-xl font-semibold">
                {evaluation?.best_model ?? info?.model_name ?? "—"}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {evaluation?.selection_criterion ?? "Loaded from smartcar_best_model.joblib"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary">
              <GitBranch className="h-4 w-4" />
              <span className="text-sm font-medium">Algorithm</span>
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-7 w-32" />
            ) : (
              <p className="mt-2 text-xl font-semibold">{info?.algorithm ?? "—"}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {info ? `${info.framework} · ${info.serialized_with}` : "Model runtime"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-primary">
              <Table2 className="h-4 w-4" />
              <span className="text-sm font-medium">Dataset</span>
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-7 w-36" />
            ) : (
              <p className="mt-2 text-xl font-semibold">
                {formatNumber(dataset?.raw_rows ?? 0)} → {formatNumber(dataset?.cleaned_rows ?? 0)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Raw rows → cleaned rows (after removing{" "}
              {formatNumber(dataset?.duplicate_rows ?? 0)} duplicates)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Performance Metrics</CardTitle>
          <CardDescription>
            Test-set evaluation transcribed from the training notebook — these are the only
            reported metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="rounded-md border border-dashed px-4 py-6 text-center">
              <p className="text-sm font-medium">Evaluation metrics unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The notebook metrics artifact could not be read, so no values are shown rather
                than reporting numbers from another source.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">MAE</TableHead>
                    <TableHead className="text-right">RMSE</TableHead>
                    <TableHead className="text-right">R²</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const isBest = metric.name === evaluation?.best_model;
                    return (
                      <TableRow key={metric.name} className={isBest ? "bg-primary/5" : undefined}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {metric.name}
                            {isBest && <Badge>Best</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(metric.mae)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(metric.rmse)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDecimal(metric.r2, 4)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {evaluation
              ? `MAE / RMSE are in Indian Rupees on the test split (${formatNumber(
                  evaluation.split.test_rows,
                )} samples, test size ${(evaluation.split.test_size * 100).toFixed(0)}%, random state ${
                  evaluation.split.random_state
                }). Ordered by ${evaluation.selection_criterion.toLowerCase()}.`
              : evaluation === null && !loading
                ? "Metrics shown exactly as recorded in the notebook's evaluation cells."
                : ""}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Input Features ({info?.features.length ?? info?.n_features_in ?? 13})
            </CardTitle>
            <CardDescription>The feature vector handed to the saved pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(info?.features ?? []).map((feature, index) => (
                    <TableRow key={feature}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{feature}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {featureDescriptions[feature] ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Training Split
              </CardTitle>
              <CardDescription>How the cleaned dataset was divided</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training samples</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(split?.train_rows ?? 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test samples</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(split?.test_rows ?? 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test size</span>
                <span className="font-medium tabular-nums">
                  {split ? `${(split.test_size * 100).toFixed(0)}%` : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Random state</span>
                <span className="font-medium tabular-nums">
                  {split?.random_state ?? "—"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duplicates removed</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(dataset?.duplicate_rows ?? 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target column</span>
                <span className="font-mono text-xs font-medium">
                  {dataset?.target ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Limitations &amp; Assumptions
              </CardTitle>
              <CardDescription>Known constraints from training</CardDescription>
            </CardHeader>
            <CardContent>
              {warnings.length > 0 && (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {warnings.map((warning) => (
                    <li key={warning} className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              )}
              {warnings.length > 0 && <Separator className="my-4" />}
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span>{info?.disclaimer ?? "Estimates only — actual prices vary."}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span>
                    Car age is computed from the fixed reference year{" "}
                    <strong className="text-foreground">{info?.reference_year ?? 2026}</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span>
                    The model is never retrained at runtime — the exact saved pipeline is
                    loaded once and reused.
                  </span>
                </li>
              </ul>
              {evaluation?.note && (
                <p className="mt-3 text-xs text-muted-foreground">{evaluation.note}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AboutModel;
