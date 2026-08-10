import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InstagramFacebookCollector } from "./collectors/instagram-facebook.collector";
import { LinkedInCollector } from "./collectors/linkedin.collector";
import type { NetworkMetricsCollector } from "./collectors/metrics-collector.interface";

export interface CollectionResult {
  success: boolean;
  snapshotId?: string;
  error?: string;
}

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instagramFacebookCollector: InstagramFacebookCollector,
    private readonly linkedInCollector: LinkedInCollector,
  ) {}

  private get collectors(): NetworkMetricsCollector[] {
    return [this.instagramFacebookCollector, this.linkedInCollector];
  }

  // CA-04: qualquer falha do collector (token expirado, post removido, rede
  // sem endpoint viável) vira um retorno estruturado {success:false, error},
  // nunca uma exceção não tratada — quem chama (workflow do n8n, spec 035)
  // processa um batch inteiro e uma falha isolada não pode derrubar o resto.
  async collectForPublication(publicationId: string): Promise<CollectionResult> {
    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      include: { socialAccount: true },
    });
    if (!publication) {
      throw new NotFoundException("Publicação não encontrada.");
    }

    const collector = this.collectors.find((c) => c.supports(publication.socialAccount.network));
    if (!collector) {
      return { success: false, error: `Nenhum coletor de métricas disponível para a rede "${publication.socialAccount.network}".` };
    }

    try {
      const metrics = await collector.collect(publication);
      // CA-03: sempre cria um snapshot NOVO — nunca atualiza um existente,
      // para preservar o histórico de evolução do post ao longo do tempo.
      const snapshot = await this.prisma.analyticsSnapshot.create({
        data: { publicationId, ...metrics },
      });
      return { success: true, snapshotId: snapshot.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido na coleta de métricas.";
      this.logger.error(`Falha ao coletar métricas da publication ${publicationId}: ${message}`);
      return { success: false, error: message };
    }
  }
}
