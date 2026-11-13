/** Number, currency and date formatting helpers (Indian numbering system). */

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainWhole = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** ₹5,45,000 — Indian digit grouping, no decimals. */
export function formatINR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "₹ —";
  return inrWhole.format(value);
}

/** ₹5,45,000.24 — keeps decimals when they matter (model output). */
export function formatINRFull(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "₹ —";
  return inrDecimals.format(value);
}

/** 0.7034 — fixed-precision decimals for ratios and scores (e.g. R²). */
export function formatDecimal(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** 1,45,500 — plain Indian grouping without the currency symbol. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return plainWhole.format(value);
}

/** Axis-friendly short form: ₹50k, ₹1.2L, ₹2.5Cr. */
export function formatINRShort(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `₹${trimZero(value / 100_000_000)}Cr`;
  if (abs >= 100_000) return `₹${trimZero(value / 100_000)}L`;
  if (abs >= 1_000) return `₹${trimZero(value / 1_000)}k`;
  return `₹${Math.round(value)}`;
}

function trimZero(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** 145,500 km with Indian grouping. */
export function formatKm(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${plainWhole.format(value)} km`;
}

/** 11 Nov 2026, 5:32 PM */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 11 Nov 2026 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** 2026-10-01 -> 1 Oct (compact axis label). */
export function formatChartDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** 12-char short id for dense tables: 3f9a1c2e…8b7d */
export function shortId(id: string): string {
  if (!id) return "—";
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}
