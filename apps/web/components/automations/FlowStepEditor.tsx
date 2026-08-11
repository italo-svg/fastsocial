"use client";

import { Button } from "@/components/ui/button";
import type { AutomationStep, StepType } from "@/hooks/useAutomations";

const STEP_LABELS: Record<StepType, string> = {
  send_dm: "Enviar mensagem direta",
  send_quick_replies: "Enviar respostas rápidas",
  wait: "Aguardar",
  tag_contact: "Marcar contato com tag",
};

function defaultPayload(stepType: StepType): Record<string, unknown> {
  switch (stepType) {
    case "send_dm":
      return { text: "" };
    case "send_quick_replies":
      return { text: "", options: ["", ""] };
    case "wait":
      return { seconds: 60 };
    case "tag_contact":
      return { tag: "" };
  }
}

interface FlowStepEditorProps {
  steps: AutomationStep[];
  onChange: (steps: AutomationStep[]) => void;
}

const selectClass = "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none";
const inputClass = "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none";

export function FlowStepEditor({ steps, onChange }: FlowStepEditorProps): JSX.Element {
  function updateStep(index: number, patch: Partial<AutomationStep>): void {
    const next = steps.map((step, i) => (i === index ? { ...step, ...patch } : step));
    onChange(next);
  }

  function updatePayload(index: number, payload: Record<string, unknown>): void {
    updateStep(index, { payload });
  }

  function addStep(): void {
    onChange([...steps, { stepOrder: steps.length + 1, stepType: "send_dm", payload: defaultPayload("send_dm") }]);
  }

  function removeStep(index: number): void {
    onChange(steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, stepOrder: i + 1 })));
  }

  function moveStep(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((step, i) => ({ ...step, stepOrder: i + 1 })));
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Passos</h3>

      {/* CA-04: aviso sempre visível no corpo da tela, nunca dentro de tooltip/hover. */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Janela de 24h da Meta:</strong> o Instagram só permite enviar mensagens diretas automáticas em até 24h
        após a última interação do contato. Passos de "Aguardar" longos podem ultrapassar essa janela e a mensagem
        seguinte falhará — planeje seus tempos de espera considerando esse limite.
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="rounded-lg border border-neutral-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-500">Passo {index + 1}</span>
              <div className="flex items-center gap-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => moveStep(index, -1)} disabled={index === 0}>
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === steps.length - 1}
                >
                  ↓
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => removeStep(index)}>
                  Remover
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <select
                value={step.stepType}
                onChange={(e) => {
                  const stepType = e.target.value as StepType;
                  updateStep(index, { stepType, payload: defaultPayload(stepType) });
                }}
                className={selectClass}
              >
                {(Object.keys(STEP_LABELS) as StepType[]).map((type) => (
                  <option key={type} value={type}>
                    {STEP_LABELS[type]}
                  </option>
                ))}
              </select>

              {step.stepType === "send_dm" && (
                <textarea
                  value={(step.payload.text as string) ?? ""}
                  onChange={(e) => updatePayload(index, { ...step.payload, text: e.target.value })}
                  placeholder="Texto da mensagem"
                  rows={2}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none"
                />
              )}

              {step.stepType === "send_quick_replies" && (
                <div className="space-y-2">
                  <textarea
                    value={(step.payload.text as string) ?? ""}
                    onChange={(e) => updatePayload(index, { ...step.payload, text: e.target.value })}
                    placeholder="Texto da mensagem"
                    rows={2}
                    className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none"
                  />
                  {((step.payload.options as string[]) ?? []).map((option, optionIndex) => (
                    <input
                      key={optionIndex}
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const options = [...((step.payload.options as string[]) ?? [])];
                        options[optionIndex] = e.target.value;
                        updatePayload(index, { ...step.payload, options });
                      }}
                      placeholder={`Opção ${optionIndex + 1}`}
                      className={inputClass}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      updatePayload(index, {
                        ...step.payload,
                        options: [...((step.payload.options as string[]) ?? []), ""],
                      })
                    }
                  >
                    + Opção
                  </Button>
                </div>
              )}

              {step.stepType === "wait" && (
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Tempo de espera (segundos)</label>
                  <input
                    type="number"
                    min={0}
                    value={(step.payload.seconds as number) ?? 0}
                    onChange={(e) => updatePayload(index, { ...step.payload, seconds: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              )}

              {step.stepType === "tag_contact" && (
                <input
                  type="text"
                  value={(step.payload.tag as string) ?? ""}
                  onChange={(e) => updatePayload(index, { ...step.payload, tag: e.target.value })}
                  placeholder="Nome da tag"
                  className={inputClass}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={addStep}>
        + Adicionar passo
      </Button>
    </div>
  );
}
