"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { TemplateZone } from "./useTemplates";

export interface ContentSlide {
  id: string;
  slideOrder: number;
  slideText: string | null;
  imageSource: "own_library" | "stock_bank" | "ai_generated";
  backgroundImageUrl: string | null;
  renderedImageUrl: string | null;
}

export interface ContentPiece {
  id: string;
  workspaceId: string;
  templateId: string | null;
  format: "static_post" | "carousel";
  copyText: string | null;
  documentUrl: string | null;
  slides: ContentSlide[];
  template: { id: string; slotMap: { zones: TemplateZone[] } } | null;
}

export interface RenderResult {
  slides: { order: number; imageUrl: string }[];
  documentUrl?: string;
}

const KEY = (id: string | undefined) => ["content-pieces", id];

export function useCreateContentPiece() {
  return useMutation({
    mutationFn: (data: { templateId: string; format: string; briefing?: string; insightId?: string }) =>
      apiFetch<ContentPiece>("/content-pieces", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useContentPiece(id: string | undefined) {
  return useQuery({
    queryKey: KEY(id),
    queryFn: () => apiFetch<ContentPiece>(`/content-pieces/${id}`),
    enabled: !!id,
  });
}

export function useUpdateContentPieceTemplate(contentPieceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      apiFetch<ContentPiece>(`/content-pieces/${contentPieceId}`, {
        method: "PUT",
        body: JSON.stringify({ templateId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY(contentPieceId) }),
  });
}

export function useUpdateContentSlide(contentPieceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slideId,
      data,
    }: {
      slideId: string;
      data: Partial<{ slideText: string; imageSource: string; backgroundImageUrl: string }>;
    }) =>
      apiFetch<ContentSlide>(`/content-pieces/${contentPieceId}/slides/${slideId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY(contentPieceId) }),
  });
}

export function useUploadSlideImage(contentPieceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slideId, file }: { slideId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return apiFetch<ContentSlide>(`/content-pieces/${contentPieceId}/slides/${slideId}/image`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY(contentPieceId) }),
  });
}

export function useRenderContentPiece(contentPieceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetNetwork: "instagram" | "facebook" | "linkedin") =>
      apiFetch<RenderResult>(`/content-pieces/${contentPieceId}/render`, {
        method: "POST",
        body: JSON.stringify({ targetNetwork }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY(contentPieceId) }),
  });
}
