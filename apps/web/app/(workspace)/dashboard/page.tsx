"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trackFunnelEvent } from "@/lib/analytics/track-funnel-event";

function DashboardPageInner(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?funnel_event=email_confirmed vem do route.ts do /callback (spec 046) —
  // dispara aqui (client-side, precisa do posthog-js) e limpa a URL em
  // seguida pra não disparar de novo num refresh da página.
  useEffect(() => {
    if (searchParams.get("funnel_event") === "email_confirmed") {
      void trackFunnelEvent("email_confirmed");
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  return (
    <main className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {user && <span className="text-sm text-neutral-600">{user.email}</span>}
          <Button variant="secondary" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>
      <Card className="flex items-center justify-between">
        <span className="font-medium">Piloto automático</span>
        <Badge variant="neutral">Não configurado</Badge>
      </Card>
    </main>
  );
}

// Dados reais entram conforme os specs de negocio forem implementados.
export default function DashboardPage(): JSX.Element {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-neutral-600">Carregando...</main>}>
      <DashboardPageInner />
    </Suspense>
  );
}
