import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { assertValidTransition, InvalidTransitionError, type ContentPieceStatus } from "../content-pieces/state-machine";
import { SchedulePublicationDto } from "./dto/schedule-publication.dto";
import { ReschedulePublicationDto } from "./dto/reschedule-publication.dto";

// Nº máximo de tentativas além da primeira (CA: retry com backoff 5min, 30min
// antes de desistir) — ver PublishProcessor para o uso destes valores.
export const RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000];

@Injectable()
export class PublicationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("publish") private readonly queue: Queue,
  ) {}

  async schedule(workspaceId: string, contentPieceId: string, dto: SchedulePublicationDto) {
    const piece = await this.prisma.contentPiece.findFirst({ where: { id: contentPieceId, workspaceId } });
    if (!piece) throw new NotFoundException("Peça de conteúdo não encontrada.");

    if (piece.status !== "scheduled") {
      try {
        assertValidTransition(piece.status as ContentPieceStatus, "scheduled");
      } catch (err) {
        if (err instanceof InvalidTransitionError) throw new ConflictException(err.message);
        throw err;
      }
      await this.prisma.contentPiece.update({ where: { id: contentPieceId }, data: { status: "scheduled" } });
    }

    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: { id: dto.socialAccountId, workspaceId },
    });
    if (!socialAccount) throw new NotFoundException("Conta social não encontrada neste workspace.");
    if (socialAccount.status !== "connected") {
      throw new ConflictException(`Conta social com status "${socialAccount.status}" — reconecte antes de agendar.`);
    }

    const publication = await this.prisma.publication.create({
      data: {
        contentPieceId,
        socialAccountId: dto.socialAccountId,
        scheduledAt: new Date(dto.scheduledAt),
        status: "scheduled",
      },
    });

    await this.enqueue(publication.id, new Date(dto.scheduledAt), 0);
    return publication;
  }

  list(workspaceId: string, from?: string, to?: string) {
    return this.prisma.publication.findMany({
      where: {
        contentPiece: { workspaceId },
        ...(from || to
          ? {
              scheduledAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { contentPiece: true, socialAccount: true },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async cancel(workspaceId: string, publicationId: string) {
    const publication = await this.findOwned(workspaceId, publicationId);
    if (publication.status !== "scheduled") {
      throw new ConflictException(`Só é possível cancelar publicações com status "scheduled" (atual: "${publication.status}").`);
    }

    await this.removeAllPendingJobs(publicationId);
    return this.prisma.publication.update({ where: { id: publicationId }, data: { status: "cancelled" } });
  }

  async reschedule(workspaceId: string, publicationId: string, dto: ReschedulePublicationDto) {
    const publication = await this.findOwned(workspaceId, publicationId);
    if (publication.status !== "scheduled") {
      throw new ConflictException(`Só é possível reagendar publicações com status "scheduled" (atual: "${publication.status}").`);
    }

    await this.removeAllPendingJobs(publicationId);
    const newDate = new Date(dto.scheduledAt);
    const updated = await this.prisma.publication.update({
      where: { id: publicationId },
      data: { scheduledAt: newDate },
    });
    await this.enqueue(publicationId, newDate, 0);
    return updated;
  }

  // Consumido pelo workflow de coleta de métricas (spec 035, cron diário):
  // publications publicadas há 24h-30 dias, sem snapshot capturado nas
  // últimas 24h (permite recoleta diária dentro da janela, sem duplicar
  // chamada à Graph API/LinkedIn API se o cron rodar 2x no mesmo dia).
  async pendingMetricsCollection() {
    const now = Date.now();
    const windowStart = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now - 24 * 60 * 60 * 1000);
    const recentSnapshotCutoff = new Date(now - 24 * 60 * 60 * 1000);

    return this.prisma.publication.findMany({
      where: {
        status: "published",
        publishedAt: { gte: windowStart, lte: windowEnd },
        analyticsSnapshots: { none: { capturedAt: { gte: recentSnapshotCutoff } } },
      },
      include: { contentPiece: { select: { workspaceId: true } }, socialAccount: true },
      orderBy: { publishedAt: "asc" },
    });
  }

  // Consumido pelo workflow de agendamento (spec 035, CA-02) para calcular um
  // horário com espaçamento mínimo em relação ao que já está agendado, em vez
  // de simplesmente repetir o mesmo preferred_time toda vez.
  upcomingScheduled(workspaceId: string) {
    return this.prisma.publication.findMany({
      where: { contentPiece: { workspaceId }, status: "scheduled", scheduledAt: { gte: new Date() } },
      select: { scheduledAt: true },
      orderBy: { scheduledAt: "asc" },
    });
  }

  private async findOwned(workspaceId: string, publicationId: string) {
    const publication = await this.prisma.publication.findFirst({
      where: { id: publicationId, contentPiece: { workspaceId } },
    });
    if (!publication) throw new NotFoundException("Publicação não encontrada neste workspace.");
    return publication;
  }

  private async enqueue(publicationId: string, scheduledAt: Date, retryCount: number): Promise<void> {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    await this.queue.add(
      "publish",
      { publicationId, retryCount },
      { jobId: buildJobId(publicationId, retryCount), delay },
    );
  }

  // Jobs de retry usam um jobId determinístico por tentativa
  // (`${publicationId}-0`, `-1`, `-2`) — remover os 3 cobre qualquer estado
  // em que o job de uma publicação possa estar (inicial ou em alguma retry).
  private async removeAllPendingJobs(publicationId: string): Promise<void> {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      await this.queue.remove(buildJobId(publicationId, attempt));
    }
  }
}

// BullMQ rejeita jobId customizado contendo ":" (erro "Custom Id cannot
// contain :") — usar "-" como separador entre o UUID da publicação e o
// número da tentativa.
export function buildJobId(publicationId: string, retryCount: number): string {
  return `${publicationId}-${retryCount}`;
}
