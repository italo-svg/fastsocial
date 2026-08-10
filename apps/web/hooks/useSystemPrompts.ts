"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface SystemPromptSummary {
  promptKey: string;
  currentVersion: number;
  content: string;
  updatedAt: string | null;
  updatedBy?: string | null;
}

export interface SystemPromptVersion {
  id: string;
  promptKey: string;
  version: number;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

export interface PromptTestResult {
  output: string;
  note: string;
}

const LIST_KEY = ["platform-admin", "system-prompts"];

export function useSystemPrompts() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => apiFetch<SystemPromptSummary[]>("/platform/system-prompts"),
  });
}

export function useSystemPrompt(key: string) {
  return useQuery({
    queryKey: [...LIST_KEY, key],
    queryFn: () => apiFetch<SystemPromptSummary>(`/platform/system-prompts/${key}`),
    enabled: !!key,
  });
}

export function usePromptVersions(key: string) {
  return useQuery({
    queryKey: [...LIST_KEY, key, "versions"],
    queryFn: () => apiFetch<SystemPromptVersion[]>(`/platform/system-prompts/${key}/versions`),
    enabled: !!key,
  });
}

export function useUpdatePrompt(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<SystemPromptSummary>(`/platform/system-prompts/${key}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...LIST_KEY, key] });
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useRollbackPrompt(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) =>
      apiFetch<SystemPromptSummary>(`/platform/system-prompts/${key}/rollback/${version}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...LIST_KEY, key] });
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useTestPrompt(key: string) {
  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<PromptTestResult>(`/platform/system-prompts/${key}/test`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  });
}
