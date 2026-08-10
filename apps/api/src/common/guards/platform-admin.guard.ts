import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface RequestWithUser {
  user: { id: string };
}

// CA-02 (spec 041): exige isPlatformSuperAdmin=true no User, independente de
// workspace_members — um workspace_admin do próprio workspace NÃO passa
// aqui. Roda depois do JwtAuthGuard (precisa de request.user já populado).
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = await this.prisma.user.findUnique({ where: { id: request.user.id } });
    if (!user?.isPlatformSuperAdmin) {
      throw new ForbiddenException("Ação restrita ao super admin da plataforma.");
    }
    return true;
  }
}
