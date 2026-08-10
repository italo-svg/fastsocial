"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import type { FunnelStage } from "@/hooks/useFunnelAnalytics";

const STAGE_LABELS: Record<string, string> = {
  landing_viewed: "Visitou a landing",
  signup_started: "Iniciou cadastro",
  signup_completed: "Completou cadastro",
  email_confirmed: "Confirmou e-mail",
  onboarding_completed: "Completou onboarding",
  first_content_piece_created: "Criou 1º conteúdo",
  trial_converted_to_paid: "Virou cliente pago",
};

export function FunnelChart({ stages }: { stages: FunnelStage[] }): JSX.Element {
  const data = stages.map((stage) => ({
    etapa: STAGE_LABELS[stage.eventName] ?? stage.eventName,
    contagem: stage.count,
    pctOfPrevious: stage.pctOfPrevious,
    pctOfFirst: stage.pctOfFirst,
  }));

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">Funil de conversão</h3>
      {stages.every((s) => s.count === 0) ? (
        <p className="text-sm text-neutral-600">Sem dados de funil no período selecionado.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="etapa" width={160} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, _name, entry) => [
                  `${value} (${entry.payload.pctOfFirst != null ? `${entry.payload.pctOfFirst}% do início` : "início"})`,
                  "Pessoas",
                ]}
              />
              <Bar dataKey="contagem" fill="var(--primary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="pb-2">Etapa</th>
                <th className="pb-2 text-right">Pessoas</th>
                <th className="pb-2 text-right">% da etapa anterior</th>
                <th className="pb-2 text-right">% do início</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage.eventName} className="border-t border-[var(--card-border)]">
                  <td className="py-2">{STAGE_LABELS[stage.eventName] ?? stage.eventName}</td>
                  <td className="py-2 text-right">{stage.count}</td>
                  <td className="py-2 text-right">{stage.pctOfPrevious != null ? `${stage.pctOfPrevious}%` : "—"}</td>
                  <td className="py-2 text-right">{stage.pctOfFirst != null ? `${stage.pctOfFirst}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
