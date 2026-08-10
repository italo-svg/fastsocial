"use client";

import { Card } from "@/components/ui/card";
import type { UtmBreakdownRow } from "@/hooks/useFunnelAnalytics";

// Ordenada por taxa de conversão desc — já vem assim da API (CA-03), aqui só renderiza.
export function UtmBreakdownTable({
  rows,
  groupBy,
}: {
  rows: UtmBreakdownRow[];
  groupBy: "source" | "medium" | "campaign";
}): JSX.Element {
  const groupLabel = { source: "Origem (utm_source)", medium: "Mídia (utm_medium)", campaign: "Campanha (utm_campaign)" }[
    groupBy
  ];

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">Quebra por UTM</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhum evento com UTM registrado ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500">
              <th className="pb-2">{groupLabel}</th>
              <th className="pb-2 text-right">Visitantes (1ª etapa)</th>
              <th className="pb-2 text-right">Convertidos (última etapa)</th>
              <th className="pb-2 text-right">Taxa de conversão</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const firstStageCount = row.stages["landing_viewed"] ?? 0;
              const lastStageCount = row.stages["trial_converted_to_paid"] ?? 0;
              return (
                <tr key={row.value} className="border-t border-[var(--card-border)]">
                  <td className="py-2 font-medium">{row.value}</td>
                  <td className="py-2 text-right">{firstStageCount}</td>
                  <td className="py-2 text-right">{lastStageCount}</td>
                  <td className="py-2 text-right">{row.conversionRate != null ? `${row.conversionRate}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
