/** Recharts palette — harmonised, readable on both light and dark surfaces. */
export const CHART_COLORS = {
  blue: "#3b82f6",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  emerald: "#10b981",
  violet: "#8b5cf6",
  rose: "#fb7185",
  sky: "#38bdf8",
  slate: "#94a3b8",
} as const;

export const CHART_PALETTE: string[] = [
  CHART_COLORS.blue,
  CHART_COLORS.violet,
  CHART_COLORS.sky,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.cyan,
];

/** Shared axis styling (Tailwind classes resolve against the active theme). */
export const AXIS_TICK_STYLE = {
  className: "fill-muted-foreground text-[11px]",
} as const;

export const GRID_STYLE = {
  className: "stroke-border",
  strokeOpacity: 0.6,
  strokeDasharray: "3 3",
} as const;
