import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { ContentPiecesService } from "./content-pieces.service";
import { RejectContentPieceDto } from "./dto/reject-content-piece.dto";

// Aprovar/rejeitar nunca e' permitido para viewer — enforced aqui no backend (CA-04,
// spec 026), nao so' escondendo os botoes na UI. Uma chamada direta a API de um
// usuario viewer deve ser bloqueada da mesma forma.
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller("content-pieces")
export class ApprovalController {
  constructor(private readonly contentPiecesService: ContentPiecesService) {}

  @Roles("workspace_admin", "editor", "super_admin")
  @Post(":id/approve")
  approve(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.contentPiecesService.approve(workspace.id, id);
  }

  @Roles("workspace_admin", "editor", "super_admin")
  @Post(":id/reject")
  reject(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: RejectContentPieceDto,
  ) {
    return this.contentPiecesService.reject(workspace.id, id, dto.reason);
  }
}
