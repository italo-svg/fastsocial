import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuthMeResponse {
  user: { id: string; email: string; name: string };
  workspaces: { id: string; name: string; role: string }[];
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<AuthMeResponse> {
    const user = await this.findUserWithRetry(userId);
    if (!user) {
      // O trigger handle_new_user (spec 003) sincroniza auth.users -> public.users de forma
      // assincrona; se cair aqui apos as tentativas, algo esta genuinamente errado (nao so lentidao).
      throw new NotFoundException(
        "Usuário autenticado não encontrado em public.users — trigger de sincronização pode ter falhado.",
      );
    }

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        role: m.role,
      })),
    };
  }

  private async findUserWithRetry(
    userId: string,
    attempts = 2,
    delayMs = 200,
  ): Promise<{ id: string; email: string; name: string } | null> {
    for (let i = 0; i < attempts; i++) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user;
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
  }
}
