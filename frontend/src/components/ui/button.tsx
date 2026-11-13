import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-glow-sm hover:bg-primary/90 hover:shadow-glow active:shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs",
        outline:
          "border border-input/80 bg-background text-foreground shadow-xs hover:border-primary/50 hover:bg-accent hover:text-accent-foreground backdrop-blur-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:brightness-110 active:shadow-sm",
        success:
          "bg-success text-white shadow-sm hover:brightness-110 active:shadow-sm",
        warning:
          "bg-warning text-white shadow-sm hover:brightness-110 active:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline",
        elevated:
          "bg-card border border-border/50 shadow-md hover:shadow-card-hover hover:border-border/80 active:shadow-sm",
      },
      size: {
        xs: "h-7 px-3 text-xs",
        sm: "h-8 px-3.5 text-sm",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-base",
        xl: "h-11 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-md",
        md: "rounded-lg",
        lg: "rounded-xl",
        xl: "rounded-2xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      rounded: "md",
    },
  },
  {
    compoundVariants: [
      {
        variant: "default",
        size: "md",
        className:
          "px-4 py-2",
      },
      {
        variant: "outline",
        className:
          "backdrop-blur-sm bg-opacity-50",
      },
      {
        variant: "ghost",
        className:
          "hover:bg-transparent hover:underline",
      },
    ],
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      rounded,
      asChild = false,
      leftIcon,
      rightIcon,
      loading = false,
      loadingText,
      disabled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const Comp = asChild ? Slot : "button";

    // When asChild is true, we render the children directly without wrapping
    if (asChild) {
      if (!React.isValidElement(children)) {
        console.error("Button with asChild=true must have a single React element child.");
        return null;
      }
      return React.cloneElement(
        children as React.ReactElement,
        {
          ...props,
          className: cn(buttonVariants({ variant, size, rounded, className }), children.props.className),
          ref,
        },
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0c4.42 0 8 3.58 8 8v0a8 8 0 01-16 0z"
            ></path>
          </svg>
        )}
        {leftIcon && !loading && <span className="mr-2">{leftIcon}</span>}
        {loading && loadingText ? loadingText : children}
        {rightIcon && !loading && <span className="ml-2">{rightIcon}</span>}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };