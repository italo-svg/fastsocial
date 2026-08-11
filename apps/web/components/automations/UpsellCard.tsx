"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useSubscribeAddon, type AddonStatus } from "@/hooks/useAddons";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

// CA-01: contratar o add-on entra na MESMA assinatura Stripe já existente do
// workspace (item novo, sem checkout hospedado separado) — a ativação real
// só acontece quando o webhook customer.subscription.updated confirma
// (spec 053), por isso mostramos "aguardando confirmação" em vez de assumir sucesso imediato.
export function UpsellCard({ addon }: { addon: AddonStatus }): JSX.Element {
  const subscribeMutation = useSubscribeAddon();
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  function handleSubscribe(): void {
    setError(null);
    subscribeMutation.mutate(addon.key, {
      onSuccess: () => setRequested(true),
      onError: (err) => setError(extractApiErrorMessage(err, "Não foi possível contratar o add-on.")),
    });
  }

  return (
    <Card className="mx-auto max-w-xl space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">🤖</div>
      <div>
        <h2 className="text-lg font-semibold">Automação de Instagram</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Responda automaticamente comentários e mensagens diretas do Instagram com fluxos de DM, respostas rápidas
          e tags de contato — sem precisar de outra ferramenta.
        </p>
      </div>

      <div className="rounded-lg bg-neutral-50 p-4">
        <p className="text-2xl font-semibold">{formatPrice(addon.priceMonthlyCents, addon.currency)}</p>
        <p className="text-xs text-neutral-500">por mês, cobrado junto com sua assinatura atual</p>
      </div>

      {addon.status === "cancelled" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-warning">
          Seu add-on foi cancelado, mas suas automações continuam salvas (desativadas). Reative para usá-las de novo.
        </p>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}

      {requested ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-success">
          Contratação enviada — confirmando pagamento. Isso pode levar alguns instantes; recarregue a página em breve.
        </p>
      ) : (
        <Button type="button" onClick={handleSubscribe} disabled={subscribeMutation.isPending} className="w-full">
          {subscribeMutation.isPending ? "Contratando..." : addon.status === "cancelled" ? "Reativar add-on" : "Contratar"}
        </Button>
      )}
    </Card>
  );
}
