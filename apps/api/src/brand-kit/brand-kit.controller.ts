import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { BrandKitService } from "./brand-kit.service";
import { UpdateBrandKitDto } from "./dto/update-brand-kit.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller("brand-kit")
export class BrandKitController {
  constructor(private readonly brandKitService: BrandKitService) {}

  @Get()
  async get(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    const kit = await this.brandKitService.get(workspace.id);
    if (!kit) throw new NotFoundException("Brand kit ainda não configurado.");
    return kit;
  }

  @Roles("workspace_admin", "super_admin")
  @Put()
  update(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: UpdateBrandKitDto) {
    return this.brandKitService.upsert(workspace.id, dto);
  }

  @Roles("workspace_admin", "super_admin")
  @UseInterceptors(FileInterceptor("file"))
  @Post("logo")
  uploadLogo(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.brandKitService.uploadLogo(workspace.id, file);
  }

  @Roles("workspace_admin", "super_admin")
  @UseInterceptors(FilesInterceptor("files", 8))
  @Post("reference-images")
  uploadReferenceImages(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.brandKitService.uploadReferenceImages(workspace.id, files);
  }

  @Roles("workspace_admin", "super_admin")
  @Delete("reference-images/:index")
  deleteReferenceImage(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("index", ParseIntPipe) index: number,
  ) {
    return this.brandKitService.deleteReferenceImage(workspace.id, index);
  }
}
