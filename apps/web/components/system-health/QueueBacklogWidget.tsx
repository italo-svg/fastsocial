import { Card } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

// Link direto pro Bull Board real (spec 044) em vez de duplicar aqui os
// dados de fila que ele já mostra ao vivo (protegido por super_admin do
// mesmo jeito, ver bull-board.service.ts).
export function QueueBacklogWidget(): JSX.Element {
  return (
    <Card className="space-y-2">
      <h3 className="text-sm font-medium">Filas (Bull Board)</h3>
      <p className="text-xs text-neutral-500">Jobs pendentes/falhos das filas de publicação e exportação de dados.</p>
      <a
        href={`${API_URL}/api/v1/admin/queues`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary underline"
      >
        Abrir Bull Board →
      </a>
    </Card>
  );
}
