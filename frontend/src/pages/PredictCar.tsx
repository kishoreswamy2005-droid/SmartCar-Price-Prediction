import { Info, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PredictionForm, usePredictionForm } from "@/components/prediction/PredictionForm";
import { PredictionResult } from "@/components/prediction/PredictionResult";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/services/api";
import { getFormOptions, predictCar } from "@/services/predictionService";
import type { FormOptions, PredictionRecord } from "@/types";
import type { PredictionFormValues } from "@/lib/predictionSchema";
import { formatINR } from "@/utils/format";

export function PredictCar() {
  const [result, setResult] = useState<PredictionRecord | null>(null);
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const form = usePredictionForm();
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getFormOptions()
      .then((value) => {
        if (!cancelled) setOptions(value);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOptionsError(error instanceof Error ? error.message : "Could not load options.");
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitHandler = async (values: PredictionFormValues) => {
    try {
      const record = await predictCar(values);
      setResult(record);
      toast.success("Prediction ready", {
        description: `${formatINR(record.predicted_price)} estimated value for ${record.car_details.name}.`,
      });
      // Bring the result into view without hiding the form below it.
      window.setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        for (const fieldError of error.fieldErrors) {
          form.setError(fieldError.field as keyof PredictionFormValues, {
            type: "server",
            message: fieldError.message,
          });
        }
        toast.error("Check the highlighted fields", { description: error.message });
      } else {
        toast.error("Prediction failed", {
          description: error instanceof Error ? error.message : "Unknown error.",
        });
      }
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    form.setFocus("name");
  };

  return (
    <div className="flex flex-col gap-6">
      {result && (
        <div ref={resultRef} className="scroll-mt-24">
          <PredictionResult record={result} onPredictAnother={scrollToForm} />
        </div>
      )}

      <div className="no-print flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3.5 text-sm shadow-xs">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"
          aria-hidden="true"
        >
          <Info className="h-3.5 w-3.5" />
        </span>
        <p className="leading-relaxed text-muted-foreground">
          All 13 model features are collected here. The trained pipeline decides which
          of them it actually uses — nothing is skipped on your behalf.
        </p>
      </div>

      <div ref={formRef} className="no-print scroll-mt-24">
        {optionsLoading && !options && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading car names and form options…
          </div>
        )}
        <PredictionForm
          form={form}
          options={options}
          optionsLoading={optionsLoading}
          optionsError={optionsError}
          submitHandler={submitHandler}
        />
      </div>

      {optionsError && !options && (
        <Alert variant="destructive" className="no-print">
          <AlertTitle>Form options could not be loaded</AlertTitle>
          <AlertDescription>
            {optionsError} You can still type values manually — every field remains
            usable.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
