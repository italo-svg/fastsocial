"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { useMarkProductTourSeen, useProductTourStatus } from "@/hooks/useOnboardingTour";

// item 1 do spec 051: flag persistida por workspace (não localStorage), então
// o tour dispara uma única vez mesmo entre dispositivos/membros diferentes.
// Implementação própria simples (o spec permite): sequência de cards fixos
// com link pra cada área, em vez de spotlight sobre os elementos reais da
// navegação — evita instrumentar data-attributes em toda a UI existente só
// pra isto, mantendo o escopo do tour no que o spec realmente pede (apontar
// pras 5 áreas, uma vez, nunca mais).
const STEPS = [
  { title: "Acervo de Templates", description: "Comece por aqui: templates prontos pro seu nicho.", href: "/templates" },
  { title: "Pesquisa & Tendências", description: "Veja o que está em alta pra inspirar seu próximo post.", href: "/research" },
  { title: "Editor de Conteúdo", description: "Monte posts e carrosséis fiéis à sua marca.", href: "/content/new" },
  { title: "Piloto Automático", description: "Deixe o FastSocial gerar conteúdo no seu ritmo.", href: "/autopilot" },
  { title: "Central de Ajuda", description: "Dúvidas? A resposta provavelmente já está aqui.", href: "/help" },
];

export function ProductTour(): JSX.Element | null {
  const activeWorkspaceId = useAuthStore((s) => s.activeWorkspaceId);
  const { data: tourStatus, isLoading } = useProductTourStatus(activeWorkspaceId ?? undefined);
  const markSeen = useMarkProductTourSeen(activeWorkspaceId ?? undefined);
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !tourStatus || tourStatus.hasSeenProductTour || dismissed) return null;

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;

  function finish(): void {
    setDismissed(true);
    markSeen.mutate();
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <Card className="space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {stepIndex + 1}/{STEPS.length}
          </span>
          <button type="button" onClick={finish} className="text-xs text-neutral-400 hover:text-neutral-600">
            Pular tour
          </button>
        </div>
        <h3 className="text-sm font-semibold">{step.title}</h3>
        <p className="text-sm text-neutral-600">{step.description}</p>
        <div className="flex items-center justify-between">
          <Link href={step.href} className="text-xs font-medium text-primary underline">
            Ver agora →
          </Link>
          <Button type="button" size="sm" onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}>
            {isLast ? "Concluir" : "Próximo"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
