import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AnthropicService } from "../common/services/anthropic.service";
import { ImageGenerationService } from "./image-generation.service";
import type { QaVisionResult } from "./dto/qa-result.dto";

const DEFAULT_THRESHOLD = 6.0;
const MAX_GENERATION_ATTEMPTS = 3;
const MAX_ANTHROPIC_RETRIES = 3;

interface BrandKitContext {
  niche: string | null;
  toneOfVoice: string | null;
  colorPalette: Record<string, string> | null;
}

@Injectable()
export class QaVisionService {
  private readonly logger = new Logger(QaVisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly imageGenerationService: ImageGenerationService,
    private readonly config: ConfigService,
  ) {}

  async evaluate(workspaceId: string, jobId: string) {
    const job = await this.prisma.imageGenerationJob.findFirst({
      where: { id: jobId, contentSlide: { contentPiece: { workspaceId } } },
      include: {
        contentSlide: {
          include: { contentPiece: { include: { workspace: { include: { brandKit: true } } } } },
        },
      },
    });
    if (!job) throw new NotFoundException("Job não encontrado.");
    if (!job.resultImageUrl) {
      throw new BadRequestException("Job ainda não tem imagem resultante para avaliar.");
    }

    const brandKit = job.contentSlide.contentPiece.workspace.brandKit;
    const brandKitContext: BrandKitContext = {
      niche: brandKit?.niche ?? null,
      toneOfVoice: brandKit?.toneOfVoice ?? null,
      colorPalette: (brandKit?.colorPalette as Record<string, string> | null) ?? null,
    };

    let result: QaVisionResult;
    try {
      result = await this.callVisionWithRetry(job.resultImageUrl, brandKitContext);
    } catch (err) {
      this.logger.error(`QA de visão falhou após ${MAX_ANTHROPIC_RETRIES} tentativas (job ${jobId}): ${(err as Error).message}`);
      // Falha de infraestrutura (nao de qualidade da imagem) — escala para humano por
      // seguranca em vez de aprovar as cegas ou travar o worker (CA-06, spec 018).
      return this.prisma.imageGenerationJob.update({
        where: { id: jobId },
        data: { status: "qa_failed" },
      });
    }

    const average = (result.brandFitScore + result.artifactScore + result.negativeSpaceScore) / 3;
    const threshold = this.config.get<number>("IMAGE_QA_THRESHOLD") ?? DEFAULT_THRESHOLD;
    const scoreData = {
      qaBrandFitScore: result.brandFitScore,
      qaArtifactScore: result.artifactScore,
      qaNegativeSpaceScore: result.negativeSpaceScore,
    };

    if (average >= threshold) {
      await this.prisma.contentSlide.update({
        where: { id: job.contentSlideId },
        data: { backgroundImageUrl: job.resultImageUrl },
      });
      return this.prisma.imageGenerationJob.update({
        where: { id: jobId },
        data: { ...scoreData, status: "qa_passed" },
      });
    }

    if (job.attemptNumber < MAX_GENERATION_ATTEMPTS) {
      await this.prisma.imageGenerationJob.update({
        where: { id: jobId },
        data: { ...scoreData, status: "qa_rejected" },
      });
      return this.imageGenerationService.createJob(workspaceId, {
        contentSlideId: job.contentSlideId,
        attemptNumber: job.attemptNumber + 1,
      });
    }

    return this.prisma.imageGenerationJob.update({
      where: { id: jobId },
      data: { ...scoreData, status: "escalated_to_human" },
    });
  }

  private async callVisionWithRetry(imageUrl: string, brandKit: BrandKitContext): Promise<QaVisionResult> {
    let lastError: Error = new Error("Nenhuma tentativa executada.");
    for (let attempt = 1; attempt <= MAX_ANTHROPIC_RETRIES; attempt++) {
      try {
        return await this.callVision(imageUrl, brandKit);
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`Tentativa ${attempt}/${MAX_ANTHROPIC_RETRIES} de QA por visão falhou: ${lastError.message}`);
      }
    }
    throw lastError;
  }

  private async callVision(imageUrl: string, brandKit: BrandKitContext): Promise<QaVisionResult> {
    const prompt = this.buildEvaluationPrompt(brandKit);
    const raw = await this.anthropic.completeWithImage({
      system:
        "Você é um QA de fidelidade de marca para imagens geradas por IA. Responda APENAS com um JSON " +
        'válido no formato {"brandFitScore":number,"artifactScore":number,"negativeSpaceScore":number,' +
        '"reasoning":string}, notas de 0 a 10, sem nenhum texto fora do JSON.',
      prompt,
      imageUrl,
      maxTokens: 300,
    });
    return this.parseResult(raw);
  }

  private buildEvaluationPrompt(brandKit: BrandKitContext): string {
    const paletteDescription = brandKit.colorPalette
      ? Object.entries(brandKit.colorPalette)
          .map(([role, hex]) => `${role}: ${hex}`)
          .join(", ")
      : "não definida";

    return (
      `Avalie esta imagem gerada por IA para uma marca do nicho "${brandKit.niche ?? "não informado"}", ` +
      `tom de voz "${brandKit.toneOfVoice ?? "não informado"}", paleta de cores (${paletteDescription}).\n\n` +
      "brandFitScore: a imagem usa cores/estilo consistentes com a marca descrita?\n" +
      "artifactScore: nota alta = poucos artefatos de IA visíveis (mãos/rostos distorcidos, simetria " +
      "anormal, texto fantasma ilegível, watermark residual); nota baixa = artefatos evidentes.\n" +
      "negativeSpaceScore: existe uma área visualmente calma o suficiente para um texto ficar legível por cima?"
    );
  }

  private parseResult(raw: string): QaVisionResult {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Resposta da Anthropic não continha JSON válido.");
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<QaVisionResult>;
    const { brandFitScore, artifactScore, negativeSpaceScore, reasoning } = parsed;
    if (
      typeof brandFitScore !== "number" ||
      typeof artifactScore !== "number" ||
      typeof negativeSpaceScore !== "number"
    ) {
      throw new Error("Resposta da Anthropic não continha os 3 scores numéricos esperados.");
    }

    return { brandFitScore, artifactScore, negativeSpaceScore, reasoning: reasoning ?? "" };
  }
}
