import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface RequestWithUser {
  user: { id: string; email: string };
  headers: Record<string, string | string[] | undefined>;
  workspaceId?: string;
  workspaceRole?: string;
}

// Linha de frente REAL do isolamento multi-tenant — nunca confia em workspace_id
// vindo do body/query do cliente, sempre resolve a partir de workspace_members.
// Ver .specs/shared/regras-de-nomenclatura.md: RLS no banco é defesa em profundidade,
// não o mecanismo primário (a API acessa o Postgres com conexão de aplicação única).
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const headerWorkspaceId = request.headers["x-workspace-id"];
    const requestedWorkspaceId = Array.isArray(headerWorkspaceId)
      ? headerWorkspaceId[0]
      : headerWorkspaceId;

    const user = await this.prisma.user.findUnique({ where: { id: request.user.id } });
    if (!user) {
      throw new ForbiddenException("Usuário não encontrado.");
    }

    if (requestedWorkspaceId) {
      const membership = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: requestedWorkspaceId, userId: user.id } },
      });

      if (membership) {
        request.workspaceId = requestedWorkspaceId;
        request.workspaceRole = membership.role;
        return true;
      }

      if (user.isPlatformSuperAdmin) {
        // super_admin pode acessar qualquer workspace mesmo sem ser membro dele.
        request.workspaceId = requestedWorkspaceId;
        request.workspaceRole = "super_admin";
        return true;
      }

      throw new ForbiddenException("Você não tem acesso a este workspace.");
    }

    // Sem header: resolve automaticamente só se o usuário tiver exatamente 1 workspace.
    const memberships = await this.prisma.workspaceMember.findMany({ where: { userId: user.id } });
    if (memberships.length === 1) {
      request.workspaceId = memberships[0]!.workspaceId;
      request.workspaceRole = memberships[0]!.role;
      return true;
    }

    throw new BadRequestException(
      "Cabeçalho X-Workspace-Id é obrigatório (usuário pertence a 0 ou múltiplos workspaces).",
    );
  }
}
