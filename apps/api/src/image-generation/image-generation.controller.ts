import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { ImageGenerationService } from "./image-generation.service";
import { CreateImageGenerationJobDto } from "./dto/create-image-generation-job.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("image-generation")
export class ImageGenerationController {
  constructor(private readonly imageGenerationService: ImageGenerationService) {}

  @Post("jobs")
  createJob(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Body() dto: CreateImageGenerationJobDto,
  ) {
    return this.imageGenerationService.createJob(workspace.id, dto);
  }

  @Get("jobs/:id")
  getJob(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.imageGenerationService.getJob(workspace.id, id);
  }
}
