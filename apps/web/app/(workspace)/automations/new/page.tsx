"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TriggerSelector } from "@/components/automations/TriggerSelector";
import { FlowStepEditor } from "@/components/automations/FlowStepEditor";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateAutomation } from "@/hooks/useAutomations";
import type { AutomationStep, AutomationTrigger } from "@/hooks/useAutomations";

const EMPTY_TRIGGER: AutomationTrigger = { triggerType: "comment", matchValue: "", socialAccountId: "" };

export default function NewAutomationPage(): JSX.Element {
  const router = useRouter();
  const createMutation = useCreateAutomation();

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>(EMPTY_TRIGGER);
  const [steps, setSteps] = useState<AutomationStep[]>([
    { stepOrder: 1, stepType: "send_dm", payload: { text: "" } },
  ]);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    name.trim().length > 0 &&
    trigger.socialAccountId.length > 0 &&
    trigger.matchValue.trim().length > 0 &&
    steps.length > 0;

  function handleSave(): void {
    setError(null);
    createMutation.mutate(
      { name, trigger, steps: steps.map(({ stepType, payload }) => ({ stepType, payload })) },
      {
        onSuccess: (flow) => router.push(`/automations/${flow.id}`),
        onError: (err) => setError(extractApiErrorMessage(err, "Não foi possível criar o fluxo.")),
      },
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Novo fluxo de automação</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Escolha o gatilho, adicione os passos em sequência e salve.
        </p>
      </div>

      <Card className="space-y-3">
        <label className="mb-1 block text-xs text-neutral-500">Nome do fluxo</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Responder dúvidas de preço" />
      </Card>

      <Card>
        <TriggerSelector value={trigger} onChange={setTrigger} />
      </Card>

      <Card>
        <FlowStepEditor steps={steps} onChange={setSteps} />
      </Card>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}

      <Button type="button" onClick={handleSave} disabled={!isValid || createMutation.isPending}>
        {createMutation.isPending ? "Salvando..." : "Salvar fluxo"}
      </Button>
    </main>
  );
}
