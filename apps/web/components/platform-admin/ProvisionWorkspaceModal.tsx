"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useProvisionWorkspace } from "@/hooks/usePlatformAdmin";

interface ProvisionWorkspaceModalProps {
  onDone: () => void;
  onCancel: () => void;
}

export function ProvisionWorkspaceModal({ onDone, onCancel }: ProvisionWorkspaceModalProps): JSX.Element {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const provisionMutation = useProvisionWorkspace();

  function handleSubmit(): void {
    setError(null);
    provisionMutation.mutate(
      { name, email },
      {
        onSuccess: (data) => {
          setResult(
            data.mode === "direct"
              ? "Workspace criado e vinculado à conta existente desse e-mail."
              : "Workspace criado — como esse e-mail ainda não tem conta, um convite foi enviado.",
          );
        },
        onError: (err) => setError(extractApiErrorMessage(err, "Não foi possível provisionar o workspace.")),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Provisionar novo workspace</h2>

        {result ? (
          <>
            <p className="text-sm text-success">{result}</p>
            <Button
              type="button"
              onClick={() => {
                setResult(null);
                onDone();
              }}
            >
              Fechar
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome do workspace</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Loja da Ana" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail do dono</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={onCancel} disabled={provisionMutation.isPending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={provisionMutation.isPending || !name || !email}>
                {provisionMutation.isPending ? "Criando..." : "Criar workspace"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
