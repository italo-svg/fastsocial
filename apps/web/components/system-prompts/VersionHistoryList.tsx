"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SystemPromptVersion } from "@/hooks/useSystemPrompts";

// Diff simples (item 3 do spec): so' o texto adicionado desde a versao
// anterior, sem lib de diff — suficiente pra "o que mudou de uma vez pra
// outra" sem trazer uma dependencia so pra isso.
function simpleDiffNote(current: string, previous: string | undefined): string {
  if (!previous) return "Versão inicial.";
  if (current === previous) return "Sem alteração de conteúdo.";
  const lengthDelta = current.length - previous.length;
  return lengthDelta >= 0 ? `+${lengthDelta} caracteres em relação à versão anterior.` : `${lengthDelta} caracteres em relação à versão anterior.`;
}

export function VersionHistoryList({
  versions,
  currentVersion,
  onRollback,
  isRollingBack,
}: {
  versions: SystemPromptVersion[];
  currentVersion: number;
  onRollback: (version: number) => void;
  isRollingBack: boolean;
}): JSX.Element {
  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Histórico de versões</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-neutral-600">Nenhuma versão registrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((version, index) => {
            const previous = sorted[index + 1];
            const isCurrent = version.version === currentVersion;
            return (
              <li key={version.id} className="flex items-start justify-between gap-3 border-t border-[var(--card-border)] pt-2 first:border-none first:pt-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">v{version.version}</span>
                    {isCurrent && <span className="text-xs text-primary">(atual)</span>}
                    <span className="text-xs text-neutral-500">{new Date(version.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-600">{version.content.slice(0, 80)}</p>
                  <p className="mt-1 text-xs text-neutral-400">{simpleDiffNote(version.content, previous?.content)}</p>
                </div>
                {!isCurrent && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isRollingBack}
                    onClick={() => onRollback(version.version)}
                  >
                    Reverter para esta
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
