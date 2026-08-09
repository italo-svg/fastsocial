import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { ContentPiecesService } from "./content-pieces.service";
import { CreateContentPieceDto } from "./dto/create-content-piece.dto";
import { UpdateContentPieceDto } from "./dto/update-content-piece.dto";
import { UpdateContentSlideDto } from "./dto/update-content-slide.dto";
import { RenderContentPieceDto } from "./dto/render-content-piece.dto";
import { SubmitForApprovalDto } from "./dto/submit-for-approval.dto";

// CRUD + maquina de estados de content-pieces (spec 025) — a fatia inicial (create/
// get/update/render) veio do spec 019 para o editor funcionar de ponta a ponta;
// este spec adiciona listagem, submit-for-approval e os guards de estado. Fila de
// aprovacao (approve/reject) e publicacao ficam nos specs 026/Fase 6.
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("content-pieces")
export class ContentPiecesController {
  constructor(private readonly contentPiecesService: ContentPiecesService) {}

  @Get()
  list(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Query("status") status?: string) {
    return this.contentPiecesService.list(workspace.id, status);
  }

  @Post()
  create(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: CreateContentPieceDto) {
    return this.contentPiecesService.create(workspace.id, dto);
  }

  @Get(":id")
  get(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.contentPiecesService.get(workspace.id, id);
  }

  @Post(":id/submit-for-approval")
  submitForApproval(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: SubmitForApprovalDto,
  ) {
    return this.contentPiecesService.submitForApproval(workspace.id, id, dto.autoApprove ?? false);
  }

  @Put(":id")
  updateTemplate(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: UpdateContentPieceDto,
  ) {
    return this.contentPiecesService.updateTemplate(workspace.id, id, dto);
  }

  @Put(":id/slides/:slideId")
  updateSlide(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Param("slideId") slideId: string,
    @Body() dto: UpdateContentSlideDto,
  ) {
    return this.contentPiecesService.updateSlide(workspace.id, id, slideId, dto);
  }

  @UseInterceptors(FileInterceptor("file"))
  @Post(":id/slides/:slideId/image")
  uploadSlideImage(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Param("slideId") slideId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.contentPiecesService.uploadSlideImage(workspace.id, id, slideId, file);
  }

  @Post(":id/render")
  render(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: RenderContentPieceDto,
  ) {
    return this.contentPiecesService.render(workspace.id, id, dto);
  }
}
