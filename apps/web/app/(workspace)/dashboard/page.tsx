"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Dados reais entram conforme os specs de negocio forem implementados.
export default function DashboardPage(): JSX.Element {
  const { user, logout } = useAuth();

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
