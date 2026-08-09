import { cn } from "@/lib/utils";

export type TargetNetwork = "instagram" | "facebook" | "linkedin";

const NETWORKS: { value: TargetNetwork; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

interface NetworkSelectorProps {
  value: TargetNetwork;
  onChange: (value: TargetNetwork) => void;
  format: "static_post" | "carousel";
}

export function NetworkSelector({ value, onChange, format }: NetworkSelectorProps): JSX.Element {
  const showPdfWarning = value === "linkedin" && format === "carousel";

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Rede de destino</h3>
      <div className="flex gap-2">
        {NETWORKS.map((network) => (
          <button
            key={network.value}
            type="button"
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium",
              value === network.value ? "border-primary bg-primary/10 text-primary" : "border-neutral-200",
            )}
            onClick={() => onChange(network.value)}
          >
            {network.label}
          </button>
        ))}
      </div>
      {showPdfWarning && (
        <p className="text-xs text-warning">Este carrossel será publicado como documento PDF no LinkedIn.</p>
      )}
    </div>
  );
}
