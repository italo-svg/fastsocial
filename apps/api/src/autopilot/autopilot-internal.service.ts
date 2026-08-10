import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Tolera atraso do cron do n8n (spec 033) sem disparar pesquisa 2x no mesmo
// dia se o workflow for re-executado manualmente logo em seguida — 20h em
// vez de 24h cheias dá folga para o horário do cron variar um pouco.
const CADENCE_HOURS = 20;

export interface DueWorkspace {
  workspaceId: string;
}

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
}
