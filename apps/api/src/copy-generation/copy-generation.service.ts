import { BadRequestException, Injectable, NotFoundException, NotImplementedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnthropicService } from "../common/services/anthropic.service";
import { SystemPromptsService, interpolate } from "../system-prompts/system-prompts.service";
import { buildCopyPrompt, buildCopyTool } from "./prompt-templates";
import { GenerateCopyDto } from "./dto/generate-copy.dto";

export interface GenerateCopyResponse {
  slides: { order: number; text: string }[];
  scriptScenes?: { timeRange: string; text: string }[];
}

interface CopySlidesToolResult {
  slides?: { order?: number; text?: string }[];
}

interface ReelsScriptToolResult {
  scenes?: { timeRange?: string; text?: string }[];
}

@Injectable()
export class CopyGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly systemPrompts: SystemPromptsService,
  ) {}

  async generate(workspaceId: string, dto: GenerateCopyDto): Promise<GenerateCopyResponse> {
    if (!dto.insightId && !dto.briefing) {
      throw new BadRequestException("Informe insightId ou briefing.");
    }

    if (!this.anthropic.isConfigured()) {
      throw new NotImplementedException("Geração de copy não configurada (ANTHROPIC_API_KEY ausente).");
    }

    let contextText = dto.briefing ?? "";
    if (dto.insightId) {
      const insight = await this.prisma.researchInsight.findFirst({
        where: { id: dto.insightId, workspaceId },
      });
      if (!insight) throw new NotFoundException("Insight não encontrado.");
      contextText = insight.summary;
    }

    const brandKit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
    const slideCount = dto.format === "carousel" ? (dto.slideCount ?? 5) : undefined;

    const formatInstructionTemplate = await this.systemPrompts.get(`copy_generation_${dto.format}`);
    const formatInstruction = interpolate(formatInstructionTemplate, {
      slideCount: String(slideCount ?? 5),
    });

    const prompt = buildCopyPrompt(
      {
        format: dto.format,
        niche: brandKit?.niche ?? null,
        toneOfVoice: brandKit?.toneOfVoice ?? null,
        contextText,
        slideCount,
        variationHint: dto.variationHint,
      },
      formatInstruction,
    );
    const tool = buildCopyTool(dto.format);

    if (dto.format === "reels_script") {
      const result = await this.anthropic.completeWithTool<ReelsScriptToolResult>({
        system: "Você é um redator publicitário brasileiro, especialista em roteiros curtos para redes sociais.",
        prompt,
        tool,
      });
      const scenes = (result.scenes ?? [])
        .filter((s) => typeof s.timeRange === "string" && typeof s.text === "string")
        .map((s) => ({ timeRange: s.timeRange!, text: s.text! }));
      return { slides: [], scriptScenes: scenes };
    }

    const result = await this.anthropic.completeWithTool<CopySlidesToolResult>({
      system: "Você é um redator publicitário brasileiro, especialista em copy para redes sociais.",
      prompt,
      tool,
    });

    const slides = (result.slides ?? [])
      .filter((s) => typeof s.order === "number" && typeof s.text === "string")
      .sort((a, b) => a.order! - b.order!)
      .map((s) => ({ order: s.order!, text: s.text! }));

    return { slides };
  }
}
