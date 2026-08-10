import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FUNNEL_EVENT_NAMES, FunnelEventName } from "./dto/record-funnel-event.dto";

export interface FunnelStage {
  eventName: FunnelEventName;
  count: number;
  pctOfPrevious: number | null;
  pctOfFirst: number | null;
}

const UTM_COLUMN: Record<"source" | "medium" | "campaign", string> = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
};

@Injectable()
export class FunnelAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // CA-01/CA-02: contagem distinta de identidade (user_id quando existe,
  // senão anonymous_id) por etapa, no período — a mesma pessoa disparando o
  // mesmo evento 2x não conta 2x.
  async getFunnel(from?: Date, to?: Date): Promise<{ stages: FunnelStage[] }> {
    const counts = await Promise.all(
      FUNNEL_EVENT_NAMES.map((eventName) => this.countDistinctForStage(eventName, from, to)),
    );

    const firstCount = counts[0] || 0;
    const stages: FunnelStage[] = FUNNEL_EVENT_NAMES.map((eventName, index) => ({
      eventName,
      count: counts[index]!,
      pctOfPrevious: index === 0 ? null : ratio(counts[index]!, counts[index - 1]!),
      pctOfFirst: index === 0 ? null : ratio(counts[index]!, firstCount),
    }));

    return { stages };
  }

  private async countDistinctForStage(eventName: string, from?: Date, to?: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS count
      FROM funnel_events
      WHERE event_name = ${eventName}
        AND (${from ?? null}::timestamptz IS NULL OR occurred_at >= ${from ?? null})
        AND (${to ?? null}::timestamptz IS NULL OR occurred_at <= ${to ?? null})
    `;
    return Number(rows[0]?.count ?? 0n);
  }

  // CA-03: quebra por origem — quantos chegaram em cada etapa, por valor de
  // UTM (ex: utm_source='google'), e a taxa de conversão etapa-1 -> etapa-final
  // daquela origem especificamente (permite comparar campanhas entre si).
  async getByUtm(groupBy: "source" | "medium" | "campaign"): Promise<{
    groupBy: string;
    rows: { value: string; stages: Record<string, number>; conversionRate: number | null }[];
  }> {
    const column = UTM_COLUMN[groupBy];
    const rows = await this.prisma.$queryRawUnsafe<{ value: string; event_name: string; count: bigint }[]>(`
      SELECT ${column} AS value, event_name, COUNT(DISTINCT COALESCE(user_id::text, anonymous_id)) AS count
      FROM funnel_events
      WHERE ${column} IS NOT NULL
      GROUP BY ${column}, event_name
    `);

    const byValue = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const stages = byValue.get(row.value) ?? {};
      stages[row.event_name] = Number(row.count);
      byValue.set(row.value, stages);
    }

    const firstStage = FUNNEL_EVENT_NAMES[0];
    const lastStage = FUNNEL_EVENT_NAMES[FUNNEL_EVENT_NAMES.length - 1];

    const result = Array.from(byValue.entries())
      .map(([value, stages]) => ({
        value,
        stages,
        conversionRate: ratio(stages[lastStage] ?? 0, stages[firstStage] ?? 0),
      }))
      .sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0));

    return { groupBy, rows: result };
  }
}

function ratio(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10; // 1 casa decimal
}
