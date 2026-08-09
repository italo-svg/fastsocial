import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ResearchInsight } from "@/hooks/useResearchInsights";

const SOURCE_LABELS: Record<ResearchInsight["sourceType"], string> = {
  competitor: "Concorrente",
  hashtag_trend: "Tendência de hashtag",
  topic_trend: "Tendência de tema",
  manual: "Manual",
};

const SOURCE_VARIANTS: Record<ResearchInsight["sourceType"], "success" | "warning" | "neutral"> = {
  competitor: "warning",
  hashtag_trend: "success",
  topic_trend: "success",
  manual: "neutral",
};

interface InsightCardProps {
  insight: ResearchInsight;
}

export function InsightCard({ insight }: InsightCardProps): JSX.Element {
  const score = Math.max(0, Math.min(10, Number(insight.relevanceScore)));
  const scorePercent = (score / 10) * 100;

  return (
    <Card className={cn("space-y-3 p-4", insight.consumed && "opacity-50")}>
      <div className="flex items-center justify-between">
        <Badge variant={SOURCE_VARIANTS[insight.sourceType]}>{SOURCE_LABELS[insight.sourceType]}</Badge>
        {insight.consumed && <span className="text-xs text-neutral-600">Já usado</span>}
      </div>

      <p className="text-sm">{insight.summary}</p>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>Relevância</span>
          <span>{score.toFixed(1)}/10</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-primary" style={{ width: `${scorePercent}%` }} />
        </div>
      </div>

      <Link href={`/content/new?insightId=${insight.id}&summary=${encodeURIComponent(insight.summary)}`}>
        <Button variant="secondary" size="sm" className="w-full">
          Usar este insight
        </Button>
      </Link>
    </Card>
  );
}
