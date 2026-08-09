"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface BrandKit {
  workspaceId: string;
  niche: string | null;
  competitors: unknown;
  toneOfVoice: string | null;
  colorPalette: unknown;
  typography: unknown;
  logoUrl: string | null;
  defaultImageSource: string;
  referenceImages: string[];
  warnings: string[];
}

export interface UpdateBrandKitInput {
  niche?: string;
  competitors?: string[];
  toneOfVoice?: string;
  colorPalette?: Record<string, string>;
  typography?: Record<string, string>;
  defaultImageSource?: "own_library" | "stock" | "ai_generated";
}

const BRAND_KIT_KEY = ["brand-kit"];

async function fetchBrandKit(): Promise<BrandKit | null> {
  try {
    return await apiFetch<BrandKit>("/brand-kit");
  } catch (err) {
    if (err instanceof Error && err.message.includes("(404)")) return null;
    throw err;
  }
}

export function useBrandKit() {
  return useQuery({ queryKey: BRAND_KIT_KEY, queryFn: fetchBrandKit });
}

export function useUpdateBrandKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBrandKitInput) =>
      apiFetch<BrandKit>("/brand-kit", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => queryClient.setQueryData(BRAND_KIT_KEY, data),
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiFetch<BrandKit>("/brand-kit/logo", { method: "POST", body: form });
    },
    onSuccess: (data) => queryClient.setQueryData(BRAND_KIT_KEY, data),
  });
}

export function useUploadReferenceImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      return apiFetch<BrandKit>("/brand-kit/reference-images", { method: "POST", body: form });
    },
    onSuccess: (data) => queryClient.setQueryData(BRAND_KIT_KEY, data),
  });
}

export function useDeleteReferenceImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (index: number) =>
      apiFetch<BrandKit>(`/brand-kit/reference-images/${index}`, { method: "DELETE" }),
    onSuccess: (data) => queryClient.setQueryData(BRAND_KIT_KEY, data),
  });
}
