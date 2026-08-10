import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface SummaryFilters {
  from: Date;
  to: Date;
  network?: string;
  format?: string;
}

export interface MetricTotals {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface AnalyticsSummary {
  totals: MetricTotals;
  timeSeries: (MetricTotals & { date: string })[];
}

export type RankingMetric = "reach" | "impressions" | "likes" | "comments" | "shares" | "saves";

export interface RankingItem {
  publicationId: string;
  contentPieceId: string;
  network: string;
  format: string;
  metric: RankingMetric;
  value: number;
  insightSummary: string | null;
  publishedAt: Date;
}

const ZERO_TOTALS: MetricTotals = { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0 };

@Injectable()
export class AnalyticsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  // Regra central deste spec (CA-04): busca sempre o snapshot MAIS RECENTE de
  // cada publication (orderBy capturedAt desc, take 1) — nunca soma todos os
  // snapshots históricos da mesma publication, o que inflaria os totais
  // artificialmente a cada nova coleta (spec 038 cria um snapshot novo por
  // execução, de propósito, para dar histórico de evolução).
  private async findPublicationsWithLatestSnapshot(workspaceId: string, filters: SummaryFilters) {
    return this.prisma.publication.findMany({
      where: {
        contentPiece: { workspaceId, ...(filters.format ? { format: filters.format } : {}) },
        status: "published",
        publishedAt: { gte: filters.from, lte: filters.to },
        ...(filters.network ? { socialAccount: { network: filters.network } } : {}),
      },
      include: {
        analyticsSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
        contentPiece: { include: { insight: true } },
        socialAccount: true,
      },
    });
  }

  async summary(workspaceId: string, filters: SummaryFilters): Promise<AnalyticsSummary> {
    const publications = await this.findPublicationsWithLatestSnapshot(workspaceId, filters);

    const totals: MetricTotals = { ...ZERO_TOTALS };
    const byDay = new Map<string, MetricTotals>();

    for (const pub of publications) {
      const snapshot = pub.analyticsSnapshots[0];
      if (!snapshot) continue;

      const day = pub.publishedAt!.toISOString().slice(0, 10);
      const dayTotals = byDay.get(day) ?? { ...ZERO_TOTALS };

      for (const key of Object.keys(ZERO_TOTALS) as (keyof MetricTotals)[]) {
        const value = snapshot[key] ?? 0;
        totals[key] += value;
        dayTotals[key] += value;
      }
      byDay.set(day, dayTotals);
    }

    const timeSeries = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));

    return { totals, timeSeries };
  }

  // CA-03: ordena pela métrica escolhida usando o snapshot mais recente,
  // trazendo o insight de origem (quando a peça veio do piloto automático a
  // partir de uma pesquisa) para responder "o que está funcionando".
  async ranking(workspaceId: string, metric: RankingMetric, limit: number): Promise<RankingItem[]> {
    const publications = await this.findPublicationsWithLatestSnapshot(workspaceId, {
      from: new Date(0),
      to: new Date(),
    });

    return publications
      .map((pub) => ({
        pub,
        value: pub.analyticsSnapshots[0]?.[metric] ?? null,
      }))
      .filter((entry): entry is { pub: (typeof publications)[number]; value: number } => entry.value !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map(({ pub, value }) => ({
        publicationId: pub.id,
        contentPieceId: pub.contentPieceId,
        network: pub.socialAccount.network,
        format: pub.contentPiece.format,
        metric,
        value,
        insightSummary: pub.contentPiece.insight?.summary ?? null,
        publishedAt: pub.publishedAt!,
      }));
  }
}
