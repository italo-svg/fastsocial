import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { AutopilotService } from "./autopilot.service";
import { UpdateAutopilotDto } from "./dto/update-autopilot.dto";
import { ToggleAutopilotDto } from "./dto/toggle-autopilot.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller("autopilot")
export class AutopilotController {
  constructor(private readonly autopilotService: AutopilotService) {}

  @Get()
  get(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.autopilotService.get(workspace.id);
  }

  @Roles("workspace_admin", "super_admin")
  @Put()
  upsert(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: UpdateAutopilotDto) {
    return this.autopilotService.upsert(workspace.id, dto);
  }

  @Roles("workspace_admin", "super_admin")
  @Post("toggle")
  toggle(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: ToggleAutopilotDto) {
    return this.autopilotService.toggle(workspace.id, dto.isActive);
  }

  @Get("runs")
  runs(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.autopilotService.runs(workspace.id);
  }
}
