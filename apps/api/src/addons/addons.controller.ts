import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { AddonsService } from "./addons.service";

@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller("addons")
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Get()
  list(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.addonsService.listAddons(workspace.id);
  }

  @Roles("workspace_admin", "super_admin")
  @Post(":addonKey/subscribe")
  subscribe(
    @Param("addonKey") addonKey: string,
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.addonsService.subscribe(workspace.id, addonKey, user.id);
  }

  @Roles("workspace_admin", "super_admin")
  @Post(":addonKey/cancel")
  cancel(
    @Param("addonKey") addonKey: string,
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.addonsService.cancel(workspace.id, addonKey, user.id);
  }
}
