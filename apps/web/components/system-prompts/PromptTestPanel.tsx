"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import type { PromptTestResult } from "@/hooks/useSystemPrompts";

// CA-04: só chama o backend dedicado de teste (PromptTestService) — nunca os
// endpoints reais de geração, nunca cria content_piece/image_generation_job.
// A mutation vem de fora (página pai) em vez de criar a própria aqui, pra
// que a página consiga saber quando um teste teve sucesso (item 2 do spec:
// só libera "Salvar" depois de um teste bem-sucedido no rascunho atual).
export function PromptTestPanel({
  draftContent,
  onTest,
  isPending,
  isError,
  error,
  data,
}: {
  draftContent: string;
  onTest: (content: string) => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: PromptTestResult | undefined;
}): JSX.Element {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Testar</h3>
        <Button type="button" size="sm" disabled={isPending || !draftContent.trim()} onClick={() => onTest(draftContent)}>
          {isPending ? "Testando..." : "Testar rascunho"}
        </Button>
      </div>
      <p className="text-xs text-neutral-500">
        Roda uma geração real com dados de exemplo fixos — nunca afeta workspaces, publicações ou imagens reais.
      </p>

      {isError && <p className="text-sm text-danger">{extractApiErrorMessage(error, "Falha ao testar o prompt.")}</p>}

      {data && (
        <div className="space-y-1 rounded-lg bg-neutral-50 p-3">
          <p className="text-xs text-neutral-500">{data.note}</p>
          <pre className="whitespace-pre-wrap break-words text-xs text-neutral-900">{data.output}</pre>
        </div>
      )}
    </Card>
  );
}
