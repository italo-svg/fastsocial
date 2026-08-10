"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/analytics/FilterBar";
import { EngagementChart } from "@/components/analytics/EngagementChart";
import { RankingTable } from "@/components/analytics/RankingTable";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  downloadAnalyticsCsv,
  useAnalyticsRanking,
  useAnalyticsSummary,
  type AnalyticsFilters,
  type RankingMetric,
} from "@/hooks/useAnalytics";

function defaultFilters(): AnalyticsFilters {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function AnalyticsPage(): JSX.Element {
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [metric, setMetric] = useState<RankingMetric>("reach");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: summary, isLoading: isLoadingSummary } = useAnalyticsSummary(filters);
  const { data: ranking, isLoading: isLoadingRanking } = useAnalyticsRanking(filters, metric);

  async function handleExport(): Promise<void> {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadAnalyticsCsv(filters);
    } catch (err) {
      setExportError(extractApiErrorMessage(err, "Não foi possível exportar o CSV."));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Performance das publicações — filtre por período, rede e formato para ver o que está funcionando.
        </p>
      </div>

      <Card>
        <FilterBar filters={filters} onChange={setFilters} onExport={handleExport} isExporting={isExporting} />
        {exportError && <p className="mt-3 text-sm text-danger">{exportError}</p>}
      </Card>

      {isLoadingSummary ? (
        <p className="text-sm text-neutral-600">Carregando...</p>
      ) : (
        <EngagementChart
          timeSeries={summary?.timeSeries ?? []}
          totals={summary?.totals ?? { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0 }}
        />
      )}

      {!isLoadingRanking && <RankingTable items={ranking ?? []} metric={metric} onMetricChange={setMetric} />}
    </main>
  );
}
