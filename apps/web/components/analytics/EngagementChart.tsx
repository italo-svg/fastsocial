"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { MetricTotals, TimeSeriesPoint } from "@/hooks/useAnalytics";

interface EngagementChartProps {
  timeSeries: TimeSeriesPoint[];
  totals: MetricTotals;
}

const METRIC_LABELS: Record<keyof MetricTotals, string> = {
  reach: "Alcance",
  impressions: "Impressões",
  likes: "Curtidas",
  comments: "Comentários",
  shares: "Compartilhamentos",
  saves: "Salvamentos",
};

export function EngagementChart({ timeSeries, totals }: EngagementChartProps): JSX.Element {
  const totalsData = (Object.keys(METRIC_LABELS) as (keyof MetricTotals)[]).map((key) => ({
    metric: METRIC_LABELS[key],
    valor: totals[key],
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 text-sm font-semibold">Evolução no período</h3>
        {timeSeries.length === 0 ? (
          <p className="text-sm text-neutral-600">Sem dados no período/filtros selecionados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="reach" name="Alcance" stroke="var(--primary)" strokeWidth={2} />
              <Line type="monotone" dataKey="likes" name="Curtidas" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">Totais do período por métrica</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={totalsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
