"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  contentMarkdown: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangelogEntry {
  id: string;
  title: string;
  bodyMarkdown: string;
  tag: string;
  publishedAt: string | null;
  createdAt: string;
}

const ARTICLES_KEY = ["help-articles"];
const CHANGELOG_KEY = ["changelog"];
const ADMIN_ARTICLES_KEY = ["platform-admin", "help-articles"];
const ADMIN_CHANGELOG_KEY = ["platform-admin", "changelog"];

// Público — sem X-Workspace-Id/auth, mas apiFetch já lida bem com sessão ausente.
export function usePublishedArticles(q?: string) {
  return useQuery({
    queryKey: [...ARTICLES_KEY, q],
    queryFn: () => apiFetch<HelpArticle[]>(`/help-articles${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
}

export function usePublishedArticle(slug: string) {
  return useQuery({
    queryKey: [...ARTICLES_KEY, slug],
    queryFn: () => apiFetch<HelpArticle>(`/help-articles/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

export function usePublishedChangelog() {
  return useQuery({
    queryKey: CHANGELOG_KEY,
    queryFn: () => apiFetch<ChangelogEntry[]>("/changelog"),
  });
}

export function useAdminArticles() {
  return useQuery({
    queryKey: ADMIN_ARTICLES_KEY,
    queryFn: () => apiFetch<HelpArticle[]>("/platform/help-articles"),
  });
}

export function useAdminArticle(id: string) {
  return useQuery({
    queryKey: [...ADMIN_ARTICLES_KEY, id],
    queryFn: async () => {
      const all = await apiFetch<HelpArticle[]>("/platform/help-articles");
      const found = all.find((a) => a.id === id);
      if (!found) throw new Error("Artigo não encontrado.");
      return found;
    },
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; category: string; contentMarkdown: string; isPublished?: boolean }) =>
      apiFetch<HelpArticle>("/platform/help-articles", { method: "POST", body: JSON.stringify(dto) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_ARTICLES_KEY }),
  });
}

export function useUpdateArticle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<{ title: string; category: string; contentMarkdown: string; isPublished: boolean }>) =>
      apiFetch<HelpArticle>(`/platform/help-articles/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_ARTICLES_KEY }),
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/platform/help-articles/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_ARTICLES_KEY }),
  });
}

export function useAdminChangelog() {
  return useQuery({
    queryKey: ADMIN_CHANGELOG_KEY,
    queryFn: () => apiFetch<ChangelogEntry[]>("/platform/changelog"),
  });
}

export function useAdminChangelogEntry(id: string) {
  return useQuery({
    queryKey: [...ADMIN_CHANGELOG_KEY, id],
    queryFn: async () => {
      const all = await apiFetch<ChangelogEntry[]>("/platform/changelog");
      const found = all.find((e) => e.id === id);
      if (!found) throw new Error("Entrada não encontrada.");
      return found;
    },
    enabled: !!id,
  });
}

export function useCreateChangelogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; bodyMarkdown: string; tag: string; publishedAt?: string }) =>
      apiFetch<ChangelogEntry>("/platform/changelog", { method: "POST", body: JSON.stringify(dto) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CHANGELOG_KEY }),
  });
}

export function useUpdateChangelogEntry(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<{ title: string; bodyMarkdown: string; tag: string; publishedAt: string | null }>) =>
      apiFetch<ChangelogEntry>(`/platform/changelog/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CHANGELOG_KEY }),
  });
}

export function useDeleteChangelogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/platform/changelog/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_CHANGELOG_KEY }),
  });
}
