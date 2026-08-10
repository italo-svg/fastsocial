import { randomUUID } from "crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseAdminService } from "../common/services/supabase-admin.service";
import { EmailService } from "../common/services/email.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";

const ADMIN_ROLES = ["workspace_admin", "super_admin"];
const INVITE_EXPIRY_DAYS = 7;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const baseSlug = slugify(dto.name) || "workspace";
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.name, slug, planType: "trial", status: "active" },
      });

      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId, role: "workspace_admin", joinedAt: new Date() },
      });

      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          planType: "trial",
          maxSocialAccounts: 1,
          maxPostsPerMonth: 20,
          billingStatus: "active",
        },
      });

      return workspace;
    });
  }

  private async assertIsAdmin(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership || !ADMIN_ROLES.includes(membership.role)) {
      throw new ForbiddenException("Ação restrita ao administrador do workspace.");
    }
  }

  async invite(workspaceId: string, inviterUserId: string, dto: InviteMemberDto) {
    await this.assertIsAdmin(workspaceId, inviterUserId);

    const workspace = await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.workspaceInvite.create({
      data: { workspaceId, email: dto.email, role: dto.role, token, expiresAt },
    });

    const appBaseUrl = this.config.getOrThrow<string>("APP_BASE_URL");
    const acceptUrl = `${appBaseUrl}/invites/${token}`;

    // O convite em si (linha em workspace_invites, acima) já está persistido e o token
    // é válido nesse ponto — a notificação por e-mail é best-effort: nunca falhar a
    // criação do convite por causa de e-mail (ex: GoTrue sem SMTP real configurado
    // ainda, ver infra/supabase/README.md "Pendência conhecida: SMTP"). Se o envio via
    // GoTrue falhar por qualquer motivo (já existe conta, sem SMTP, etc.), cai para o
    // EmailService genérico, que por sua vez também nunca lança (modo mock se preciso).
    try {
      const inviteResult = await this.supabaseAdmin.inviteUserByEmail(dto.email, {
        redirectTo: acceptUrl,
        data: { workspace_invite_token: token, workspace_name: workspace.name },
      });
      if ("alreadyExists" in inviteResult) {
        throw new Error("already exists — fallback to direct link email");
      }
    } catch {
      await this.emailService.send({
        to: dto.email,
        subject: `Convite para o workspace ${workspace.name}`,
        html: `Você foi convidado para o workspace <strong>${workspace.name}</strong>. Acesse: <a href="${acceptUrl}">${acceptUrl}</a>`,
      });
    }

    return { email: dto.email, role: dto.role, expiresAt };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException("Convite não encontrado.");
    if (invite.acceptedAt) throw new ConflictException("Convite já foi utilizado.");
    if (invite.expiresAt < new Date()) throw new BadRequestException("Convite expirado.");

    await this.prisma.$transaction([
      this.prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
        update: {},
        create: { workspaceId: invite.workspaceId, userId, role: invite.role, joinedAt: new Date() },
      }),
      this.prisma.workspaceInvite.update({ where: { token }, data: { acceptedAt: new Date() } }),
    ]);

    return { workspaceId: invite.workspaceId, role: invite.role };
  }

  async listMembers(workspaceId: string, requesterUserId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requesterUserId } },
    });
    if (!membership) throw new ForbiddenException("Você não é membro deste workspace.");

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async removeMember(workspaceId: string, targetUserId: string, requesterUserId: string) {
    await this.assertIsAdmin(workspaceId, requesterUserId);

    if (targetUserId === requesterUserId) {
      const adminCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: "workspace_admin" },
      });
      if (adminCount <= 1) {
        throw new BadRequestException("Não é possível remover o único administrador do workspace.");
      }
    }

    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
  }
}
