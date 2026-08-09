import { Injectable, Logger, NotFoundException, NotImplementedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PromptBuilderService } from "./prompt-builder.service";
import { FalFluxProvider } from "./providers/fal-flux.provider";

const DEFAULT_REFERENCE_WEIGHT = 0.45;
const MAX_REFERENCE_IMAGES = 3;

// Aspect ratio derivado do formato da peca — versao simplificada da tabela
// networkFormats do render-engine (spec 015); nao importada diretamente porque
// services/render-engine e apps/api sao processos/deploys separados no MVP.
const ASPECT_RATIO_BY_FORMAT: Record<string, string> = {
  static_post: "4:5",
  carousel: "4:5",
};

interface CreateJobInput {
  contentSlideId: string;
  attemptNumber?: number;
}

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly falFlux: FalFluxProvider,
    private readonly config: ConfigService,
  ) {}

  async createJob(workspaceId: string, input: CreateJobInput) {
    if (!this.falFlux.isConfigured()) {
      throw new NotImplementedException("Geração de imagem por IA não configurada (FAL_API_KEY ausente).");
    }

    const slide = await this.prisma.contentSlide.findFirst({
      where: { id: input.contentSlideId, contentPiece: { workspaceId } },
      include: {
        contentPiece: {
          include: {
            template: true,
            workspace: { include: { brandKit: true } },
          },
        },
      },
    });
    if (!slide) throw new NotFoundException("Slide não encontrado.");

    const brandKit = slide.contentPiece.workspace.brandKit;
    const zones = ((slide.contentPiece.template?.slotMap as { zones?: unknown[] } | null)?.zones ?? []) as {
      id: string;
      type: "text" | "image" | "logo";
      slideIndex?: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }[];

    const referenceWeight =
      this.config.get<number>("IMAGE_GEN_REFERENCE_WEIGHT") ?? DEFAULT_REFERENCE_WEIGHT;
    const referenceImageUrls = ((brandKit?.referenceImages as string[] | undefined) ?? []).slice(
      0,
      MAX_REFERENCE_IMAGES,
    );
    const aspectRatio = ASPECT_RATIO_BY_FORMAT[slide.contentPiece.format] ?? "4:5";

    const { assembledPrompt } = await this.promptBuilder.build({
      brandName: slide.contentPiece.workspace.name,
      niche: brandKit?.niche ?? null,
      toneOfVoice: brandKit?.toneOfVoice ?? null,
      colorPalette: (brandKit?.colorPalette as Record<string, string> | null) ?? null,
      copyText: slide.slideText,
      zones,
      slideIndex: slide.slideOrder,
      aspectRatio,
      referenceImageUrls,
      referenceWeight,
    });

    const job = await this.prisma.imageGenerationJob.create({
      data: {
        contentSlideId: input.contentSlideId,
        assembledPrompt,
        modelProvider: this.falFlux.providerName,
        referenceImagesUsed: referenceImageUrls as unknown as Prisma.InputJsonValue,
        attemptNumber: input.attemptNumber ?? 1,
        status: "pending",
      },
    });

    try {
      const result = await this.falFlux.generate({
        prompt: assembledPrompt,
        referenceImageUrls,
        referenceWeight,
        aspectRatio,
      });
      // status continua 'pending' de proposito (spec 017, fluxo de execucao passo 5) —
      // o QA por visao (spec 018) e' quem decide aprovar/reprovar o resultado.
      return await this.prisma.imageGenerationJob.update({
        where: { id: job.id },
        data: { resultImageUrl: result.imageUrl, status: "pending" },
      });
    } catch (err) {
      this.logger.error(`Falha ao gerar imagem (job ${job.id}): ${(err as Error).message}`);
      return this.prisma.imageGenerationJob.update({
        where: { id: job.id },
        data: { status: "failed" },
      });
    }
  }

  async getJob(workspaceId: string, id: string) {
    const job = await this.prisma.imageGenerationJob.findFirst({
      where: { id, contentSlide: { contentPiece: { workspaceId } } },
    });
    if (!job) throw new NotFoundException("Job não encontrado.");
    return job;
  }
}
