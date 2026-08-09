import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useScanInsights } from "@/hooks/useResearchInsights";

const POLL_INTERVAL_MS = 5000;
const POLL_DURATION_MS = 60000;

interface ScanButtonProps {
  disabled?: boolean;
  disabledReason?: string;
}

export function ScanButton({ disabled, disabledReason }: ScanButtonProps): JSX.Element {
  const scanInsights = useScanInsights();
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleScan(): void {
    scanInsights.mutate(undefined, {
      onSuccess: () => {
        setPolling(true);
        const startedAt = Date.now();
        intervalRef.current = setInterval(() => {
          queryClient.invalidateQueries({ queryKey: ["research-insights"] });
          if (Date.now() - startedAt >= POLL_DURATION_MS) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPolling(false);
          }
        }, POLL_INTERVAL_MS);
      },
    });
  }

  const isBusy = scanInsights.isPending || polling;

  return (
    <div className="inline-block" title={disabled ? disabledReason : undefined}>
      <Button onClick={handleScan} disabled={disabled || isBusy}>
        {isBusy ? "Pesquisando..." : "Pesquisar agora"}
      </Button>
    </div>
  );
}
