import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AutopilotRun } from "@/hooks/useAutopilot";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  scheduled: "success",
  published: "success",
  pending_approval: "warning",
  draft: "neutral",
  rejected: "danger",
  failed: "danger",
};

interface RunsHistoryProps {
  runs: AutopilotRun[];
}

export function RunsHistory({ runs }: RunsHistoryProps): JSX.Element {
  if (runs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-neutral-600">
          Nenhuma peça gerada automaticamente ainda. Assim que o piloto automático rodar, o histórico aparece aqui.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold">Histórico de execuções</h2>
      <div className="space-y-3">
        {runs.map((run) => (
          <div key={run.date} className="border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{formatDate(run.date)}</span>
              <span className="text-sm text-neutral-600">
                {run.count} {run.count === 1 ? "peça gerada" : "peças geradas"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {run.pieces.map((piece) => (
                <Badge key={piece.id} variant={STATUS_VARIANT[piece.status] ?? "neutral"}>
                  {piece.format === "carousel" ? "Carrossel" : "Post"} · {piece.status}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
