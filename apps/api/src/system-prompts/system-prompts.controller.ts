import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { SystemPromptsService } from "./system-prompts.service";
import { UpdatePromptDto } from "./dto/update-prompt.dto";

// CA-04: exige isPlatformSuperAdmin=true — nunca workspace_admin, mesmo do
// próprio workspace (prompts são globais, não por tenant, ver Notas do spec).
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller("platform/system-prompts")
export class SystemPromptsController {
  constructor(private readonly systemPromptsService: SystemPromptsService) {}

  @Get()
  listAll() {
    return this.systemPromptsService.listAll();
  }

  @Get(":key")
  getOne(@Param("key") key: string) {
    return this.systemPromptsService.getOne(key);
  }

  @Put(":key")
  update(@Param("key") key: string, @Body() dto: UpdatePromptDto, @CurrentUser() user: CurrentUserPayload) {
    return this.systemPromptsService.update(key, dto.content, user.id);
  }

  @Get(":key/versions")
  listVersions(@Param("key") key: string) {
    return this.systemPromptsService.listVersions(key);
  }

  @Post(":key/rollback/:version")
  rollback(
    @Param("key") key: string,
    @Param("version", ParseIntPipe) version: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.systemPromptsService.rollback(key, version, user.id);
  }
}
