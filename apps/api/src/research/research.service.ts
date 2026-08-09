import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInsightDto } from "./dto/create-insight.dto";
import { InsightSummarizerService } from "./insight-summarizer.service";
import { MetaAdsLibrarySource } from "./sources/meta-ads-library.source";
import { CompetitorScrapingSource } from "./sources/competitor-scraping.source";
import { HashtagTrendSource } from "./sources/hashtag-trend.source";
import type { RawSignal, TrendSource } from "./sources/trend-source.interface";

export interface ResearchInsightsQuery {
  consumed?: boolean;
  sourceType?: string;
  minRelevance?: number;
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MANUAL_INSIGHT_RELEVANCE = 10;

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);
  private readonly sources: TrendSource[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly insightSummarizer: InsightSummarizerService,
    metaAdsLibrarySource: MetaAdsLibrarySource,
    competitorScrapingSource: CompetitorScrapingSource,
    hashtagTrendSource: HashtagTrendSource,
  ) {
    this.sources = [metaAdsLibrarySource, competitorScrapingSource, hashtagTrendSource];
  }

  list(workspaceId: string, query: ResearchInsightsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;

    return this.prisma.researchInsight.findMany({
      where: {
        workspaceId,
        ...(query.consumed !== undefined ? { consumed: query.consumed } : {}),
        ...(query.sourceType ? { sourceType: query.sourceType } : {}),
        ...(query.minRelevance !== undefined ? { relevanceScore: { gte: query.minRelevance } } : {}),
      },
      orderBy: [{ relevanceScore: "desc" }, { capturedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  createManual(workspaceId: string, dto: CreateInsightDto) {
    return this.prisma.researchInsight.create({
      data: {
        workspaceId,
        sourceType: "manual",
        sourceRef: dto.sourceRef,
        summary: dto.summary,
        suggestedFormat: dto.suggestedFormat,
        relevanceScore: dto.relevanceScore ?? MANUAL_INSIGHT_RELEVANCE,
      },
    });
  }

  async scan(workspaceId: string): Promise<{ scanId: string }> {
    const brandKit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
    if (!brandKit?.niche) {
      throw new BadRequestException("Complete o onboarding (nicho da marca) antes de rodar uma pesquisa.");
    }

    const scanId = randomUUID();
    // Sem fila (BullMQ/Redis) no MVP — mesma linha dos specs 013/016/018: dispara em
    // background (fire-and-forget via setImmediate) e retorna 202 na hora, sem
    // bloquear a requisicao esperando as chamadas externas + resumo por LLM do
    // conector (spec 021) terminarem.
    setImmediate(() => {
      this.runScan(workspaceId, scanId).catch((err) => {
        this.logger.error(`Scan ${scanId} falhou: ${(err as Error).message}`);
      });
    });

    return { scanId };
  }

  private async runScan(workspaceId: string, scanId: string): Promise<void> {
    const brandKit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
    const brandKitContext = {
      niche: brandKit?.niche ?? null,
      competitors: ((brandKit?.competitors as string[] | undefined) ?? []).filter(
        (c) => typeof c === "string" && c.trim().length > 0,
      ),
    };

    const enabledSources = this.sources.filter((s) => s.isEnabled());
    if (enabledSources.length === 0) {
      this.logger.log(`Scan ${scanId}: nenhuma fonte de pesquisa habilitada — concluído sem novos insights.`);
      return;
    }

    const allSignals: RawSignal[] = [];
    for (const source of enabledSources) {
      try {
        allSignals.push(...(await source.fetch(brandKitContext)));
      } catch (err) {
        this.logger.warn(`Fonte ${source.sourceName} falhou no scan ${scanId}: ${(err as Error).message}`);
      }
    }

    if (allSignals.length === 0) {
      this.logger.log(`Scan ${scanId}: fontes habilitadas não retornaram sinais — concluído sem novos insights.`);
      return;
    }

    const insights = await this.insightSummarizer.summarize(allSignals, brandKitContext.niche);
    for (const insight of insights) {
      await this.prisma.researchInsight.create({
        data: {
          workspaceId,
          sourceType: insight.sourceRefs.length > 0 ? "competitor" : "topic_trend",
          sourceRef: insight.sourceRefs.join(", ") || null,
          summary: insight.summary,
          relevanceScore: insight.relevanceScore,
          suggestedFormat: insight.suggestedFormat,
        },
      });
    }

    this.logger.log(`Scan ${scanId}: ${insights.length} insight(s) criado(s).`);
  }
}
