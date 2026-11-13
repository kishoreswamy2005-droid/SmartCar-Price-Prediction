import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconClassName?: string;
  loading?: boolean;
  empty?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Dashboard KPI tile. ``empty`` renders an em dash instead of a fake 0. */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClassName,
  loading = false,
  empty = false,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-shadow duration-200 hover:shadow-card-hover",
        className,
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/60 via-primary/20 to-transparent"
        aria-hidden="true"
      />
      <CardContent className="flex items-start gap-4 p-5">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15 transition-transform duration-200 group-hover:scale-105",
            iconClassName,
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2.5 h-7 w-28" />
          ) : (
            <p
              className={cn(
                "mt-1.5 truncate text-[1.6rem] font-bold leading-none tracking-tight tabular-nums",
                empty && "text-muted-foreground",
              )}
            >
              {value}
            </p>
          )}
          {sub && !loading && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
