"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpsellCard } from "@/components/automations/UpsellCard";
import { useAddons } from "@/hooks/useAddons";
import { useAutomations } from "@/hooks/useAutomations";

const ADDON_KEY = "instagram_automation";

export default function AutomationsPage(): JSX.Element {
  const { data: addons, isLoading: isLoadingAddons, isError: isAddonsError } = useAddons();
  const addon = addons?.find((a) => a.key === ADDON_KEY);
  const hasAddon = addon?.status === "active";

  // CA-05: sempre consulta os fluxos existentes (mesmo sem o add-on ativo)
  // porque a UI de upsell precisa saber se há fluxos desativados para exibir
  // o aviso de "recontrate para reativar" — o backend só bloqueia CRUD via
  // AddonGuard, não a leitura pela tela de upsell (aqui simplesmente não chamamos
  // /automations quando não tem o add-on, então o aviso vem só do status do add-on).

  if (isLoadingAddons) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  if (isAddonsError || !addon) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-danger">Não foi possível carregar as informações do add-on.</p>
      </main>
    );
  }

  if (!hasAddon) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">Automação de Instagram</h1>
        </div>
        <UpsellCard addon={addon} />
      </main>
    );
  }

  return <AutomationsList />;
}

function AutomationsList(): JSX.Element {
  const { data: flows, isLoading, isError } = useAutomations();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Automação de Instagram</h1>
          <p className="mt-1 text-sm text-neutral-600">Fluxos de resposta automática a comentários e mensagens diretas.</p>
        </div>
        <Link href="/automations/new">
          <Button type="button">+ Novo fluxo</Button>
        </Link>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar as automações.</p>}

      {!isLoading && flows?.length === 0 && (
        <Card>
          <p className="text-sm text-neutral-600">Nenhum fluxo criado ainda. Crie o primeiro com &quot;+ Novo fluxo&quot;.</p>
        </Card>
      )}

      <div className="space-y-2">
        {flows?.map((flow) => (
          <Link key={flow.id} href={`/automations/${flow.id}`}>
            <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{flow.name}</h3>
                  <Badge variant={flow.isActive ? "success" : "neutral"}>{flow.isActive ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {flow.steps.length} passo{flow.steps.length === 1 ? "" : "s"} · {flow.stats.total} disparo
                  {flow.stats.total === 1 ? "" : "s"}
                  {flow.stats.successRate !== null ? ` · ${flow.stats.successRate}% de sucesso` : ""}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
