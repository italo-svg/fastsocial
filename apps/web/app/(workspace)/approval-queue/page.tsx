"use client";

import { useMemo, useState } from "react";
import { ApprovalCard } from "@/components/approval-queue/ApprovalCard";
import { useApprovalQueue } from "@/hooks/useApprovalQueue";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useAuthStore } from "@/stores/auth.store";

const NETWORK_FILTERS = [
  { value: "", label: "Todas as redes" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

const ORIGIN_FILTERS = [
  { value: "", label: "Todas as origens" },
  { value: "manual", label: "Manual" },
  { value: "autopilot", label: "Piloto automático" },
];

export default function ApprovalQueuePage(): JSX.Element {
  const { data: pieces, isLoading } = useApprovalQueue();
  const { data: authMe } = useAuthMe();
  const activeWorkspaceId = useAuthStore((s) => s.activeWorkspaceId);
  const [originFilter, setOriginFilter] = useState("");

  const currentRole = authMe?.workspaces.find((w) => w.id === activeWorkspaceId)?.role;
  const canModerate = currentRole !== "viewer";

  const filteredPieces = useMemo(
    () => (pieces ?? []).filter((p) => !originFilter || p.origin === originFilter),
    [pieces, originFilter],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Fila de Aprovação</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Peças aguardando decisão antes de seguir para agendamento. Aprovar não agenda automaticamente.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
        >
          {ORIGIN_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          disabled
          title="Filtro por rede-destino chega quando publicações tiverem rede associada (Fase 6)"
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-400 outline-none"
        >
          {NETWORK_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}

      {!isLoading && filteredPieces.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 p-10 text-center">
          <p className="text-sm font-medium">Nenhuma peça aguardando aprovação.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPieces.map((piece) => (
          <ApprovalCard key={piece.id} piece={piece} canModerate={canModerate} />
        ))}
      </div>
    </main>
  );
}
