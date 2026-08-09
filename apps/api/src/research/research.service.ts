import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInsightDto } from "./dto/create-insight.dto";

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

  constructor(private readonly prisma: PrismaService) {}

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
    // TODO(spec 021): chamar aqui o conector real de fontes externas (varredura +
    // resumo por LLM) e persistir os research_insights resultantes. Este metodo
    // existe por enquanto so' para o fluxo assincrono (202 Accepted) ja funcionar
    // de ponta a ponta antes do conector real existir.
    this.logger.log(
      `Scan ${scanId} iniciado para workspace ${workspaceId} (conector do spec 021 ainda não implementado).`,
    );
  }
}
