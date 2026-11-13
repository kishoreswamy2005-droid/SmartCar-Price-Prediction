import { describe, expect, it } from "vitest";

import {
  MAX_YEAR,
  MIN_YEAR,
  emptyFormValues,
  predictionSchema,
  sampleFormValues,
} from "@/lib/predictionSchema";

/** Flatten a ZodError into `field: message` pairs for readable assertions. */
function issues(result: ReturnType<typeof predictionSchema.safeParse>) {
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [
      issue.path.join("."),
      issue.message as string,
    ]),
  );
}

describe("predictionSchema — happy path", () => {
  it("accepts the notebook sample and converts strings to numbers", () => {
    const result = predictionSchema.safeParse(sampleFormValues());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.year).toBe(2014);
    expect(typeof result.data.year).toBe("number");
    expect(result.data.km_driven).toBe(145500);
    expect(result.data.mileage).toBe(23.4);
    expect(result.data.engine).toBe(1248);
    expect(result.data.max_power).toBe(74);
    expect(result.data.seats).toBe(5);
    expect(result.data.name).toBe("Maruti Swift Dzire VDI");
    expect(result.data.fuel).toBe("Diesel");
    expect(result.data.torque).toBe("190Nm@ 2000rpm");
  });

  it("trims the car name", () => {
    const values = { ...sampleFormValues(), name: "  Maruti Swift VXI  " };
    const result = predictionSchema.safeParse(values);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Maruti Swift VXI");
  });

  it("keeps blank optional fields as undefined", () => {
    const values = {
      ...sampleFormValues(),
      mileage: "",
      engine: "",
      max_power: "",
      seats: "",
      torque: "",
    };
    const result = predictionSchema.safeParse(values);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.mileage).toBeUndefined();
    expect(result.data.engine).toBeUndefined();
    expect(result.data.max_power).toBeUndefined();
    expect(result.data.seats).toBeUndefined();
    expect(result.data.torque).toBe("");
  });
});

describe("predictionSchema — required fields", () => {
  it("rejects an empty form with user-facing messages", () => {
    const result = predictionSchema.safeParse(emptyFormValues());
    expect(result.success).toBe(false);

    const errors = issues(result);
    expect(errors.name).toBe("Car name is required");
    expect(errors.year).toBe("Manufacturing year is required");
    expect(errors.km_driven).toBe("Kilometers driven is required");
    expect(errors.fuel).toBe("Select a fuel type");
    expect(errors.seller_type).toBe("Select a seller type");
    expect(errors.transmission).toBe("Select a transmission type");
    expect(errors.owner).toBe("Select an owner type");
  });

  it("rejects a whitespace-only car name", () => {
    const result = predictionSchema.safeParse({
      ...sampleFormValues(),
      name: "   ",
    });
    expect(issues(result).name).toBe("Car name is required");
  });

  it("rejects car names over 200 characters", () => {
    const result = predictionSchema.safeParse({
      ...sampleFormValues(),
      name: "x".repeat(201),
    });
    expect(issues(result).name).toBe("Car name must be 200 characters or fewer");
  });
});

describe("predictionSchema — numeric validation", () => {
  it("rejects non-numeric text", () => {
    const result = predictionSchema.safeParse({
      ...sampleFormValues(),
      year: "abc",
      km_driven: "many",
    });
    const errors = issues(result);
    expect(errors.year).toBe("Manufacturing year must be a number");
    expect(errors.km_driven).toBe("Kilometers driven must be a number");
  });

  it("enforces the model's year range", () => {
    const tooOld = predictionSchema.safeParse({
      ...sampleFormValues(),
      year: String(MIN_YEAR - 1),
    });
    expect(issues(tooOld).year).toBe(
      `Manufacturing year must be at least ${MIN_YEAR}`,
    );

    const tooNew = predictionSchema.safeParse({
      ...sampleFormValues(),
      year: String(MAX_YEAR + 1),
    });
    expect(issues(tooNew).year).toBe(
      `Manufacturing year must be at most ${MAX_YEAR}`,
    );

    const boundary = predictionSchema.safeParse({
      ...sampleFormValues(),
      year: String(MIN_YEAR),
    });
    expect(boundary.success).toBe(true);
  });

  it("rejects negative kilometres", () => {
    const result = predictionSchema.safeParse({
      ...sampleFormValues(),
      km_driven: "-10",
    });
    expect(issues(result).km_driven).toBe("Kilometers driven must be at least 0");
  });

  it("rejects out-of-range optional numbers", () => {
    const result = predictionSchema.safeParse({
      ...sampleFormValues(),
      mileage: "500",
      seats: "99",
      engine: "-1",
    });
    const errors = issues(result);
    expect(errors.mileage).toBe("Mileage must be at most 200");
    expect(errors.seats).toBe("Number of seats must be at most 20");
    expect(errors.engine).toBe("Engine capacity must be at least 0");
  });
});

describe("predictionSchema — enums and torque", () => {
  it("rejects unknown enum values", () => {
    const result = predictionSchema.safeParse({
      ...sampleFormValues(),
      fuel: "Electric",
      transmission: "Semi-Auto",
    });
    const errors = issues(result);
    expect(errors.fuel).toBe("Select a fuel type");
    expect(errors.transmission).toBe("Select a transmission type");
  });

  it("rejects torque strings over 100 characters", () => {
    const result = predictionSchema.safeParse({
      ...sampleFormValues(),
      torque: "x".repeat(101),
    });
    expect(issues(result).torque).toBe("Torque must be 100 characters or fewer");
  });
});
