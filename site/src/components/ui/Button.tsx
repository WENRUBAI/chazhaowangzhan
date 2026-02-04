import * as React from "react";
import { cn } from "@/lib/ui/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "relative overflow-hidden bg-gradient-to-r from-neon-purple to-neon-magenta text-white shadow-neon border border-transparent hover:brightness-110 focus-visible:ring-2 focus-visible:ring-neon-purple/50",
  secondary:
    "border border-white/20 bg-surface/30 text-foreground backdrop-blur-md hover:border-neon-cyan/50 hover:bg-surface hover:shadow-neon-sm focus-visible:ring-2 focus-visible:ring-neon-cyan transition-all duration-300",
  ghost:
    "text-foreground/70 hover:bg-white/5 hover:text-neon-cyan focus-visible:ring-2 focus-visible:ring-ring",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-red-500/50",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "secondary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium outline-none transition-all disabled:pointer-events-none disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {variant === "primary" && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-overlay" />
      )}
      <span className="relative">{props.children}</span>
    </button>
  );
});
