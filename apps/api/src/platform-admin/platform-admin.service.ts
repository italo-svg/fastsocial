import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseAdminService } from "../common/services/supabase-admin.service";
import { WorkspacesService, slugify } from "../workspaces/workspaces.service";
import { ProvisionWorkspaceDto } from "./dto/provision-workspace.dto";

const IMPERSONATION_TTL_MINUTES = 15;
const INVITE_EXPIRY_DAYS = 7;

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  planType: string;
  billingStatus: string | null;
  connectedSocialAccounts: number;
  publishedThisMonth: number;
  autopilotLastRunAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // CA-01: join agregado por workspace — uso simples de loop (não uma
  // query monstro com múltiplos JOINs condicionais) porque o número de
  // workspaces numa plataforma B2B como essa não justifica a complexidade
  // adicional de uma única query SQL bruta; revisar se a base crescer muito.
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const workspaces = await this.prisma.workspace.findMany({
      include: { subscription: true, autopilotPipeline: true },
      orderBy: { createdAt: "desc" },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    return Promise.all(
      workspaces.map(async (ws) => {
        const [connectedSocialAccounts, publishedThisMonth] = await Promise.all([
          this.prisma.socialAccount.count({ where: { workspaceId: ws.id, status: "connected" } }),
          this.prisma.publication.count({
            where: { status: "published", publishedAt: { gte: monthStart }, contentPiece: { workspaceId: ws.id } },
          }),
        ]);

        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          status: ws.status,
          planType: ws.subscription?.planType ?? ws.planType,
          billingStatus: ws.subscription?.billingStatus ?? null,
          connectedSocialAccounts,
          publishedThisMonth,
          autopilotLastRunAt: ws.autopilotPipeline?.lastRunAt ?? null,
          createdAt: ws.createdAt,
        };
      }),
    );
  }

  async suspend(workspaceId: string): Promise<{ id: string; status: string }> {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: "suspended" },
    });
    return { id: workspace.id, status: workspace.status };
  }

  async reactivate(workspaceId: string): Promise<{ id: string; status: string }> {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { status: "active" },
    });
    return { id: workspace.id, status: workspace.status };
  }

  // CA-06: e-mail com conta local (users.email) já existente vincula direto
  // como workspace_admin (reusa WorkspacesService.create(), spec 009);
  // e-mail sem conta gera um convite pendente, sem exigir que o super admin
  // seja membro do workspace recém-criado (diferente de
  // WorkspacesService.invite(), que exige isso — motivo de não reusá-lo aqui).
  async provisionWorkspace(dto: ProvisionWorkspaceDto): Promise<{ workspaceId: string; mode: "direct" | "invited" }> {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      const workspace = await this.workspacesService.create(existingUser.id, { name: dto.name });
      return { workspaceId: workspace.id, mode: "direct" };
    }

    const baseSlug = slugify(dto.name) || "workspace";
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const workspace = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({ data: { name: dto.name, slug, planType: "trial", status: "active" } });
      await tx.subscription.create({
        data: { workspaceId: ws.id, planType: "trial", maxSocialAccounts: 1, maxPostsPerMonth: 20, billingStatus: "active" },
      });
      return ws;
    });

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.workspaceInvite.create({
      data: { workspaceId: workspace.id, email: dto.email, role: "workspace_admin", token, expiresAt },
    });

    const appBaseUrl = this.config.getOrThrow<string>("APP_BASE_URL");
    const acceptUrl = `${appBaseUrl}/invites/${token}`;
    try {
      await this.supabaseAdmin.inviteUserByEmail(dto.email, {
        redirectTo: acceptUrl,
        data: { workspace_invite_token: token, workspace_name: workspace.name },
      });
    } catch {
      // Best-effort, mesmo racional do WorkspacesService.invite() — o convite
      // em si (linha em workspace_invites) já está persistido e válido.
    }

    return { workspaceId: workspace.id, mode: "invited" };
  }

  // CA-05: grava o audit_log ANTES de devolver o token de suporte — nunca
  // "best effort" aqui, ao contrário do e-mail de convite acima. Se a
  // escrita da trilha de auditoria falhar, a impersonação inteira falha.
  async impersonate(platformAdminUserId: string, targetWorkspaceId: string): Promise<{ token: string; workspaceId: string; expiresInMinutes: number }> {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: targetWorkspaceId } });
    if (!workspace) throw new NotFoundException("Workspace não encontrado.");

    const admin = await this.prisma.user.findUniqueOrThrow({ where: { id: platformAdminUserId } });
    const secret = this.config.get<string>("SUPABASE_JWT_SECRET");
    if (!secret) throw new BadRequestException("SUPABASE_JWT_SECRET não configurada.");

    await this.prisma.auditLog.create({
      data: {
        workspaceId: targetWorkspaceId,
        userId: admin.id,
        action: "platform_admin_impersonation",
        entityType: "workspace",
        entityId: targetWorkspaceId,
        metadata: { workspaceName: workspace.name, adminEmail: admin.email },
      },
    });

    // sub/email/role no formato que SupabaseJwtStrategy espera (mesmo shape
    // de um JWT real do Supabase Auth) — sub é o PRÓPRIO super admin, não o
    // dono do workspace: quem age continua sendo o admin, só que numa
    // sessão curta e marcada, com X-Workspace-Id apontando pro workspace do
    // cliente (o bypass de super_admin já existente no WorkspaceGuard cuida
    // do resto do acesso).
    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: "authenticated", impersonating_workspace_id: targetWorkspaceId },
      secret,
      { expiresIn: `${IMPERSONATION_TTL_MINUTES}m` },
    );

    return { token, workspaceId: targetWorkspaceId, expiresInMinutes: IMPERSONATION_TTL_MINUTES };
  }
}
