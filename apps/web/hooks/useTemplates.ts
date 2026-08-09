"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface TemplateZone {
  id: string;
  type: "text" | "image" | "logo";
  slideIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  maxLength?: number;
}

export interface Template {
  id: string;
  workspaceId: string | null;
  source: string;
  format: "static_post" | "carousel";
  slotMap: { zones: TemplateZone[]; backgroundImages?: string[] };
  previewUrl: string | null;
  isSystemTemplate: boolean;
  deletedAt: string | null;
  createdAt: string;
}

export function useTemplates(source: "system" | "own", format?: string) {
  return useQuery({
    queryKey: ["templates", source, format],
    queryFn: () =>
      apiFetch<Template[]>(`/templates?source=${source}${format ? `&format=${format}` : ""}`),
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => apiFetch<Template>(`/templates/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { slotMap?: { zones: TemplateZone[]; backgroundImages?: string[] } }) =>
      apiFetch<Template>(`/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (data) => {
      queryClient.setQueryData(["templates", id], data);
      queryClient.invalidateQueries({ queryKey: ["templates"], exact: false });
    },
  });
}

export function useImportTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, source }: { files: File[]; source: "canva_import" | "gamma_import" }) => {
      const form = new FormData();
      files.forEach((file) => form.append("file", file));
      form.append("source", source);
      return apiFetch<Template>("/templates/import", { method: "POST", body: form });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"], exact: false }),
  });
}
