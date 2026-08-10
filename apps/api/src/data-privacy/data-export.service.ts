import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../common/services/storage.service";
import { EmailService } from "../common/services/email.service";

// Bucket "exports" já existe no Supabase Storage self-hospedado (infra/supabase/README.md,
// criado junto com brand-assets/templates/content-renders) — reusado aqui em vez de
// criar mais um bucket só para isso.
export const DATA_EXPORT_BUCKET = "exports";
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60; // 24h

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly emailService: EmailService,
    @InjectQueue("data-export") private readonly queue: Queue,
  ) {}

  // CA-03: roda como job assíncrono (spec 042) — pode demorar em workspaces
  // com muito histórico. O endpoint só enfileira e devolve na hora.
  async requestExport(workspaceId: string, requestedByEmail: string): Promise<{ jobId: string }> {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException("Workspace não encontrado.");

    const job = await this.queue.add("export", { workspaceId, requestedByEmail });
    return { jobId: job.id! };
  }

  // Executado pelo DataExportProcessor. Formato JSON (não ZIP) de propósito
  // — o próprio spec 042 aceita "ZIP/JSON", e um ZIP multi-arquivo exigiria
  // adicionar uma dependência de compressão só para isso (ex: archiver),
  // sem nenhum CA pedindo especificamente o formato ZIP.
  async collectAndUpload(workspaceId: string, requestedByEmail: string): Promise<void> {
    const [workspace, brandKit, contentPieces, publications, analyticsSnapshots, socialAccounts, autopilotPipeline, subscription] =
      await Promise.all([
        this.prisma.workspace.findUnique({ where: { id: workspaceId } }),
        this.prisma.brandKit.findUnique({ where: { workspaceId } }),
        this.prisma.contentPiece.findMany({ where: { workspaceId }, include: { slides: true } }),
        this.prisma.publication.findMany({ where: { contentPiece: { workspaceId } } }),
        this.prisma.analyticsSnapshot.findMany({ where: { publication: { contentPiece: { workspaceId } } } }),
        // accessTokenEncrypted NUNCA entra no export — mesmo cifrado, é um segredo de
        // acesso, não um dado pessoal do titular que a LGPD exige devolver.
        this.prisma.socialAccount.findMany({
          where: { workspaceId },
          select: { id: true, network: true, externalAccountId: true, displayName: true, status: true, connectedAt: true },
        }),
        this.prisma.autopilotPipeline.findUnique({ where: { workspaceId } }),
        this.prisma.subscription.findUnique({ where: { workspaceId } }),
      ]);

    if (!workspace) {
      this.logger.warn(`Export cancelado: workspace ${workspaceId} não existe mais.`);
      return;
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, createdAt: workspace.createdAt },
      brandKit,
      contentPieces,
      publications,
      analyticsSnapshots,
      socialAccounts,
      autopilotPipeline,
      subscription,
    };

    const fileName = `${workspaceId}/${Date.now()}.json`;
    const buffer = Buffer.from(JSON.stringify(exportPayload, null, 2), "utf8");
    await this.storage.upload(DATA_EXPORT_BUCKET, fileName, buffer, "application/json");
    const signedUrl = await this.storage.getSignedUrl(DATA_EXPORT_BUCKET, fileName, SIGNED_URL_TTL_SECONDS);

    await this.emailService.send({
      to: requestedByEmail,
      subject: `Exportação de dados do workspace "${workspace.name}" pronta`,
      html: `Sua exportação de dados está pronta. O link expira em 24h: <a href="${signedUrl}">${signedUrl}</a>`,
    });

    this.logger.log(`Export do workspace ${workspaceId} concluído: ${fileName}`);
  }
}
