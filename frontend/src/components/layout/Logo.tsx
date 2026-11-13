import { CarFront } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
}

/** SmartCar brand mark: electric-blue tile with a car glyph. */
export function Logo({ className, iconClassName }: LogoProps) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-electric-400 via-electric-500 to-navy-900 shadow-glow-sm ring-1 ring-white/20",
        className,
      )}
      aria-hidden="true"
    >
      <CarFront className={cn("h-5 w-5 text-white", iconClassName)} strokeWidth={2.2} />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col leading-tight", className)}>
      <span className="text-base font-bold tracking-tight text-white">
        Smart<span className="text-electric-400">Car</span>
      </span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">
        Price Prediction
      </span>
    </span>
  );
}
