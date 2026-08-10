import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { SystemPromptsService } from "./system-prompts.service";
import { PromptTestService } from "./prompt-test.service";
import { UpdatePromptDto } from "./dto/update-prompt.dto";
import { TestPromptDto } from "./dto/test-prompt.dto";
import { KNOWN_PROMPT_KEYS, PromptKey } from "./default-prompts";

// CA-04: exige isPlatformSuperAdmin=true — nunca workspace_admin, mesmo do
// próprio workspace (prompts são globais, não por tenant, ver Notas do spec).
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller("platform/system-prompts")
export class SystemPromptsController {
  constructor(
    private readonly systemPromptsService: SystemPromptsService,
    private readonly promptTestService: PromptTestService,
  ) {}

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

  // CA-04 / Notas do spec: dedicado a teste, nunca persiste content_piece nem
  // image_generation_job — ver PromptTestService. Já herda JwtAuthGuard +
  // PlatformAdminGuard da classe, então promptOverride nunca fica exposto a
  // workspaces comuns (mesma preocupação de segurança das Notas do spec 049).
  @Post(":key/test")
  test(@Param("key") key: string, @Body() dto: TestPromptDto) {
    if (!KNOWN_PROMPT_KEYS.includes(key as PromptKey)) {
      throw new NotFoundException(`prompt_key desconhecida: "${key}".`);
    }
    return this.promptTestService.test(key as PromptKey, dto.content);
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
