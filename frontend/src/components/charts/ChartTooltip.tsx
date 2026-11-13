import { cn } from "@/lib/utils";

export interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  /** Injected by Recharts. */
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  /** Static heading; falls back to the formatted x-axis label. */
  title?: string;
  formatLabel?: (label: string | number) => string;
  formatValue?: (value: number | string, name: string) => string;
  className?: string;
}

/**
 * Recharts-compatible tooltip: pass it straight to ``<Tooltip content={<ChartTooltip …/>} />``.
 * Renders a small popover card with one labelled row per series.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  formatLabel,
  formatValue,
  className,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const heading =
    title ?? (label !== undefined && label !== "" ? formatLabel?.(label) ?? String(label) : undefined);

  return (
    <div
      className={cn(
        "min-w-[140px] max-w-[260px] rounded-md border bg-popover px-3 py-2 text-sm shadow-lg",
        className,
      )}
    >
      {heading && (
        <p className="mb-1 truncate text-xs font-semibold text-foreground">{heading}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const name = String(item.name ?? item.dataKey ?? "value");
          const raw = item.value ?? "—";
          const display =
            typeof raw === "number" && formatValue ? formatValue(raw, name) : String(raw);
          return (
            <div
              key={`${name}-${index}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                {item.color && (
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{name}</span>
              </span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
