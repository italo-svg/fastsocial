"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export type TriggerType = "comment" | "message" | "story_reply";
export type StepType = "send_dm" | "send_quick_replies" | "wait" | "tag_contact";

export interface AutomationTrigger {
  triggerType: TriggerType;
  matchValue: string;
  socialAccountId: string;
}

export interface AutomationStep {
  id?: string;
  stepOrder: number;
  stepType: StepType;
  payload: Record<string, unknown>;
}

export interface AutomationStats {
  total: number;
  completed: number;
  failed: number;
  successRate: number | null;
  recentRuns?: { status: string; executedAt: string; errorMessage: string | null }[];
}

export interface AutomationFlow {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  trigger: AutomationTrigger | null;
  steps: AutomationStep[];
  stats: AutomationStats;
}

export interface CreateAutomationFlowInput {
  name: string;
  trigger: AutomationTrigger;
  steps: { stepType: StepType; payload: Record<string, unknown> }[];
}

const AUTOMATIONS_KEY = ["automations"];

export function useAutomations() {
  return useQuery({
    queryKey: AUTOMATIONS_KEY,
    queryFn: () => apiFetch<AutomationFlow[]>("/automations"),
  });
}

export function useAutomationDetail(id: string) {
  return useQuery({
    queryKey: [...AUTOMATIONS_KEY, id],
    queryFn: () => apiFetch<AutomationFlow>(`/automations/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAutomationFlowInput) =>
      apiFetch<AutomationFlow>("/automations", { method: "POST", body: JSON.stringify(input) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  });
}

export function useUpdateAutomation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateAutomationFlowInput> & { isActive?: boolean }) =>
      apiFetch<AutomationFlow>(`/automations/${id}`, { method: "PUT", body: JSON.stringify(input) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: AUTOMATIONS_KEY }),
  });
}
