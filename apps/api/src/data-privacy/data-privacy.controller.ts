import { Body, Controller, ForbiddenException, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { DataExportService } from "./data-export.service";
import { DataDeletionService } from "./data-deletion.service";
import { ConfirmDeletionDto } from "./dto/confirm-deletion.dto";

// Guardado só por JwtAuthGuard (workspaceId vem do :id do path, não do header
// X-Workspace-Id — WorkspaceGuard não se aplica aqui, mesmo padrão de
// WorkspacesController) + checagem explícita de workspace_admin dentro de
// cada rota, já que exportar/excluir todos os dados de um workspace é
// sensível demais para deixar pra qualquer membro.
@UseGuards(JwtAuthGuard)
@Controller("workspaces")
export class DataPrivacyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataExportService: DataExportService,
    private readonly dataDeletionService: DataDeletionService,
  ) {}

  private async assertIsAdmin(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership || membership.role !== "workspace_admin") {
      throw new ForbiddenException("Ação restrita ao administrador do workspace.");
    }
  }

  @Post(":id/export-data")
  async exportData(@CurrentUser() user: CurrentUserPayload, @Param("id") workspaceId: string) {
    await this.assertIsAdmin(workspaceId, user.id);
    return this.dataExportService.requestExport(workspaceId, user.email);
  }

  // Sem token no corpo: inicia a solicitação (envia o e-mail de confirmação).
  // Com token válido: executa a exclusão de fato (CA-04).
  @Post(":id/delete-data")
  async deleteData(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") workspaceId: string,
    @Body() dto: ConfirmDeletionDto,
  ) {
    await this.assertIsAdmin(workspaceId, user.id);
    if (!dto.token) {
      return this.dataDeletionService.requestDeletion(workspaceId);
    }
    return this.dataDeletionService.confirmDeletion(workspaceId, dto.token, dto.alsoDeleteAccount ?? false);
  }
}
