import { cn } from "@/lib/utils";

interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            "h-2 rounded-full transition-all",
            step === current ? "w-6 bg-primary" : "w-2 bg-neutral-200",
          )}
        />
      ))}
    </div>
  );
}
