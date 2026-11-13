import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

import { CarNameCombobox } from "@/components/prediction/CarNameCombobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  emptyFormValues,
  MAX_YEAR,
  MIN_YEAR,
  predictionSchema,
  sampleFormValues,
  type PredictionFormInput,
  type PredictionFormValues,
} from "@/lib/predictionSchema";
import type { FormOptions } from "@/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Field scaffolding
// ---------------------------------------------------------------------------
interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

function Field({ id, label, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] font-medium tracking-tight">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
  disabled,
  className,
}: SelectFieldProps) {
  return (
    <Field id={id} label={label} required={required} error={error} className={className}>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={Boolean(error) || undefined} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export type PredictionFormApi = UseFormReturn<
  PredictionFormInput,
  unknown,
  PredictionFormValues
>;

/** Custom hook wrapper for react-hook-form - follows React Hook naming convention. */
export function usePredictionForm(): PredictionFormApi {
  return useForm<PredictionFormInput, unknown, PredictionFormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: emptyFormValues(),
    mode: "onBlur",
  });
}

export interface PredictionFormProps {
  form: PredictionFormApi;
  options: FormOptions | null;
  optionsLoading: boolean;
  optionsError: string | null;
  submitHandler: (values: PredictionFormValues) => Promise<void>;
}

