import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "./current-user.decorator";
import { AuthService, AuthMeResponse } from "./auth.service";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: CurrentUserPayload): Promise<AuthMeResponse> {
    return this.authService.getMe(user.id);
  }

  // Endpoint de diagnostico do WorkspaceGuard (spec 007) — usado para validar a
  // resolucao de workspace/role antes de existirem endpoints de negocio reais
  // (ex: brand-kit, spec 010) que ja vao usar os mesmos guards/decorators.
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  @Get("me/workspace-context")
  workspaceContext(@CurrentWorkspace() workspace: CurrentWorkspacePayload): CurrentWorkspacePayload {
    return workspace;
  }
}
