"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkspaceTable } from "@/components/platform-admin/WorkspaceTable";
import { ProvisionWorkspaceModal } from "@/components/platform-admin/ProvisionWorkspaceModal";
import { useAuthMe } from "@/hooks/useAuthMe";
import { usePlatformWorkspaces } from "@/hooks/usePlatformAdmin";

export default function MasterPanelPage(): JSX.Element {
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();
  const { data: workspaces, isLoading, isError } = usePlatformWorkspaces();
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  if (isLoadingAuth) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  // CA-02: mesma checagem que a API já faz (PlatformAdminGuard) — aqui é só
  // UX (evitar mostrar a tabela e disparar chamadas que vão dar 403), a
  // segurança real está no backend, não nesta condicional.
  if (!authMe?.user.isPlatformSuperAdmin) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-sm text-danger">Acesso restrito ao super admin da plataforma.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Painel Mestre</h1>
          <p className="mt-1 text-sm text-neutral-600">Todos os workspaces da plataforma.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/system-health" className="text-sm font-medium text-primary underline">
            Saúde do Sistema
          </Link>
          <Button type="button" onClick={() => setShowProvisionModal(true)}>
            + Provisionar workspace
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar os workspaces.</p>}

      {!isLoading && !isError && <WorkspaceTable workspaces={workspaces ?? []} />}

      {showProvisionModal && (
        <ProvisionWorkspaceModal
          onDone={() => setShowProvisionModal(false)}
          onCancel={() => setShowProvisionModal(false)}
        />
      )}
    </main>
  );
}
