import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border/70 bg-card/50",
        destructive: "border-destructive/35 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        success: "border-success/35 bg-success/10 text-success [&>svg]:text-success",
        warning: "border-warning/35 bg-warning/10 text-warning [&>svg]:text-warning",
        info: "border-primary/35 bg-primary/10 text-primary [&>svg]:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
  {
    compoundVariants: [
      {
        variant: "default",
        className: "backdrop-blur-sm bg-opacity-50",
      },
    ],
  },
);

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  const baseClasses = cn(
    alertVariants({ variant, className }),
    "rounded-xl border shadow-lg backdrop-blur-sm",
  );

  return <div className={baseClasses} {...props} />;
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <h5 className={cn("mb-1 text-base font-semibold leading-none tracking-tight", className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };