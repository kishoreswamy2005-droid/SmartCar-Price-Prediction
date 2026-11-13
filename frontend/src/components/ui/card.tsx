import * as React from "react";

import { cn } from "@/lib/utils";

const cardVariants = {
  variants: {
    variant: {
      default: "bg-card border border-border/70 text-card-foreground shadow-md hover:shadow-lg transition-shadow duration-200",
      elevated: "bg-card border border-border/5 shadow-lg hover:shadow-xl transition-shadow duration-3",
      filled: "bg-muted/50 border border-border/50 text-foreground",
      transparent: "bg-transparent border border-border/30 text-card-foreground hover:bg-muted/50 transition-colors duration-200",
      gradient: "bg-gradient-to-br from-primary/5 to-transparent border border-border/50 shadow-lg hover:shadow-xl transition-all duration-200",
    },
    size: {
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
      xl: "p-10",
    },
    rounded: {
      none: "rounded-none",
      sm: "rounded-lg",
      md: "rounded-xl",
      lg: "rounded-2xl",
      xl: "rounded-3xl",
      full: "rounded-2xl",
    },
  },
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants.variants.variant;
  size?: keyof typeof cardVariants.variants.size;
  rounded?: keyof typeof cardVariants.variants.rounded;
  hover?: boolean;
}

function Card({ variant = "default", size = "md", rounded = "lg", hover = true, className, ...props }: CardProps) {
  const baseClasses = cn(
    "relative overflow-hidden",
    cardVariants.variants.variant[variant],
    cardVariants.variants.size[size],
    cardVariants.variants.rounded[rounded],
    hover ? "hover:scale-[1.02] hover:-translate-y-1" : "",
    className,
  );

  return <div className={baseClasses} {...props} />;
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props} />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center p-6 pt-0 border-t border-border/50 mt-4", className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };