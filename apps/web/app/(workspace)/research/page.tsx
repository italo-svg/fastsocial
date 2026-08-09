"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { InsightCard } from "@/components/research/InsightCard";
import { ScanButton } from "@/components/research/ScanButton";
import { useResearchInsights } from "@/hooks/useResearchInsights";
import { useBrandKit } from "@/hooks/useBrandKit";

const SOURCE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas as origens" },
  { value: "competitor", label: "Concorrente" },
  { value: "hashtag_trend", label: "Tendência de hashtag" },
  { value: "topic_trend", label: "Tendência de tema" },
  { value: "manual", label: "Manual" },
];

export default function ResearchPage(): JSX.Element {
  const { data: insights, isLoading } = useResearchInsights();
  const { data: brandKit } = useBrandKit();
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");

  const brandKitIncomplete = !brandKit?.niche;

  const filteredInsights = useMemo(() => {
    return (insights ?? [])
      .filter((i) => !sourceFilter || i.sourceType === sourceFilter)
      .filter((i) => !search.trim() || i.summary.toLowerCase().includes(search.toLowerCase()));
  }, [insights, sourceFilter, search]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pesquisa & Tendências</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Insights de concorrentes e tendências para basear seu próximo post.
          </p>
        </div>
        <ScanButton
          disabled={brandKitIncomplete}
          disabledReason="Complete o nicho da marca no brand kit antes de pesquisar."
        />
      </div>

      {brandKitIncomplete && (
        <p className="text-sm text-warning">
          Complete o onboarding (nicho da marca) para poder disparar pesquisas automáticas.
        </p>
      )}

      <p className="text-xs text-neutral-600">
        Nenhuma fonte de pesquisa automática configurada ainda? Nesse caso o botão "Pesquisar agora" roda
        normalmente, mas pode não trazer insights novos — você sempre pode criar um insight manual a partir
        de um briefing direto no editor de conteúdo.
      </p>

      <div className="flex flex-wrap gap-3">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
        >
          {SOURCE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <Input
          placeholder="Buscar por tema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}

      {!isLoading && filteredInsights.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-200 p-10 text-center">
          <p className="text-sm font-medium">Nenhum insight ainda.</p>
          <p className="max-w-sm text-sm text-neutral-600">
            Pesquise concorrentes e tendências relevantes para o seu nicho — ou crie um insight manual a
            partir de um briefing direto no editor de conteúdo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </main>
  );
}
