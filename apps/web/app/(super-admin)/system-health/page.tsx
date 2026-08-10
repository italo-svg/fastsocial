"use client";

import { useEffect, useState } from "react";
import { StatusCard } from "@/components/system-health/StatusCard";
import { RecentErrorsList } from "@/components/system-health/RecentErrorsList";
import { QueueBacklogWidget } from "@/components/system-health/QueueBacklogWidget";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useSystemHealth } from "@/hooks/useSystemHealth";

function useSecondsSince(timestamp: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((now - timestamp) / 1000));
}

export default function SystemHealthPage(): JSX.Element {
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();
  const { data, isLoading, isError, dataUpdatedAt } = useSystemHealth();
  const secondsSinceUpdate = useSecondsSince(dataUpdatedAt);

  if (isLoadingAuth) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  // CA-04: mesma checagem de UX que master-panel já faz — a segurança real é
  // o PlatformAdminGuard no backend, isto só evita disparar chamadas que
  // vão dar 403.
  if (!authMe?.user.isPlatformSuperAdmin) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-sm text-danger">Acesso restrito ao super admin da plataforma.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Saúde do Sistema</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Status de todos os serviços e integrações críticos do produto.
          {dataUpdatedAt > 0 && ` Atualizado há ${secondsSinceUpdate}s.`}
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar o status dos serviços.</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.services.map((service) => (
              <StatusCard key={service.name} service={service} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RecentErrorsList />
            <QueueBacklogWidget />
          </div>
        </>
      )}
    </main>
  );
}
