"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSuspendWorkspace } from "@/hooks/usePlatformAdmin";

interface SuspendConfirmModalProps {
  workspaceId: string;
  workspaceName: string;
  onDone: () => void;
  onCancel: () => void;
}

export function SuspendConfirmModal({ workspaceId, workspaceName, onDone, onCancel }: SuspendConfirmModalProps): JSX.Element {
  const suspendMutation = useSuspendWorkspace();

  function handleConfirm(): void {
    suspendMutation.mutate(workspaceId, { onSuccess: onDone });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Suspender {workspaceName}?</h2>
        <p className="text-sm text-neutral-600">
          Bloqueia imediatamente todas as operações de negócio do workspace (incluindo o piloto automático) até ser
          reativado. Os membros verão um erro claro pedindo para contatar o suporte.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={suspendMutation.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" type="button" onClick={handleConfirm} disabled={suspendMutation.isPending}>
            {suspendMutation.isPending ? "Suspendendo..." : "Suspender"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
