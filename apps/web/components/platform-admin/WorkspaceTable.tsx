"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useImpersonateWorkspace,
  useReactivateWorkspace,
  type WorkspaceSummary,
} from "@/hooks/usePlatformAdmin";
import { SuspendConfirmModal } from "./SuspendConfirmModal";

interface WorkspaceTableProps {
  workspaces: WorkspaceSummary[];
}

const STATUS_VARIANT: Record<string, "success" | "danger" | "neutral"> = {
  active: "success",
  suspended: "danger",
};

const BILLING_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  past_due: "warning",
  cancelled: "danger",
};

export function WorkspaceTable({ workspaces }: WorkspaceTableProps): JSX.Element {
  const reactivateMutation = useReactivateWorkspace();
  const impersonateMutation = useImpersonateWorkspace();
  const [pendingSuspend, setPendingSuspend] = useState<WorkspaceSummary | null>(null);
  const [impersonationResult, setImpersonationResult] = useState<{ workspaceName: string; token: string } | null>(null);
  const [impersonationError, setImpersonationError] = useState<string | null>(null);

  function handleImpersonate(ws: WorkspaceSummary): void {
    setImpersonationError(null);
    impersonateMutation.mutate(ws.id, {
      onSuccess: (data) => setImpersonationResult({ workspaceName: ws.name, token: data.token }),
      onError: (err) => setImpersonationError(extractApiErrorMessage(err, "Não foi possível gerar o modo suporte.")),
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-100">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-3">Workspace</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Plano</th>
            <th className="px-4 py-3">Billing</th>
            <th className="px-4 py-3">Contas conectadas</th>
            <th className="px-4 py-3">Posts no mês</th>
            <th className="px-4 py-3">Última rodada autopilot</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {workspaces.map((ws) => (
            <tr key={ws.id} className="border-t border-neutral-100">
              <td className="px-4 py-3 font-medium">{ws.name}</td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[ws.status] ?? "neutral"}>{ws.status}</Badge>
              </td>
              <td className="px-4 py-3">{ws.planType}</td>
              <td className="px-4 py-3">
                {ws.billingStatus ? (
                  <Badge variant={BILLING_VARIANT[ws.billingStatus] ?? "neutral"}>{ws.billingStatus}</Badge>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">{ws.connectedSocialAccounts}</td>
              <td className="px-4 py-3">{ws.publishedThisMonth}</td>
              <td className="px-4 py-3 text-neutral-600">
                {ws.autopilotLastRunAt ? new Date(ws.autopilotLastRunAt).toLocaleString("pt-BR") : "nunca"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {ws.status === "suspended" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => reactivateMutation.mutate(ws.id)}
                      disabled={reactivateMutation.isPending}
                    >
                      Reativar
                    </Button>
                  ) : (
                    <Button variant="destructive" size="sm" type="button" onClick={() => setPendingSuspend(ws)}>
                      Suspender
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => handleImpersonate(ws)}
                    disabled={impersonateMutation.isPending}
                  >
                    Modo suporte
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pendingSuspend && (
        <SuspendConfirmModal
          workspaceName={pendingSuspend.name}
          workspaceId={pendingSuspend.id}
          onDone={() => setPendingSuspend(null)}
          onCancel={() => setPendingSuspend(null)}
        />
      )}

      {impersonationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-5">
            <p className="text-sm text-danger">{impersonationError}</p>
            <Button variant="secondary" type="button" onClick={() => setImpersonationError(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      {impersonationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg space-y-3 rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">Modo suporte — {impersonationResult.workspaceName}</h2>
            <p className="text-sm text-neutral-600">
              Token de sessão temporário (15 min), já registrado em auditoria. Válido só para este workspace.
            </p>
            <textarea
              readOnly
              value={impersonationResult.token}
              className="h-24 w-full rounded-lg border border-neutral-200 p-2 text-xs"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button variant="secondary" type="button" onClick={() => setImpersonationResult(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
