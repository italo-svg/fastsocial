import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { HelpCenterService } from "./help-center.service";
import { CreateChangelogEntryDto, UpdateChangelogEntryDto } from "./dto/changelog-entry.dto";

@Controller()
export class ChangelogController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  // Público de propósito (spec 050).
  @Get("changelog")
  listPublished() {
    return this.helpCenterService.listPublishedChangelog();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("platform/changelog")
  listAll() {
    return this.helpCenterService.listAllChangelog();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post("platform/changelog")
  create(@Body() dto: CreateChangelogEntryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.helpCenterService.createChangelogEntry(dto, user.id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Put("platform/changelog/:id")
  update(@Param("id") id: string, @Body() dto: UpdateChangelogEntryDto) {
    return this.helpCenterService.updateChangelogEntry(id, dto);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Delete("platform/changelog/:id")
  remove(@Param("id") id: string) {
    return this.helpCenterService.deleteChangelogEntry(id);
  }
}
