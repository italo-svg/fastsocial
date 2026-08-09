import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ workspaceRole?: string }>();
    if (!request.workspaceRole || !requiredRoles.includes(request.workspaceRole)) {
      throw new ForbiddenException(
        `Ação restrita a: ${requiredRoles.join(", ")}. Seu papel: ${request.workspaceRole ?? "nenhum"}.`,
      );
    }
    return true;
  }
}
