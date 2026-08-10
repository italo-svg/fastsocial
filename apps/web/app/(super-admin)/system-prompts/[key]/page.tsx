"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VersionHistoryList } from "@/components/system-prompts/VersionHistoryList";
import { PromptTestPanel } from "@/components/system-prompts/PromptTestPanel";
import { useAuthMe } from "@/hooks/useAuthMe";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  usePromptVersions,
  useRollbackPrompt,
  useSystemPrompt,
  useTestPrompt,
  useUpdatePrompt,
} from "@/hooks/useSystemPrompts";

export default function SystemPromptEditorPage(): JSX.Element {
  const params = useParams<{ key: string }>();
  const key = params.key;
  const router = useRouter();
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();

  const { data: prompt, isLoading, isError } = useSystemPrompt(key);
  const { data: versions } = usePromptVersions(key);
  const updatePrompt = useUpdatePrompt(key);
  const rollbackPrompt = useRollbackPrompt(key);
  const testPrompt = useTestPrompt(key);

  const [draftContent, setDraftContent] = useState("");
  const [lastTestedContent, setLastTestedContent] = useState<string | null>(null);

  useEffect(() => {
    if (prompt) setDraftContent(prompt.content);
  }, [prompt]);

  useEffect(() => {
    if (testPrompt.isSuccess) setLastTestedContent(draftContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testPrompt.isSuccess, testPrompt.data]);

  if (isLoadingAuth) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  if (!authMe?.user.isPlatformSuperAdmin) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-danger">Acesso restrito ao super admin da plataforma.</p>
      </main>
    );
  }

  // Item 2 do spec: só salva depois de testar o rascunho ATUAL (se editar
  // depois de testar, precisa testar de novo — soft constraint de UX, não
  // bloqueio de backend).
  const canSave = draftContent.trim().length > 0 && draftContent === lastTestedContent;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/system-prompts" className="text-xs text-neutral-500 underline">
          ← Prompts do Sistema
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{key}</h1>
        {prompt && <p className="mt-1 text-sm text-neutral-600">Versão atual: v{prompt.currentVersion || "—"}</p>}
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar este prompt.</p>}

      {prompt && (
        <>
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold">Conteúdo</h3>
            <Textarea
              rows={10}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Conteúdo do prompt..."
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                disabled={!canSave || updatePrompt.isPending}
                onClick={() =>
                  updatePrompt.mutate(draftContent, {
                    onSuccess: () => setLastTestedContent(null),
                  })
                }
              >
                {updatePrompt.isPending ? "Salvando..." : "Salvar nova versão"}
              </Button>
              {!canSave && (
                <span className="text-xs text-neutral-500">
                  {draftContent === prompt.content ? "Sem alterações." : "Teste o rascunho antes de salvar."}
                </span>
              )}
            </div>
            {updatePrompt.isError && (
              <p className="text-sm text-danger">{extractApiErrorMessage(updatePrompt.error, "Falha ao salvar.")}</p>
            )}
            {updatePrompt.isSuccess && <p className="text-sm text-success">Nova versão salva com sucesso.</p>}
          </Card>

          <PromptTestPanel
            draftContent={draftContent}
            onTest={(content) => testPrompt.mutate(content)}
            isPending={testPrompt.isPending}
            isError={testPrompt.isError}
            error={testPrompt.error}
            data={testPrompt.data}
          />

          <VersionHistoryList
            versions={versions ?? []}
            currentVersion={prompt.currentVersion}
            isRollingBack={rollbackPrompt.isPending}
            onRollback={(version) =>
              rollbackPrompt.mutate(version, {
                onSuccess: (updated) => {
                  setDraftContent(updated.content);
                  setLastTestedContent(null);
                },
              })
            }
          />
        </>
      )}
    </main>
  );
}
