import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ServiceTokenGuard } from "../auth/guards/service-token.guard";
import { ResearchService } from "../research/research.service";
import { CopyGenerationService } from "../copy-generation/copy-generation.service";
import { ContentPiecesService } from "../content-pieces/content-pieces.service";
import { ImageGenerationService } from "../image-generation/image-generation.service";
import { TemplatesService } from "../templates/templates.service";
import { StockImagesService } from "../image-sources/stock-images.service";
import type { ImageOrientation } from "../image-sources/adapters/stock-image-adapter.interface";
import { AutopilotInternalService, DueWorkspace, NextInsightsResponse, PipelineConfig } from "./autopilot-internal.service";
import { ResearchScanDto } from "./dto/research-scan.dto";
import { InternalGenerateCopyDto } from "./dto/internal-copy-generate.dto";
import { InternalCreateContentPieceDto } from "./dto/internal-create-content-piece.dto";
import { InternalRenderContentPieceDto } from "./dto/internal-render-content-piece.dto";
import { InternalSubmitForApprovalDto } from "./dto/internal-submit-for-approval.dto";
import { InternalCreateImageJobDto } from "./dto/internal-create-image-job.dto";
import { InternalUpdateSlideDto } from "./dto/internal-update-slide.dto";

// Prefixo /internal/ reservado para chamadas de servico (spec 032/033/034) —
// nunca exposto ao frontend, nunca aceita JWT de usuario. Guardado só por
// ServiceTokenGuard, sem WorkspaceGuard: quem chama é o workflow do n8n, que
// não tem um usuário logado nem um X-Workspace-Id de sessão — todo endpoint
// aqui recebe workspaceId explícito no corpo/query/path, e delega para o
// MESMO Service que o endpoint humano correspondente usa (nunca duplica
// lógica de negócio, só o transporte de autenticação).
@UseGuards(ServiceTokenGuard)
@Controller("internal/autopilot")
export class AutopilotInternalController {
  constructor(
    private readonly autopilotInternalService: AutopilotInternalService,
    private readonly researchService: ResearchService,
    private readonly copyGenerationService: CopyGenerationService,
    private readonly contentPiecesService: ContentPiecesService,
    private readonly imageGenerationService: ImageGenerationService,
    private readonly templatesService: TemplatesService,
    private readonly stockImagesService: StockImagesService,
  ) {}

  @Get("active-workspaces")
  activeWorkspaces(): Promise<DueWorkspace[]> {
    return this.autopilotInternalService.listAndMarkActiveWorkspaces();
  }

  @Get(":workspaceId/next-insights")
  nextInsights(@Param("workspaceId") workspaceId: string): Promise<NextInsightsResponse> {
    return this.autopilotInternalService.nextInsightsAndMark(workspaceId);
  }

  // Consumido pelo workflow de agendamento (spec 035) para calcular o próximo
  // horário dentro dos preferredTimes configurados.
  @Get(":workspaceId/pipeline-config")
  pipelineConfig(@Param("workspaceId") workspaceId: string): Promise<PipelineConfig> {
    return this.autopilotInternalService.getPipelineConfig(workspaceId);
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

  // Mesmo racional acima (spec 034): copy-generation, content-pieces e
  // image-generation também são protegidos por JwtAuthGuard+WorkspaceGuard.
  // Em vez de ensinar esses guards compartilhados — usados por praticamente
  // todo o resto do produto — a reconhecer um token de serviço (mudança de
  // maior risco/superfície), espelhamos cada operação aqui.
  @Post("copy-generate")
  copyGenerate(@Body() dto: InternalGenerateCopyDto) {
    const { workspaceId, ...rest } = dto;
    return this.copyGenerationService.generate(workspaceId, rest);
  }

  @Post("content-pieces")
  createContentPiece(@Body() dto: InternalCreateContentPieceDto) {
    const { workspaceId, ...rest } = dto;
    return this.contentPiecesService.create(workspaceId, rest, "autopilot");
  }

  @Post("content-pieces/:id/render")
  renderContentPiece(@Param("id") id: string, @Body() dto: InternalRenderContentPieceDto) {
    const { workspaceId, ...rest } = dto;
    return this.contentPiecesService.render(workspaceId, id, rest);
  }

  @Post("content-pieces/:id/submit-for-approval")
  submitForApproval(@Param("id") id: string, @Body() dto: InternalSubmitForApprovalDto) {
    return this.contentPiecesService.submitForApproval(dto.workspaceId, id, dto.autoApprove ?? false);
  }

  @Post("image-generation-jobs")
  createImageJob(@Body() dto: InternalCreateImageJobDto) {
    const { workspaceId, ...rest } = dto;
    return this.imageGenerationService.createJob(workspaceId, rest);
  }

  @Get("image-generation-jobs/:id")
  getImageJob(@Param("id") id: string, @Query("workspaceId") workspaceId: string) {
    return this.imageGenerationService.getJob(workspaceId, id);
  }

  // Candidatos de template para o nó de escolha do workflow (spec 034) sortear
  // entre eles — MVP de seleção aleatória documentado no próprio spec como
  // possível melhoria futura (ex: mais usado/melhor avaliado do workspace).
  // Envelopado em `{ templates: [...] }` (não um array puro) de propósito: o nó
  // HTTP Request do n8n espalha uma resposta JSON de array em múltiplos items
  // automaticamente, o que quebraria o encadeamento 1-item-por-insight do
  // workflow de geração (spec 034).
  @Get(":workspaceId/templates")
  async candidateTemplates(
    @Param("workspaceId") workspaceId: string,
    @Query("format") format: string,
  ): Promise<{ templates: { id: string }[] }> {
    const [system, own] = await Promise.all([
      this.templatesService.listSystem(format),
      this.templatesService.listOwn(workspaceId, format),
    ]);
    return { templates: [...system, ...own] };
  }

  // Caminho não-IA (brand_kit.default_image_source != 'ai_generated', spec
  // 034 passo 6): busca no banco de imagens (Unsplash/Pexels, spec 016) para
  // preencher o slide automaticamente, sem intervenção humana.
  @Get("stock-search")
  stockSearch(@Query("query") query: string, @Query("orientation") orientation?: string) {
    return this.stockImagesService.search(query, orientation as ImageOrientation | undefined);
  }

  @Post("content-pieces/:id/slides/:slideId")
  updateSlide(
    @Param("id") id: string,
    @Param("slideId") slideId: string,
    @Body() dto: InternalUpdateSlideDto,
  ) {
    const { workspaceId, ...rest } = dto;
    return this.contentPiecesService.updateSlide(workspaceId, id, slideId, rest);
  }
}
