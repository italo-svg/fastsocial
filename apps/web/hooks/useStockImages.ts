"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface StockImage {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  attribution: string;
  provider: string;
}

export interface StockImagesStatus {
  configured: boolean;
  provider: string | null;
}

export function useStockImagesStatus() {
  return useQuery({
    queryKey: ["image-sources", "status"],
    queryFn: () => apiFetch<StockImagesStatus>("/image-sources/status"),
  });
}

export function useStockImageSearch(query: string) {
  return useQuery({
    queryKey: ["image-sources", "stock", query],
    queryFn: () => apiFetch<StockImage[]>(`/image-sources/stock?query=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
  });
}
