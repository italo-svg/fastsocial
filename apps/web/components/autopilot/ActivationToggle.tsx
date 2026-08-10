"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useToggleAutopilot } from "@/hooks/useAutopilot";

interface ActivationToggleProps {
  isActive: boolean;
}

// Card de status reusável (verde=ativo, âmbar=pausado, vermelho=falha ao
// tentar ativar) — PRD Seção 5.1. Ativar pede confirmação porque pode falhar
// por pré-requisito (spec 036 CA-02) e o usuário precisa entender o motivo
// antes de tentar de novo; desativar nunca falha, então é sempre 1 clique
// direto (CA-05).
export function ActivationToggle({ isActive }: ActivationToggleProps): JSX.Element {
  const toggleMutation = useToggleAutopilot();
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleDeactivate(): void {
    setErrorMessage(null);
    toggleMutation.mutate(false);
  }

  function handleConfirmActivate(): void {
    toggleMutation.mutate(true, {
      onSuccess: () => {
        setErrorMessage(null);
        setConfirming(false);
      },
      onError: (err) => {
        setErrorMessage(extractApiErrorMessage(err, "Não foi possível ativar o piloto automático."));
        setConfirming(false);
      },
    });
  }

  const badgeVariant = errorMessage ? "danger" : isActive ? "success" : "warning";
  const badgeLabel = errorMessage ? "Erro ao ativar" : isActive ? "Ativo" : "Pausado";

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Status do piloto automático</h2>
          <Badge variant={badgeVariant} className="mt-1">
            {badgeLabel}
          </Badge>
        </div>

        {isActive ? (
          <Button variant="secondary" type="button" onClick={handleDeactivate} disabled={toggleMutation.isPending}>
            {toggleMutation.isPending ? "Desativando..." : "Desativar"}
          </Button>
        ) : (
          <Button variant="primary" type="button" onClick={() => setConfirming(true)} disabled={toggleMutation.isPending}>
            Ativar
          </Button>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{errorMessage}</p>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Ativar o piloto automático?</h2>
            <p className="text-sm text-neutral-600">
              A partir de agora, o FastSocial vai pesquisar, gerar e (conforme sua configuração de aprovação) publicar
              conteúdo sozinho para este workspace, na cadência configurada abaixo.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setConfirming(false)}
                disabled={toggleMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirmActivate} disabled={toggleMutation.isPending}>
                {toggleMutation.isPending ? "Ativando..." : "Confirmar ativação"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
