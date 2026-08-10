import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ServiceTokenGuard } from "../auth/guards/service-token.guard";
import { ResearchService } from "../research/research.service";
import { AutopilotInternalService, DueWorkspace } from "./autopilot-internal.service";
import { ResearchScanDto } from "./dto/research-scan.dto";

// Prefixo /internal/ reservado para chamadas de servico (spec 032/033) —
// nunca exposto ao frontend, nunca aceita JWT de usuario. Guardado só por
// ServiceTokenGuard, sem WorkspaceGuard: quem chama é o workflow do n8n, que
// não tem um usuário logado nem um X-Workspace-Id de sessão.
@UseGuards(ServiceTokenGuard)
@Controller("internal/autopilot")
export class AutopilotInternalController {
  constructor(
    private readonly autopilotInternalService: AutopilotInternalService,
    private readonly researchService: ResearchService,
  ) {}

  @Get("active-workspaces")
  activeWorkspaces(): Promise<DueWorkspace[]> {
    return this.autopilotInternalService.listAndMarkActiveWorkspaces();
  }

  // Desvio consciente do texto literal do spec 033: em vez de reusar
  // POST /research-insights/scan (protegido por JwtAuthGuard+WorkspaceGuard,
  // que dependem de request.user/sessão — inexistentes numa chamada de
  // serviço), criamos este espelho interno com workspaceId explícito no
  // corpo, delegando para o MESMO ResearchService.scan() usado pelo endpoint
  // humano. Evita enfraquecer o WorkspaceGuard com um caminho alternativo de
  // autenticação nas mesmas rotas que o frontend usa (nota de arquitetura do
  // spec 032).
  @HttpCode(202)
  @Post("research-scan")
  researchScan(@Body() dto: ResearchScanDto): Promise<{ scanId: string }> {
    return this.researchService.scan(dto.workspaceId);
  }
}