export function PredictionForm({
  form,
  options,
  optionsLoading,
  optionsError,
  submitHandler,
}: PredictionFormProps) {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const carNames = options?.car_names ?? [];

  const setSelect = (name: "fuel" | "seller_type" | "transmission" | "owner") =>
    (value: string) => setValue(name, value, { shouldValidate: true, shouldDirty: true });

  const numberProps = (name: "year" | "km_driven" | "mileage" | "engine" | "max_power" | "seats") =>
    register(name);

  return (
    <form
      onSubmit={handleSubmit(submitHandler)}
      noValidate
      className="flex flex-col gap-6"
      aria-label="Car price prediction form"
    >
      {optionsError && (
        <Alert variant="warning">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Form vocabulary unavailable</AlertTitle>
          <AlertDescription>
            {optionsError} — dropdowns are limited to the standard options.
          </AlertDescription>
        </Alert>
      )}

      {/* Section A */}
      <Card>
        <CardHeader className="rounded-t-xl border-b border-border/60 bg-gradient-to-b from-primary/[0.07] to-transparent">
          <CardTitle className="flex items-center gap-2.5 text-base tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-primary text-xs font-bold ring-1 ring-primary/20">
              A
            </span>
            Vehicle Information
          </CardTitle>
          <CardDescription>
            What you are selling — every field feeds the trained model.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            id="name"
            label="Car Name / Model"
            required
            error={errors.name?.message}
            className="sm:col-span-2"
            hint="Search the dataset names or type your own."
          >
            <CarNameCombobox
              id="name"
              value={watch("name") ?? ""}
              onChange={(value) => setValue("name", value, { shouldValidate: true, shouldDirty: true })}
              onBlur={() => setValue("name", watch("name") ?? "", { shouldValidate: true })}
              options={carNames}
              disabled={optionsLoading}
              invalid={Boolean(errors.name)}
              placeholder="e.g. Maruti Swift Dzire VDI"
            />
          </Field>

          <Field id="year" label="Manufacturing Year" required error={errors.year?.message}>
            <div className="relative">
              <Input
                id="year"
                type="number"
                inputMode="numeric"
                min={MIN_YEAR}
                max={MAX_YEAR}
                placeholder={`e.g. ${MAX_YEAR - 6}`}
                aria-invalid={Boolean(errors.year) || undefined}
                {...numberProps("year")}
              />
            </div>
          </Field>

          <Field
            id="km_driven"
            label="Kilometers Driven"
            required
            error={errors.km_driven?.message}
            hint="Odometer reading."
          >
            <div className="relative">
              <Input
                id="km_driven"
                type="number"
                inputMode="numeric"
                min={0}
                max={5_000_000}
                placeholder="e.g. 45000"
                aria-invalid={Boolean(errors.km_driven) || undefined}
                className="pr-9"
                {...numberProps("km_driven")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                km
              </span>
            </div>
          </Field>

          <SelectField
            id="fuel"
            label="Fuel Type"
            required
            value={watch("fuel") ?? ""}
            onChange={setSelect("fuel")}
            options={options?.fuel ?? ["Petrol", "Diesel", "CNG", "LPG"]}
            placeholder="Select fuel"
            error={errors.fuel?.message}
            disabled={optionsLoading}
          />

          <SelectField
            id="seller_type"
            label="Seller Type"
            required
            value={watch("seller_type") ?? ""}
            onChange={setSelect("seller_type")}
            options={
              options?.seller_type ?? ["Dealer", "Individual", "Trustmark Dealer"]
            }
            placeholder="Select seller"
            error={errors.seller_type?.message}
            disabled={optionsLoading}
          />

          <SelectField
            id="transmission"
            label="Transmission"
            required
            value={watch("transmission") ?? ""}
            onChange={setSelect("transmission")}
            options={options?.transmission ?? ["Manual", "Automatic"]}
            placeholder="Select transmission"
            error={errors.transmission?.message}
            disabled={optionsLoading}
          />

          <SelectField
            id="owner"
            label="Owner Type"
            required
            value={watch("owner") ?? ""}
            onChange={setSelect("owner")}
            options={
              options?.owner ?? [
                "First Owner",
                "Second Owner",
                "Third Owner",
                "Fourth & Above Owner",
                "Test Drive Car",
              ]
            }
            placeholder="Select owner"
            error={errors.owner?.message}
            disabled={optionsLoading}
            className="sm:col-span-2"
          />
        </CardContent>
      </Card>

      {/* Section B */}
      <Card>
        <CardHeader className="rounded-t-xl border-b border-border/60 bg-gradient-to-b from-primary/[0.07] to-transparent">
          <CardTitle className="flex items-center gap-2.5 text-base tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-primary text-xs font-bold ring-1 ring-primary/20">
              B
            </span>
            Technical Specifications
          </CardTitle>
          <CardDescription>
            Optional for you, but the model accepts them — leave blank if unsure.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="mileage" label="Mileage" error={errors.mileage?.message}>
            <div className="relative">
              <Input
                id="mileage"
                type="number"
                inputMode="decimal"
                min={0}
                max={200}
                step="0.1"
                placeholder="e.g. 23.4"
                aria-invalid={Boolean(errors.mileage) || undefined}
                className="pr-12"
                {...numberProps("mileage")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                kmpl
              </span>
            </div>
          </Field>

          <Field id="engine" label="Engine Capacity" error={errors.engine?.message}>
            <div className="relative">
              <Input
                id="engine"
                type="number"
                inputMode="numeric"
                min={0}
                max={10_000}
                placeholder="e.g. 1248"
                aria-invalid={Boolean(errors.engine) || undefined}
                className="pr-9"
                {...numberProps("engine")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                cc
              </span>
            </div>
          </Field>

          <Field id="max_power" label="Maximum Power" error={errors.max_power?.message}>
            <div className="relative">
              <Input
                id="max_power"
                type="number"
                inputMode="decimal"
                min={0}
                max={2_000}
                step="0.1"
                placeholder="e.g. 74"
                aria-invalid={Boolean(errors.max_power) || undefined}
                className="pr-10"
                {...numberProps("max_power")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                bhp
              </span>
            </div>
          </Field>

          <Field
            id="seats"
            label="Number of Seats"
            error={errors.seats?.message}
            hint="Common: 4, 5, 7"
          >
            <Input
              id="seats"
              type="number"
              inputMode="numeric"
              min={0}
              max={20}
              placeholder="e.g. 5"
              aria-invalid={Boolean(errors.seats) || undefined}
              {...numberProps("seats")}
            />
          </Field>

          <Field
            id="torque"
            label="Torque"
            error={errors.torque?.message}
            className="sm:col-span-2 lg:col-span-4"
            hint='Free text, e.g. "190Nm@ 2000rpm".'
          >
            <Input
              id="torque"
              type="text"
              maxLength={100}
              placeholder="e.g. 190Nm@ 2000rpm"
              aria-invalid={Boolean(errors.torque) || undefined}
              {...register("torque")}
            />
          </Field>
        </CardContent>
      </Card>

      <Separator className="no-print" />

      {/* Actions */}
      <div className="no-print flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Predicting…
            </>
          ) : (
            <>
              <CarFront className="h-4 w-4" />
              Predict Car Price
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          onClick={() => {
            reset(sampleFormValues());
          }}
          className="w-full sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          Load Sample Data
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={isSubmitting}
          onClick={() => {
            reset(emptyFormValues());
          }}
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {isSubmitting && (
        <p
          className="no-print flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Running the trained model — this takes about a second…
        </p>
      )}

      {optionsLoading && (
        <div className="no-print flex flex-wrap gap-3" aria-hidden="true">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
      )}
    </form>
  );
}
