import * as React from "react";
import { cn } from "@/lib/ui/cn";

export type BadgeVariant = "default" | "muted" | "solid" | "outline";

type Props = React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

const variantClass: Record<BadgeVariant, string> = {
  default: "border border-white/10 bg-white/5 text-white/80 backdrop-blur-sm",
  muted: "border border-transparent bg-white/5 text-white/50",
  solid: "bg-violet-600/80 text-white shadow-glow border border-violet-500/50",
  outline: "border border-white/20 text-white/70",
};

export function Badge({ className, variant = "default", ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
