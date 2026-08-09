import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { UpdateContentSlideDto } from "./dto/update-content-slide.dto";
import { RenderContentPieceDto } from "./dto/render-content-piece.dto";

// Fatia minima do CRUD de content-pieces, so' com o necessario para o editor do
// spec 019 funcionar de ponta a ponta — listagem, fila de aprovacao e publicacao
// sao do spec 025, que deve expandir este modulo sem quebrar estas rotas.
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("content-pieces")
export class ContentPiecesController {
  constructor(private readonly contentPiecesService: ContentPiecesService) {}

  @Post()
  create(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: CreateContentPieceDto) {
    return this.contentPiecesService.create(workspace.id, dto);
  }

  @Get(":id")
  get(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.contentPiecesService.get(workspace.id, id);
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
