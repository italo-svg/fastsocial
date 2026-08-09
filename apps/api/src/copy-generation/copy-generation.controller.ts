import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { CopyGenerationService } from "./copy-generation.service";
import { GenerateCopyDto } from "./dto/generate-copy.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("copy-generation")
export class CopyGenerationController {
  constructor(private readonly copyGenerationService: CopyGenerationService) {}

  @Post("generate")
  generate(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: GenerateCopyDto) {
    return this.copyGenerationService.generate(workspace.id, dto);
  }
}
