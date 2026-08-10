"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface FunnelStage {
  eventName: string;
  count: number;
  pctOfPrevious: number | null;
  pctOfFirst: number | null;
}

export interface UtmBreakdownRow {
  value: string;
  stages: Record<string, number>;
  conversionRate: number | null;
}

export function useFunnel(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();

  return useQuery({
    queryKey: ["platform-admin", "funnel", from, to],
    queryFn: () => apiFetch<{ stages: FunnelStage[] }>(`/platform/funnel${qs ? `?${qs}` : ""}`),
  });
}

export function useFunnelByUtm(groupBy: "source" | "medium" | "campaign") {
  return useQuery({
    queryKey: ["platform-admin", "funnel", "by-utm", groupBy],
    queryFn: () =>
      apiFetch<{ groupBy: string; rows: UtmBreakdownRow[] }>(`/platform/funnel/by-utm?groupBy=${groupBy}`),
  });
}
