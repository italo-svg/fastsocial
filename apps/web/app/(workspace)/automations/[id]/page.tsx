"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TriggerSelector } from "@/components/automations/TriggerSelector";
import { FlowStepEditor } from "@/components/automations/FlowStepEditor";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useAutomationDetail, useUpdateAutomation } from "@/hooks/useAutomations";
import type { AutomationStep, AutomationTrigger } from "@/hooks/useAutomations";

const RUN_STATUS_LABELS: Record<string, string> = { completed: "Concluído", failed: "Falhou", running: "Em execução" };
const RUN_STATUS_VARIANTS: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  completed: "success",
  failed: "danger",
  running: "warning",
};

export default function AutomationDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: flow, isLoading, isError } = useAutomationDetail(id);
  const updateMutation = useUpdateAutomation(id);

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger | null>(null);
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!flow) return;
    setName(flow.name);
    setTrigger(flow.trigger);
    setSteps(flow.steps);
  }, [flow]);

  if (isLoading || !flow || !trigger) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-danger">Não foi possível carregar este fluxo.</p>
      </main>
    );
  }

  function handleSave(): void {
    if (!trigger) return;
    setError(null);
    setSaved(false);
    updateMutation.mutate(
      { name, trigger, steps: steps.map(({ stepType, payload }) => ({ stepType, payload })) },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(extractApiErrorMessage(err, "Não foi possível salvar as alterações.")),
      },
    );
  }

  function toggleActive(): void {
    if (!flow) return;
    setError(null);
    updateMutation.mutate(
      { isActive: !flow.isActive },
      { onError: (err) => setError(extractApiErrorMessage(err, "Não foi possível alterar o status.")) },
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{flow.name}</h1>
            <Badge variant={flow.isActive ? "success" : "neutral"}>{flow.isActive ? "Ativo" : "Inativo"}</Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-600">Criado em {new Date(flow.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
        <Button type="button" variant="secondary" onClick={toggleActive} disabled={updateMutation.isPending}>
          {flow.isActive ? "Desativar" : "Ativar"}
        </Button>
      </div>

      {/* CA-03: estatísticas direto de automation_runs, sem tooltip nem cálculo no client. */}
      <Card className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold">{flow.stats.total}</p>
          <p className="text-xs text-neutral-500">Disparos</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">{flow.stats.successRate !== null ? `${flow.stats.successRate}%` : "—"}</p>
          <p className="text-xs text-neutral-500">Taxa de sucesso</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">{flow.stats.failed}</p>
          <p className="text-xs text-neutral-500">Falhas</p>
        </div>
      </Card>

      {flow.stats.recentRuns && flow.stats.recentRuns.length > 0 && (
        <Card className="space-y-2">
          <h3 className="text-sm font-semibold">Últimos disparos</h3>
          <div className="space-y-1">
            {flow.stats.recentRuns.map((run, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">{new Date(run.executedAt).toLocaleString("pt-BR")}</span>
                <div className="flex items-center gap-2">
                  {run.errorMessage && <span className="text-xs text-danger">{run.errorMessage}</span>}
                  <Badge variant={RUN_STATUS_VARIANTS[run.status] ?? "neutral"}>
                    {RUN_STATUS_LABELS[run.status] ?? run.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <label className="mb-1 block text-xs text-neutral-500">Nome do fluxo</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Card>

      <Card>
        <TriggerSelector value={trigger} onChange={setTrigger} />
      </Card>

      <Card>
        <FlowStepEditor steps={steps} onChange={setSteps} />
      </Card>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">Alterações salvas.</p>}

      <Button type="button" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </main>
  );
}
