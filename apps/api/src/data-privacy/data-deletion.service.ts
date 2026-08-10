import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../common/services/email.service";
import { AuditLogService } from "../common/services/audit-log.service";
import { SupabaseAdminService } from "../common/services/supabase-admin.service";

const TOKEN_EXPIRY_HOURS = 24;

// A operação mais irreversível do sistema (spec 042, nota de implementação):
// nunca uma exclusão de 1 clique. Fluxo de duas etapas obrigatório —
// requestDeletion() só gera e envia o token; confirmDeletion() só executa
// com um token válido, não expirado e não reutilizado (CA-04).
@Injectable()
export class DataDeletionService {
  private readonly logger = new Logger(DataDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  async requestDeletion(workspaceId: string): Promise<{ status: "confirmation_required" }> {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException("Workspace não encontrado.");

    const adminMembership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, role: "workspace_admin" },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!adminMembership) {
      throw new NotFoundException("Nenhum workspace_admin encontrado para enviar a confirmação.");
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    await this.prisma.dataDeletionRequest.create({
      data: { workspaceId, requestedByEmail: adminMembership.user.email, token, expiresAt },
    });

    const appBaseUrl = this.config.getOrThrow<string>("APP_BASE_URL");
    const confirmUrl = `${appBaseUrl}/settings/delete-workspace?token=${token}`;
    await this.emailService.send({
      to: adminMembership.user.email,
      subject: `Confirmação de exclusão de dados — ${workspace.name}`,
      html:
        `Foi solicitada a exclusão COMPLETA e IRREVERSÍVEL dos dados do workspace "${workspace.name}". ` +
        `Se foi você, confirme em até ${TOKEN_EXPIRY_HOURS}h: <a href="${confirmUrl}">${confirmUrl}</a>. ` +
        "Se não foi você, ignore este e-mail — nada será excluído sem essa confirmação.",
    });

    this.logger.warn(`Solicitação de exclusão de dados criada para o workspace ${workspaceId} (token enviado por e-mail).`);
    return { status: "confirmation_required" };
  }

  // CA-05/CA-06: audita ANTES de excluir (não há mais workspaceId válido
  // depois), depois deleta o workspace — ON DELETE CASCADE (spec 003) cuida
  // de brand_kit/content_pieces/publications/analytics_snapshots/social_accounts/
  // autopilot_pipelines/subscriptions/workspace_members/etc.
  async confirmDeletion(
    workspaceId: string,
    token: string,
    alsoDeleteAccount = false,
  ): Promise<{ status: "deleted" }> {
    const request = await this.prisma.dataDeletionRequest.findUnique({ where: { token } });
    if (!request || request.workspaceId !== workspaceId || request.confirmedAt || request.expiresAt < new Date()) {
      throw new BadRequestException("Token de confirmação inválido, expirado ou já utilizado.");
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });
    if (!workspace) throw new NotFoundException("Workspace não encontrado (pode já ter sido excluído).");

    await this.auditLog.record({
      workspaceId,
      action: "workspace_data_deleted",
      entityType: "workspace",
      entityId: workspaceId,
      metadata: { workspaceName: workspace.name, requestedByEmail: request.requestedByEmail },
    });
    await this.prisma.dataDeletionRequest.update({ where: { token }, data: { confirmedAt: new Date() } });

    const memberUserIds = workspace.members.map((m) => m.userId);

    await this.prisma.workspace.delete({ where: { id: workspaceId } });

    // Direito do titular cobre a conta inteira, não só os dados de negócio
    // (nota do spec 042) — só executa se este era o ÚLTIMO workspace do
    // usuário, para não excluir a conta de alguém que só perdeu ESTE
    // workspace mas continua com acesso a outros.
    if (alsoDeleteAccount) {
      for (const userId of memberUserIds) {
        const remainingMemberships = await this.prisma.workspaceMember.count({ where: { userId } });
        if (remainingMemberships === 0) {
          try {
            await this.supabaseAdmin.deleteUser(userId);
            await this.prisma.user.delete({ where: { id: userId } });
          } catch (err) {
            this.logger.error(`Falha ao excluir conta do usuário ${userId} após exclusão de workspace: ${(err as Error).message}`);
          }
        }
      }
    }

    this.logger.warn(`Workspace ${workspaceId} ("${workspace.name}") e todos os dados dependentes foram excluídos.`);
    return { status: "deleted" };
  }
}
