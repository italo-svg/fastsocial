import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { RankingItem, RankingMetric } from "@/hooks/useAnalytics";

interface RankingTableProps {
  items: RankingItem[];
  metric: RankingMetric;
  onMetricChange: (metric: RankingMetric) => void;
}

const METRIC_OPTIONS: { value: RankingMetric; label: string }[] = [
  { value: "reach", label: "Alcance" },
  { value: "impressions", label: "Impressões" },
  { value: "likes", label: "Curtidas" },
  { value: "comments", label: "Comentários" },
  { value: "shares", label: "Compartilhamentos" },
  { value: "saves", label: "Salvamentos" },
];

export function RankingTable({ items, metric, onMetricChange }: RankingTableProps): JSX.Element {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ranking — o que está funcionando</h3>
        <select
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as RankingMetric)}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
        >
          {METRIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-600">Sem publicações com essa métrica no período/filtros selecionados.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.publicationId}
              className="flex items-center justify-between rounded-lg border border-neutral-100 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-neutral-400">#{index + 1}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{item.network}</Badge>
                    <Badge variant="neutral">{item.format === "carousel" ? "Carrossel" : "Post"}</Badge>
                  </div>
                  {item.insightSummary && (
                    <p className="mt-1 text-xs text-neutral-600">Origem: {item.insightSummary}</p>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold">{item.value.toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
