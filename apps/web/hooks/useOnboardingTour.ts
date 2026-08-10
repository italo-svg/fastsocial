"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface OnboardingProgress {
  connectedSocialAccount: boolean;
  autopilotConfigured: boolean;
  firstPostPublished: boolean;
}

export function useProductTourStatus(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["product-tour", workspaceId],
    queryFn: () => apiFetch<{ hasSeenProductTour: boolean }>(`/workspaces/${workspaceId}/product-tour`),
    enabled: !!workspaceId,
  });
}

export function useMarkProductTourSeen(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/workspaces/${workspaceId}/product-tour/seen`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-tour", workspaceId] }),
  });
}

export function useOnboardingProgress(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["onboarding-progress", workspaceId],
    queryFn: () => apiFetch<OnboardingProgress>(`/workspaces/${workspaceId}/onboarding-progress`),
    enabled: !!workspaceId,
  });
}
