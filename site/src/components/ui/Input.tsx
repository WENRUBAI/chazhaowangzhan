import * as React from "react";
import { cn } from "@/lib/ui/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground outline-none transition-all placeholder:text-white/30 hover:border-white/20 focus:border-violet-500/50 focus:bg-white/10 focus:shadow-glow focus:ring-1 focus:ring-violet-500/50",
          className,
        )}
        {...props}
      />
    );
  },
);
