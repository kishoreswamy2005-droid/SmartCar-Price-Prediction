import {
  Calendar,
  CarFront,
  Factory,
  Fuel,
  Gauge,
  Hash,
  History,
  Printer,
  RotateCcw,
  Settings2,
  ShieldAlert,
  User,
} from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PredictionRecord } from "@/types";
import { formatDateTime, formatINR, formatINRFull, formatKm, shortId } from "@/utils/format";

interface Props {
  record: PredictionRecord;
  onPredictAnother: () => void;
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/50 px-3 py-2.5 ring-1 ring-border/60">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="eyebrow text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

/** The prediction result section shown after a successful model run. */
export function PredictionResult({ record, onPredictAnother }: Props) {
  const details = record.car_details;

  const specs: { label: string; value: string }[] = [];
  if (details.mileage != null) specs.push({ label: "Mileage", value: `${details.mileage} kmpl` });
  if (details.engine != null) specs.push({ label: "Engine", value: `${details.engine} cc` });
  if (details.max_power != null) specs.push({ label: "Max power", value: `${details.max_power} bhp` });
  if (details.seats != null) specs.push({ label: "Seats", value: String(details.seats) });
  if (details.torque) specs.push({ label: "Torque", value: details.torque });

  return (
    <Card className="print-area overflow-hidden" aria-live="polite">
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-electric-600 px-6 py-6 text-white print:bg-none print:text-black">
        <span
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-electric-400/25 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-white/70 print:text-black/60">
              Estimated resale value
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
              {formatINR(record.predicted_price)}
            </p>
            <p className="mt-1.5 text-sm text-white/75 print:text-black/60">
              {formatINRFull(record.predicted_price)} · model output, not a quoted price
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-white/15 text-white ring-1 ring-white/20 print:bg-gray-100 print:text-black">
              {record.model_name ?? "Linear Regression"}
            </Badge>
            <span className="text-xs text-white/70 print:text-black/60">
              {formatDateTime(record.created_at)}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="flex flex-col gap-5 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <CarFront className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{details.name}</h2>
            <Badge variant="secondary">{details.year}</Badge>
            <Badge variant="outline">{details.transmission}</Badge>
            <Badge variant="outline">{details.fuel}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatKm(details.km_driven)} driven · {details.car_age} years old as of 2026
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem icon={Calendar} label="Manufacturing Year" value={String(details.year)} />
          <DetailItem icon={Gauge} label="Kilometers Driven" value={formatKm(details.km_driven)} />
          <DetailItem icon={Fuel} label="Fuel Type" value={details.fuel} />
          <DetailItem icon={Factory} label="Seller Type" value={details.seller_type} />
          <DetailItem icon={Settings2} label="Transmission" value={details.transmission} />
          <DetailItem icon={User} label="Owner Type" value={details.owner} />
        </div>

        {specs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {specs.map((spec) => (
              <span
                key={spec.label}
                className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs"
              >
                <span className="text-muted-foreground">{spec.label}:</span>{" "}
                <span className="font-medium">{spec.value}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning/10 px-4 py-3.5 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="leading-relaxed text-foreground/90">
            {record.disclaimer ??
              "This is an estimate produced by a machine-learning model trained on the CarDekho dataset."}{" "}
            The value depends on the training data and a model with roughly 70% R² — treat it
            as guidance, not a guaranteed selling price.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Hash className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-mono">{shortId(record.prediction_id)}</span>
          <span aria-hidden="true">·</span>
          <span>Saved to prediction history</span>
        </div>

        <Separator className="no-print" />

        <div className="no-print flex flex-col gap-3 sm:flex-row">
          <Button onClick={onPredictAnother}>
            <RotateCcw className="h-4 w-4" />
            Predict Another Car
          </Button>
          <Button asChild variant="outline">
            <Link to="/history">
              <History className="h-4 w-4" />
              View Prediction History
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print Prediction Summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
