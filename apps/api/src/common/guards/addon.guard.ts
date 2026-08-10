import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { REQUIRES_ADDON_KEY } from "../decorators/requires-addon.decorator";

interface RequestWithWorkspace {
  workspaceId?: string;
}

// CA-03: 402 (Payment Required) com mensagem de upsell, nunca 403 genérico —
// o cliente sabe exatamente o que fazer pra desbloquear (contratar o add-on),
// diferente de "acesso negado" que soa como bug/permissão errada. Roda
// depois do WorkspaceGuard (precisa de request.workspaceId já resolvido).
@Injectable()
export class AddonGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const addonKey = this.reflector.getAllAndOverride<string | undefined>(REQUIRES_ADDON_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!addonKey) return true;

    const request = context.switchToHttp().getRequest<RequestWithWorkspace>();
    const workspaceId = request.workspaceId;
    if (!workspaceId) {
      throw new HttpException(
        { statusCode: HttpStatus.PAYMENT_REQUIRED, message: `Este recurso exige o add-on "${addonKey}" ativo.` },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const addon = await this.prisma.workspaceAddon.findUnique({
      where: { workspaceId_addonKey: { workspaceId, addonKey } },
    });

    if (!addon || addon.status !== "active") {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: `Este recurso exige o add-on "${addonKey}" ativo. Contrate em /addons pra desbloquear.`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
