import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { SocialAccountsService } from "./social-accounts.service";
import { ConnectAccountDto } from "./dto/connect-account.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller("social-accounts")
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get()
  list(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.socialAccountsService.list(workspace.id);
  }

  @Roles("workspace_admin", "super_admin")
  @Post("sync")
  sync(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.socialAccountsService.sync(workspace.id);
  }

  @Roles("workspace_admin", "super_admin")
  @Post("connect/meta")
  connectMeta(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: ConnectAccountDto) {
    return this.socialAccountsService.connect(workspace.id, dto);
  }

  @Roles("workspace_admin", "super_admin")
  @HttpCode(200)
  @Delete(":id")
  disconnect(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.socialAccountsService.disconnect(workspace.id, id, user.id);
  }
}
