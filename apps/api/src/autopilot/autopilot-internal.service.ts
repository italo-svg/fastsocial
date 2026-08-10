import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Tolera atraso do cron do n8n (spec 033) sem disparar pesquisa 2x no mesmo
// dia se o workflow for re-executado manualmente logo em seguida — 20h em
// vez de 24h cheias dá folga para o horário do cron variar um pouco.
const CADENCE_HOURS = 20;

export interface DueWorkspace {
  workspaceId: string;
}

export interface NextInsight {
  id: string;
  summary: string;
  suggestedFormat: string | null;
  relevanceScore: number;
}

export interface NextInsightsResponse {
  formatMix: Record<string, number>;
  insights: NextInsight[];
}

const CADENCE_WINDOW_DAYS = 7;

@Injectable()
export class AutopilotInternalService {
  constructor(private readonly prisma: PrismaService) {}

  // "Mark-and-fetch": retorna os workspaces com piloto automático ativo que
  // ainda não rodaram a rodada de pesquisa dentro da cadência, e já marca
  // lastRunAt=now() nesses mesmos registros antes de responder. Isso torna o
  // endpoint idempotente por natureza (CA-04) — rodar o workflow 2x seguidas
  // não dispara pesquisa duplicada para quem já foi processado na primeira.
  async listAndMarkActiveWorkspaces(): Promise<DueWorkspace[]> {
    const cutoff = new Date(Date.now() - CADENCE_HOURS * 60 * 60 * 1000);

    const due = await this.prisma.autopilotPipeline.findMany({
      where: {
        isActive: true,
        OR: [{ lastRunAt: null }, { lastRunAt: { lt: cutoff } }],
      },
      select: { id: true, workspaceId: true },
    });

    if (due.length > 0) {
      await this.prisma.autopilotPipeline.updateMany({
        where: { id: { in: due.map((d) => d.id) } },
        data: { lastRunAt: new Date() },
      });
    }

    return due.map((d) => ({ workspaceId: d.workspaceId }));
  }

  // Quantos insights ainda cabem na cadência semanal deste workspace
  // (posts_per_week menos quantas content_pieces de origin='autopilot' já
  // foram criadas nos últimos 7 dias — CA-03) e, dentro desse limite, os
  // insights não consumidos mais relevantes. Mesmo padrão "mark-and-fetch" do
  // listAndMarkActiveWorkspaces: marca os insights retornados como
  // consumed=true antes de responder, para não entregar o mesmo insight de
  // novo numa chamada seguinte antes do workflow terminar de processá-lo.
  async nextInsightsAndMark(workspaceId: string): Promise<NextInsightsResponse> {
    const pipeline = await this.prisma.autopilotPipeline.findUnique({ where: { workspaceId } });
    if (!pipeline || !pipeline.isActive) {
      return { formatMix: {}, insights: [] };
    }

    const formatMix = pipeline.formatMix as Record<string, number>;

    const windowStart = new Date(Date.now() - CADENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const generatedInWindow = await this.prisma.contentPiece.count({
      where: { workspaceId, origin: "autopilot", createdAt: { gte: windowStart } },
    });

    const remaining = pipeline.postsPerWeek - generatedInWindow;
    if (remaining <= 0) {
      return { formatMix, insights: [] };
    }

    const insights = await this.prisma.researchInsight.findMany({
      where: { workspaceId, consumed: false },
      orderBy: [{ relevanceScore: "desc" }, { capturedAt: "desc" }],
      take: remaining,
    });

    if (insights.length > 0) {
      await this.prisma.researchInsight.updateMany({
        where: { id: { in: insights.map((i) => i.id) } },
        data: { consumed: true },
      });
    }

    return {
      formatMix,
      insights: insights.map((i) => ({
        id: i.id,
        summary: i.summary,
        suggestedFormat: i.suggestedFormat,
        relevanceScore: Number(i.relevanceScore),
      })),
    };
  }
}
