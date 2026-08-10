import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ServiceTokenGuard } from "../auth/guards/service-token.guard";
import { PublicationsService } from "./publications.service";
import { SchedulePublicationDto } from "./dto/schedule-publication.dto";

// Espelho interno de POST /content-pieces/:id/schedule (spec 030), mesmo
// racional dos demais controllers /internal/* (spec 032/033/034): o workflow
// de agendamento do n8n (spec 035) não tem sessão de usuário/JWT para passar
// pelo JwtAuthGuard+WorkspaceGuard+RolesGuard do endpoint humano. Desvio
// consciente do texto literal do spec 035 (que assumia reusar o endpoint
// humano diretamente) pelo mesmo motivo já documentado nos specs anteriores.
@UseGuards(ServiceTokenGuard)
@Controller("internal/publications")
export class ScheduleInternalController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get(":workspaceId/upcoming")
  upcoming(@Param("workspaceId") workspaceId: string) {
    return this.publicationsService.upcomingScheduled(workspaceId);
  }

  @Post(":workspaceId/:contentPieceId/schedule")
  schedule(
    @Param("workspaceId") workspaceId: string,
    @Param("contentPieceId") contentPieceId: string,
    @Body() dto: SchedulePublicationDto,
  ) {
    return this.publicationsService.schedule(workspaceId, contentPieceId, dto);
  }
}
