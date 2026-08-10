import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ServiceTokenGuard } from "../auth/guards/service-token.guard";
import { SocialAccountsService } from "./social-accounts.service";

// Espelho interno de GET /social-accounts (spec 028), guardado só por
// ServiceTokenGuard — mesmo racional do AutopilotInternalController (spec
// 032/033/034): o workflow de agendamento do n8n (spec 035) precisa listar as
// contas conectadas de um workspace sem ter uma sessão de usuário/JWT, mas não
// deve enfraquecer o JwtAuthGuard+WorkspaceGuard usados pelo endpoint humano.
@UseGuards(ServiceTokenGuard)
@Controller("internal/social-accounts")
export class SocialAccountsInternalController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get(":workspaceId")
  list(@Param("workspaceId") workspaceId: string) {
    return this.socialAccountsService.list(workspaceId);
  }
}
