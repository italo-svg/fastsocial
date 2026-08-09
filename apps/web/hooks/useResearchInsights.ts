"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ResearchInsight {
  id: string;
  workspaceId: string;
  sourceType: "competitor" | "hashtag_trend" | "topic_trend" | "manual";
  sourceRef: string | null;
  summary: string;
  relevanceScore: string;
  suggestedFormat: string | null;
  consumed: boolean;
  capturedAt: string;
}

export function useResearchInsights() {
  return useQuery({
    queryKey: ["research-insights"],
    queryFn: () => apiFetch<ResearchInsight[]>("/research-insights"),
  });
}

export function useScanInsights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ scanId: string }>("/research-insights/scan", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["research-insights"] }),
  });
}
