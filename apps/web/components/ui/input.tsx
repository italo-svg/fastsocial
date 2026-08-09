import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
