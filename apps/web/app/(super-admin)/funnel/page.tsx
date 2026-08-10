"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FunnelChart } from "@/components/funnel/FunnelChart";
import { UtmBreakdownTable } from "@/components/funnel/UtmBreakdownTable";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useFunnel, useFunnelByUtm } from "@/hooks/useFunnelAnalytics";

type UtmGroupBy = "source" | "medium" | "campaign";

export default function FunnelPage(): JSX.Element {
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupBy, setGroupBy] = useState<UtmGroupBy>("source");

  const { data: funnelData, isLoading, isError } = useFunnel(from || undefined, to || undefined);
  const { data: utmData, isLoading: isLoadingUtm } = useFunnelByUtm(groupBy);

  if (isLoadingAuth) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  // CA-04: mesma checagem de UX do resto do painel super admin (specs 041/045).
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
        <h1 className="text-xl font-semibold">Funil & UTM</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Conversão etapa a etapa e origem dos usuários que mais convertem.
        </p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-600">De</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-600">Até</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      {isLoading && <p className="text-sm text-neutral-600">Carregando funil...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar o funil.</p>}
      {funnelData && <FunnelChart stages={funnelData.stages} />}

      <Card className="flex items-center gap-2">
        <span className="text-xs text-neutral-600">Agrupar quebra de UTM por:</span>
        {(["source", "medium", "campaign"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setGroupBy(option)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              groupBy === option ? "bg-primary text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {option}
          </button>
        ))}
      </Card>

      {isLoadingUtm && <p className="text-sm text-neutral-600">Carregando quebra de UTM...</p>}
      {utmData && <UtmBreakdownTable rows={utmData.rows} groupBy={groupBy} />}
    </main>
  );
}
