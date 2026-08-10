import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { WorkspacesService } from "./workspaces.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post("workspaces")
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, dto);
  }

  @Post("workspaces/:id/invites")
  invite(
    @Param("id") workspaceId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.invite(workspaceId, user.id, dto);
  }

  @Post("invites/:token/accept")
  acceptInvite(@Param("token") token: string, @CurrentUser() user: CurrentUserPayload) {
    return this.workspacesService.acceptInvite(token, user.id);
  }

  @Get("workspaces/:id/members")
  listMembers(@Param("id") workspaceId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.workspacesService.listMembers(workspaceId, user.id);
  }

  @Delete("workspaces/:id/members/:userId")
  removeMember(
    @Param("id") workspaceId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workspacesService.removeMember(workspaceId, targetUserId, user.id);
  }

  @Get("workspaces/:id/product-tour")
  getProductTourStatus(@Param("id") workspaceId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.workspacesService.getProductTourStatus(workspaceId, user.id);
  }

  @Post("workspaces/:id/product-tour/seen")
  markProductTourSeen(@Param("id") workspaceId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.workspacesService.markProductTourSeen(workspaceId, user.id);
  }

  @Get("workspaces/:id/onboarding-progress")
  getOnboardingProgress(@Param("id") workspaceId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.workspacesService.getOnboardingProgress(workspaceId, user.id);
  }
}
