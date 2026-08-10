import { Controller, Get, HttpException, HttpStatus, Query, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../../common/decorators/current-workspace.decorator";
import { LinkedInOAuthService } from "./linkedin-oauth.service";

@Controller("social-accounts/connect/linkedin")
export class LinkedInOAuthController {
  constructor(
    private readonly linkedInOAuthService: LinkedInOAuthService,
    private readonly config: ConfigService,
  ) {}

  // Autenticado: só um workspace_admin logado no FastSocial pode iniciar a
  // conexão. Retorna a URL em vez de redirecionar direto, pois quem chama é
  // o frontend via fetch (mesmo padrão do connect/meta do spec 028).
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  @Get()
  connect(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    if (!this.linkedInOAuthService.isConfigured()) {
      throw new HttpException(
        "Integração com LinkedIn não configurada (LINKEDIN_CLIENT_ID/SECRET/TOKEN_ENCRYPTION_KEY ausentes).",
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    return { url: this.linkedInOAuthService.buildAuthorizationUrl(workspace.id) };
  }

  // Público de propósito: o LinkedIn redireciona o navegador do usuário para
  // cá sem nenhum header de autenticação do FastSocial — a identidade do
  // workspace vem do `state` assinado (ver LinkedInOAuthService#verifyState).
  @Get("callback")
  async callback(@Query("code") code: string, @Query("state") state: string, @Res() res: Response) {
    const appBaseUrl = this.config.get<string>("APP_BASE_URL");
    try {
      await this.linkedInOAuthService.handleCallback(code, state);
      return res.redirect(`${appBaseUrl}/settings/connections?linkedin=connected`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      return res.redirect(`${appBaseUrl}/settings/connections?linkedin=error&message=${encodeURIComponent(message)}`);
    }
  }
}
