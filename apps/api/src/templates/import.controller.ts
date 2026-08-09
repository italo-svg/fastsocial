import { Body, Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { ImportService } from "./import.service";
import { ImportTemplateDto } from "./dto/import-template.dto";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("templates")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post("import")
  @UseInterceptors(FilesInterceptor("file", 10, { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  import(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: ImportTemplateDto,
  ) {
    return this.importService.import(workspace.id, files, dto);
  }
}
