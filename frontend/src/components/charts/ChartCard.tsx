import { BarChart3, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  /** Chart height in pixels (the ResponsiveContainer fills this box). */
  height?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard frame around every chart: heading, states (loading / error /
 * empty) and a fixed-height plot area so charts never collapse.
 */
export function ChartCard({
  title,
  description,
  icon,
  actions,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "No data to display yet.",
  height = 260,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 pb-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/15">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-semibold sm:text-base">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-0.5 line-clamp-2 text-xs">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </CardHeader>

      <CardContent className="flex-1 pb-4 pt-2">
        {loading ? (
          <div className="flex flex-col gap-3" style={{ height }} aria-label="Loading chart">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-4 text-center"
            style={{ height }}
            role="alert"
          >
            <TriangleAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Could not load chart</p>
            <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
          </div>
        ) : empty ? (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 text-center"
            style={{ height }}
          >
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div style={{ height }} className="w-full" role="img">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
