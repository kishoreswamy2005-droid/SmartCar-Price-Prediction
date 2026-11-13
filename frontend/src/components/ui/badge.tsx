import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
        secondary:
          "border-transparent bg-secondary/10 text-secondary hover:bg-secondary/20",
        outline:
          "border-border/60 bg-background text-foreground hover:bg-muted/50",
        success:
          "border-transparent bg-success/10 text-success hover:bg-success/20",
        warning:
          "border-transparent bg-warning/10 text-warning hover:bg-warning/20",
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
        muted:
          "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        gradient:
          "bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-primary/20 hover:from-primary/20 hover:to-accent/20",
      },
      size: {
        xs: "px-2 py-0.5 text-xs",
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-3.5 py-1 text-sm",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-full",
        md: "rounded-full",
        lg: "rounded-full",
        xl: "rounded-full",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
      rounded: "full",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactMe;
  dot?: boolean;
}

function Badge({
  className,
  variant,
  size,
  rounded,
  leftIcon,
  rightIcon,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const baseClasses = cn(
    badgeVariants({ variant, size, rounded, className }),
    "inline-flex items-center gap-1.5",
  );

  return (
    <div className={baseClasses} {...props}>
      {dot && (
        <span className="h-2 w-2 rounded-full bg-current inline-block" />
      )}
      {leftIcon && <span className="mr-1.5">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-1.5">{rightIcon}</span>}
    </div>
  );
}

export { Badge, badgeVariants };