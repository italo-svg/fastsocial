import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { PublicationsService } from "./publications.service";
import { SchedulePublicationDto } from "./dto/schedule-publication.dto";
import { ReschedulePublicationDto } from "./dto/reschedule-publication.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller()
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Roles("workspace_admin", "editor", "super_admin")
  @Post("content-pieces/:id/schedule")
  schedule(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: SchedulePublicationDto,
  ) {
    return this.publicationsService.schedule(workspace.id, id, dto);
  }

  @Get("publications")
  list(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.publicationsService.list(workspace.id, from, to);
  }

  @Roles("workspace_admin", "editor", "super_admin")
  @Post("publications/:id/cancel")
  cancel(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.publicationsService.cancel(workspace.id, id);
  }

  @Roles("workspace_admin", "editor", "super_admin")
  @Post("publications/:id/reschedule")
  reschedule(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: ReschedulePublicationDto,
  ) {
    return this.publicationsService.reschedule(workspace.id, id, dto);
  }
}
