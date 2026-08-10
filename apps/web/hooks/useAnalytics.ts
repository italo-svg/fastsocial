"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";

export interface MetricTotals {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface TimeSeriesPoint extends MetricTotals {
  date: string;
}

export interface AnalyticsSummary {
  totals: MetricTotals;
  timeSeries: TimeSeriesPoint[];
}

export type RankingMetric = "reach" | "impressions" | "likes" | "comments" | "shares" | "saves";

export interface RankingItem {
  publicationId: string;
  contentPieceId: string;
  network: string;
  format: string;
  metric: RankingMetric;
  value: number;
  insightSummary: string | null;
  publishedAt: string;
}

export interface AnalyticsFilters {
  from: string;
  to: string;
  network?: string;
  format?: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.toString();
}

export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "summary", filters],
    queryFn: () => apiFetch<AnalyticsSummary>(`/analytics/summary?${buildQuery({ ...filters })}`),
  });
}

export function useAnalyticsRanking(filters: AnalyticsFilters, metric: RankingMetric, limit = 10) {
  return useQuery({
    queryKey: ["analytics", "ranking", filters, metric, limit],
    queryFn: () =>
      apiFetch<RankingItem[]>(`/analytics/ranking?${buildQuery({ ...filters, metric, limit: String(limit) })}`),
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

// CA-05: export.csv exige o mesmo header Authorization das outras chamadas —
// não dá pra usar um <a href> simples (sem cookie de sessão nesta API), então
// baixamos o blob via fetch autenticado e disparamos o download no client.
export async function downloadAnalyticsCsv(filters: AnalyticsFilters): Promise<void> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const activeWorkspaceId = useAuthStore.getState().activeWorkspaceId;
  const res = await fetch(`${API_URL}/api/v1/analytics/export.csv?${buildQuery({ ...filters })}`, {
    headers: {
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(activeWorkspaceId ? { "X-Workspace-Id": activeWorkspaceId } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Erro na API (${res.status}): ${await res.text()}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "analytics.csv";
  link.click();
  URL.revokeObjectURL(url);
}
