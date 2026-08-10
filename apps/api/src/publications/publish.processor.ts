import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { InstagramFacebookPublisher } from "./network-publishers/instagram-facebook.publisher";
import { LinkedInPublisher } from "./network-publishers/linkedin.publisher";
import type { NetworkPublisher } from "./network-publishers/network-publisher.interface";
import { buildJobId, RETRY_DELAYS_MS } from "./publications.service";

interface PublishJobData {
  publicationId: string;
  retryCount: number;
}

// Retry manual (em vez do backoff declarativo do BullMQ) para controlar
// exatamente os dois intervalos pedidos pelo spec 030 (5min, depois 30min):
// cada tentativa cria um NOVO job delayed com jobId determinístico
// (`${publicationId}:${retryCount}`), em vez de deixar o BullMQ reprocessar
// o mesmo job — assim o histórico de cada tentativa fica rastreável.
@Processor("publish")
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("publish") private readonly queue: Queue,
    private readonly instagramFacebookPublisher: InstagramFacebookPublisher,
    private readonly linkedInPublisher: LinkedInPublisher,
  ) {
    super();
  }

  private get publishers(): NetworkPublisher[] {
    return [this.instagramFacebookPublisher, this.linkedInPublisher];
  }

  async process(job: Job<PublishJobData>): Promise<void> {
    const { publicationId, retryCount } = job.data;
    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      include: { contentPiece: { include: { slides: true } }, socialAccount: true },
    });

    if (!publication || publication.status !== "scheduled") {
      this.logger.log(`Publicação ${publicationId} não está mais "scheduled" (cancelada ou já processada) — ignorando job.`);
      return;
    }

    if (publication.socialAccount.status !== "connected") {
      await this.markFailed(publication.id, "Token expirado ou conta desconectada — reconecte a conta.");
      return;
    }

    const publisher = this.publishers.find((p) => p.supports(publication.socialAccount.network));
    if (!publisher) {
      await this.markFailed(
        publication.id,
        `Nenhum publisher disponível para a rede "${publication.socialAccount.network}".`,
      );
      return;
    }

    try {
      const result = await publisher.publish(publication.contentPiece, publication.socialAccount);
      await this.prisma.publication.update({
        where: { id: publication.id },
        data: { status: "published", publishedAt: new Date(), postizReferenceId: result.referenceId },
      });
      await this.maybeMarkContentPiecePublished(publication.contentPieceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao publicar.";
      if (retryCount < RETRY_DELAYS_MS.length) {
        const nextRetryCount = retryCount + 1;
        this.logger.warn(
          `Falha ao publicar ${publication.id} (tentativa ${retryCount + 1}): ${message}. Reagendando em ${RETRY_DELAYS_MS[retryCount]! / 60000}min.`,
        );
        await this.queue.add(
          "publish",
          { publicationId, retryCount: nextRetryCount },
          { jobId: buildJobId(publicationId, nextRetryCount), delay: RETRY_DELAYS_MS[retryCount] },
        );
      } else {
        this.logger.error(`Publicação ${publication.id} falhou definitivamente após ${retryCount + 1} tentativas: ${message}`);
        await this.markFailed(publication.id, message);
      }
    }
  }

  private async markFailed(publicationId: string, message: string): Promise<void> {
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: { status: "failed", errorMessage: message },
    });
  }

  // CA-05: só marca a peça como published quando TODAS as publications dela
  // estiverem published — uma falha em outra rede mantém a peça em
  // "scheduled" (o indicador de falha parcial vem do status individual de
  // cada publication via GET /publications, sem precisar de um novo campo).
  private async maybeMarkContentPiecePublished(contentPieceId: string): Promise<void> {
    const siblings = await this.prisma.publication.findMany({ where: { contentPieceId } });
    const allPublished = siblings.length > 0 && siblings.every((p) => p.status === "published");
    if (allPublished) {
      await this.prisma.contentPiece.update({ where: { id: contentPieceId }, data: { status: "published" } });
    }
  }
}
