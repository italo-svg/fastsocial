import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-card border border-[var(--card-border)] bg-[var(--card-background)] p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
