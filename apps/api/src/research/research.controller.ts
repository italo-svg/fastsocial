import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { ResearchService } from "./research.service";
import { CreateInsightDto } from "./dto/create-insight.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("research-insights")
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Get()
  list(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Query("consumed") consumed?: string,
    @Query("sourceType") sourceType?: string,
    @Query("minRelevance") minRelevance?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.researchService.list(workspace.id, {
      consumed: consumed === undefined ? undefined : consumed === "true",
      sourceType,
      minRelevance: minRelevance ? parseFloat(minRelevance) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  createManual(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: CreateInsightDto) {
    return this.researchService.createManual(workspace.id, dto);
  }

  @HttpCode(202)
  @Post("scan")
  scan(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.researchService.scan(workspace.id);
  }
}
