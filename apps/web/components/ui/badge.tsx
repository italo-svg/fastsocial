import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide", {
  variants: {
    variant: {
      success: "bg-green-100 text-success",
      warning: "bg-amber-100 text-warning",
      danger: "bg-red-100 text-danger",
      neutral: "bg-neutral-100 text-neutral-600",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
