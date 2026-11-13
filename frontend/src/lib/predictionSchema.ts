import { z } from "zod";

/**
 * Form schema mirroring the FastAPI contract exactly.
 *
 * Inputs stay strings (what the DOM gives us); `.pipe(z.coerce.number<string>())`
 * converts them to real numbers for the API. Messages are written for users.
 */

const FUELS = ["Petrol", "Diesel", "CNG", "LPG"] as const;
const SELLER_TYPES = ["Dealer", "Individual", "Trustmark Dealer"] as const;
const TRANSMISSIONS = ["Manual", "Automatic"] as const;
const OWNERS = [
  "First Owner",
  "Second Owner",
  "Third Owner",
  "Fourth & Above Owner",
  "Test Drive Car",
] as const;

export const MIN_YEAR = 1983;
export const MAX_YEAR = 2026;

/** Required numeric text field -> number (rejects blanks and garbage). */
function requiredNumber(min: number, max: number, label: string) {
  return z
    .string({ message: `${label} is required` })
    .min(1, `${label} is required`)
    .pipe(
      z
        .coerce.number<string>({ message: `${label} must be a number` })
        .min(min, `${label} must be at least ${min}`)
        .max(max, `${label} must be at most ${max}`),
    );
}

/** Optional numeric text field -> number | undefined (blank stays undefined). */
function optionalNumber(min: number, max: number, label: string) {
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number({ message: `${label} must be a number` })
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`)
      .optional(),
  );
}

function enumField<T extends readonly [string, ...string[]]>(values: T, label: string) {
  return z
    .string({ message: `Select ${label}` })
    .min(1, `Select ${label}`)
    .pipe(z.enum(values, { message: `Select ${label}` }));
}

export const predictionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Car name is required")
    .max(200, "Car name must be 200 characters or fewer"),
  year: requiredNumber(MIN_YEAR, MAX_YEAR, "Manufacturing year"),
  km_driven: requiredNumber(0, 5_000_000, "Kilometers driven"),
  fuel: enumField(FUELS, "a fuel type"),
  seller_type: enumField(SELLER_TYPES, "a seller type"),
  transmission: enumField(TRANSMISSIONS, "a transmission type"),
  owner: enumField(OWNERS, "an owner type"),
  mileage: optionalNumber(0, 200, "Mileage"),
  engine: optionalNumber(0, 10_000, "Engine capacity"),
  max_power: optionalNumber(0, 2_000, "Maximum power"),
  torque: z
    .string()
    .trim()
    .max(100, "Torque must be 100 characters or fewer")
    .optional()
    .transform((value) => value ?? ""),
  seats: optionalNumber(0, 20, "Number of seats"),
});

/** What the form holds in the DOM (all strings). */
export type PredictionFormInput = z.input<typeof predictionSchema>;
/** What `handleSubmit` receives (numbers for numeric fields). */
export type PredictionFormValues = z.output<typeof predictionSchema>;

/** Blank form state. */
export function emptyFormValues(): PredictionFormInput {
  return {
    name: "",
    year: "",
    km_driven: "",
    fuel: "",
    seller_type: "",
    transmission: "",
    owner: "",
    mileage: "",
    engine: "",
    max_power: "",
    torque: "",
    seats: "",
  };
}

/** Notebook's evaluation sample — used by the "Load sample" button. */
export function sampleFormValues(): PredictionFormInput {
  return {
    name: "Maruti Swift Dzire VDI",
    year: "2014",
    km_driven: "145500",
    fuel: "Diesel",
    seller_type: "Individual",
    transmission: "Manual",
    owner: "First Owner",
    mileage: "23.4",
    engine: "1248",
    max_power: "74",
    torque: "190Nm@ 2000rpm",
    seats: "5",
  };
}
