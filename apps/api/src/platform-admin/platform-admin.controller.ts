import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { PlatformAdminService } from "./platform-admin.service";
import { ProvisionWorkspaceDto } from "./dto/provision-workspace.dto";

// CA-02: exige isPlatformSuperAdmin=true (PlatformAdminGuard), nunca a
// role workspace_admin comum — nenhuma rota aqui aceita X-Workspace-Id
// como forma de autorização, é sempre a flag global do User.
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller("platform")
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get("workspaces")
  listWorkspaces() {
    return this.platformAdminService.listWorkspaces();
  }

  @Post("workspaces")
  provisionWorkspace(@Body() dto: ProvisionWorkspaceDto) {
    return this.platformAdminService.provisionWorkspace(dto);
  }

  @Post("workspaces/:id/suspend")
  suspend(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.platformAdminService.suspend(id, user.id);
  }

  @Post("workspaces/:id/reactivate")
  reactivate(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.platformAdminService.reactivate(id, user.id);
  }

  @Post("workspaces/:id/impersonate")
  impersonate(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.platformAdminService.impersonate(user.id, id);
  }
}
