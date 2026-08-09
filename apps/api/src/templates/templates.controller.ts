import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { TemplatesService } from "./templates.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Query("source") source?: string,
    @Query("format") format?: string,
  ) {
    if (source === "system") return this.templatesService.listSystem(format);
    return this.templatesService.listOwn(workspace.id, format);
  }

  @Get(":id")
  getOne(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.templatesService.getOne(workspace.id, id);
  }

  @Post()
  create(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(workspace.id, dto);
  }

  @Put(":id")
  update(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(workspace.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.templatesService.remove(workspace.id, id);
  }
}
