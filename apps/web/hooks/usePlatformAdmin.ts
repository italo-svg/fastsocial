"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  planType: string;
  billingStatus: string | null;
  connectedSocialAccounts: number;
  publishedThisMonth: number;
  autopilotLastRunAt: string | null;
  createdAt: string;
}

const WORKSPACES_KEY = ["platform-admin", "workspaces"];

export function usePlatformWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: () => apiFetch<WorkspaceSummary[]>("/platform/workspaces"),
  });
}

export function useProvisionWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string }) =>
      apiFetch<{ workspaceId: string; mode: "direct" | "invited" }>("/platform/workspaces", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  });
}

export function useSuspendWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/platform/workspaces/${id}/suspend`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  });
}

export function useReactivateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/platform/workspaces/${id}/reactivate`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  });
}

export function useImpersonateWorkspace() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ token: string; workspaceId: string; expiresInMinutes: number }>(
        `/platform/workspaces/${id}/impersonate`,
        { method: "POST" },
      ),
  });
}
