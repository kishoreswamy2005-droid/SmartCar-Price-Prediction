import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted via-elevated to-muted bg-[length:200%_100%]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };