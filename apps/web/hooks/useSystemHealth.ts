"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export type ServiceStatus = "up" | "down" | "not_configured";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latencyMs: number;
  lastCheckedAt: string;
  detail?: string;
}

const POLL_INTERVAL_MS = 30_000;

export function useSystemHealth() {
  return useQuery({
    queryKey: ["platform-admin", "system-health"],
    queryFn: () => apiFetch<{ services: ServiceHealth[] }>("/platform/system-health"),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
