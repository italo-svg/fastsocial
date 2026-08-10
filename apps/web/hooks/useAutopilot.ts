"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface AutopilotConfig {
  workspaceId: string;
  isActive: boolean;
  postsPerWeek: number;
  formatMix: Record<string, number>;
  requiresApproval: boolean;
  preferredTimes: string[];
  lastRunAt: string | null;
  warnings: string[];
}

export interface UpdateAutopilotInput {
  postsPerWeek: number;
  formatMix: Record<string, number>;
  requiresApproval: boolean;
  preferredTimes: string[];
}

export interface AutopilotRun {
  date: string;
  count: number;
  pieces: { id: string; format: string; status: string; createdAt: string }[];
}

const AUTOPILOT_KEY = ["autopilot"];
const AUTOPILOT_RUNS_KEY = ["autopilot", "runs"];

async function fetchAutopilot(): Promise<AutopilotConfig | null> {
  try {
    return await apiFetch<AutopilotConfig>("/autopilot");
  } catch (err) {
    if (err instanceof Error && err.message.includes("(404)")) return null;
    throw err;
  }
}

export function useAutopilot() {
  return useQuery({ queryKey: AUTOPILOT_KEY, queryFn: fetchAutopilot });
}

export function useUpdateAutopilot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAutopilotInput) =>
      apiFetch<AutopilotConfig>("/autopilot", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => queryClient.setQueryData(AUTOPILOT_KEY, data),
  });
}

export function useToggleAutopilot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) =>
      apiFetch<AutopilotConfig>("/autopilot/toggle", { method: "POST", body: JSON.stringify({ isActive }) }),
    onSuccess: (data) => queryClient.setQueryData(AUTOPILOT_KEY, data),
  });
}

export function useAutopilotRuns() {
  return useQuery({
    queryKey: AUTOPILOT_RUNS_KEY,
    queryFn: () => apiFetch<AutopilotRun[]>("/autopilot/runs"),
  });
}
