import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Dados reais entram conforme os specs de negocio forem implementados.
export default function DashboardPage(): JSX.Element {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Card className="flex items-center justify-between">
        <span className="font-medium">Piloto automático</span>
        <Badge variant="neutral">Não configurado</Badge>
      </Card>
    </main>
  );
}
