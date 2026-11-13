import { describe, expect, it } from "vitest";

import {
  formatChartDate,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatINR,
  formatINRFull,
  formatINRShort,
  formatKm,
  formatNumber,
  shortId,
} from "@/utils/format";

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(545000)).toBe("₹5,45,000");
    expect(formatINR(1000)).toBe("₹1,000");
    expect(formatINR(10000000)).toBe("₹1,00,00,000");
  });

  it("rounds to whole rupees", () => {
    expect(formatINR(511800.2445)).toBe("₹5,11,800");
  });

  it("handles null, undefined and non-finite values", () => {
    expect(formatINR(null)).toBe("₹ —");
    expect(formatINR(undefined)).toBe("₹ —");
    expect(formatINR(Number.NaN)).toBe("₹ —");
    expect(formatINR(Number.POSITIVE_INFINITY)).toBe("₹ —");
  });
});

describe("formatINRFull", () => {
  it("keeps two decimals for raw model output", () => {
    expect(formatINRFull(511800.2445)).toBe("₹5,11,800.24");
  });

  it("pads single-digit decimals", () => {
    expect(formatINRFull(100.5)).toBe("₹100.50");
  });

  it("guards invalid input", () => {
    expect(formatINRFull(null)).toBe("₹ —");
  });
});

describe("formatNumber", () => {
  it("groups with the Indian numbering system", () => {
    expect(formatNumber(6926)).toBe("6,926");
    expect(formatNumber(100000)).toBe("1,00,000");
  });

  it("returns a dash for missing values", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });
});

describe("formatDecimal", () => {
  it("formats to the requested precision", () => {
    expect(formatDecimal(0.703431)).toBe("0.70");
    expect(formatDecimal(0.703431, 4)).toBe("0.7034");
    expect(formatDecimal(1, 0)).toBe("1");
  });

  it("returns a dash for missing values", () => {
    expect(formatDecimal(null)).toBe("—");
    expect(formatDecimal(Number.NaN)).toBe("—");
  });
});

describe("formatINRShort", () => {
  it("abbreviates large amounts", () => {
    expect(formatINRShort(545000)).toBe("₹5.5L");
    expect(formatINRShort(15000000)).toBe("₹150L");
    expect(formatINRShort(150000000)).toBe("₹1.5Cr");
    expect(formatINRShort(45000)).toBe("₹45k");
    expect(formatINRShort(950)).toBe("₹950");
  });

  it("returns a dash for missing values", () => {
    expect(formatINRShort(null)).toBe("—");
  });
});

describe("formatKm", () => {
  it("groups kilometres", () => {
    expect(formatKm(45000)).toBe("45,000 km");
    expect(formatKm(1234567)).toBe("12,34,567 km");
  });

  it("handles missing values", () => {
    expect(formatKm(null)).toBe("—");
  });
});

describe("date helpers", () => {
  const iso = "2026-03-05T10:30:00.000Z";

  it("formatDateTime renders day, month, year and time", () => {
    const out = formatDateTime(iso);
    expect(out).toMatch(/Mar/);
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });

  it("formatDate renders only the date", () => {
    const out = formatDate(iso);
    expect(out).toMatch(/Mar/);
    expect(out).toMatch(/2026/);
    expect(out).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("formatChartDate produces a compact axis label", () => {
    expect(formatChartDate("2026-10-01")).toBe("1 Oct");
  });

  it("formatChartDate falls back to the raw string when unparsable", () => {
    expect(formatChartDate("not-a-date")).toBe("not-a-date");
  });

  it("handles null and invalid dates safely", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime("garbage")).toBe("—");
    expect(formatDate("garbage")).toBe("—");
  });
});

describe("shortId", () => {
  it("shortens ids longer than 16 characters", () => {
    expect(shortId("abcdef12345678901234")).toBe("abcdef12…1234");
  });

  it("keeps short ids intact", () => {
    expect(shortId("abc")).toBe("abc");
    expect(shortId("abcdef1234567890")).toBe("abcdef1234567890");
  });

  it("returns a dash when missing", () => {
    expect(shortId("")).toBe("—");
  });
});
