import { Injectable, Logger } from "@nestjs/common";
import { AnthropicService } from "../common/services/anthropic.service";
import { SystemPromptsService, interpolate } from "../system-prompts/system-prompts.service";
import { SceneDirectorService, type TextZonePosition } from "./scene-director.service";

interface PromptZone {
  id: string;
  type: "text" | "image" | "logo";
  slideIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BuildPromptParams {
  brandName: string;
  niche: string | null;
  toneOfVoice: string | null;
  colorPalette: Record<string, string> | null;
  copyText: string | null;
  zones: PromptZone[];
  slideIndex: number;
  aspectRatio: string;
  referenceImageUrls: string[];
  referenceWeight: number;
}

export interface BuiltPrompt {
  assembledPrompt: string;
}

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  constructor(
    private readonly anthropic: AnthropicService,
    private readonly sceneDirector: SceneDirectorService,
    private readonly systemPrompts: SystemPromptsService,
  ) {}

  async build(params: BuildPromptParams): Promise<BuiltPrompt> {
    const textZonePosition = this.determineTextZonePosition(params.zones, params.slideIndex);

    const toneKeywords = await this.extractToneKeywords(params.toneOfVoice, params.niche);
    const colorStory = this.describeColors(params.colorPalette);
    const brandIdentityLockTemplate = await this.systemPrompts.get("image_brand_identity_lock_template");
    const brandIdentityLock = interpolate(brandIdentityLockTemplate, {
      brandName: params.brandName,
      niche: params.niche ?? "unspecified",
      toneKeywords: toneKeywords.join(", "),
      colorStory,
    });

    // Camada 2 delegada ao servico dedicado (spec 023) — mantem a "criatividade de
    // cena" isolada e testavel separadamente do resto da montagem de prompt.
    const sceneBrief = await this.sceneDirector.buildSceneBrief({
      copyText: params.copyText ?? "",
      niche: params.niche ?? "geral",
      toneKeywords,
      textZonePosition,
    });

    const technicalSpec =
      "Photographic technical spec: natural lighting, shallow depth of field (f/2.0-f/2.8), " +
      `35mm lens perspective, subtle film grain texture, no digital sharpening halos. Aspect ratio ${params.aspectRatio}.`;

    const referenceConditioning =
      params.referenceImageUrls.length > 0
        ? `Reference conditioning: ${params.referenceImageUrls.length} brand reference image(s) attached, weight ${params.referenceWeight}.`
        : "No brand reference images available for this workspace — generating without conditioning (fidelity not guaranteed).";

    const negativeList = await this.systemPrompts.get("image_negative_list");
    const negativeListLayer = `Exclusion list: ${negativeList}.`;

    const slotConstraint = await this.systemPrompts.get("image_slot_constraint");

    const assembledPrompt = [
      `[BRAND IDENTITY LOCK]\n${brandIdentityLock}`,
      `[SCENE BRIEF]\n${sceneBrief}`,
      `[PHOTOGRAPHIC TECHNICAL SPEC]\n${technicalSpec}`,
      `[REFERENCE CONDITIONING]\n${referenceConditioning}`,
      `[NEGATIVE / EXCLUSION LIST]\n${negativeListLayer}`,
      `[SLOT CONSTRAINT]\n${slotConstraint}`,
    ].join("\n\n");

    return { assembledPrompt };
  }

  private async extractToneKeywords(toneOfVoice: string | null, niche: string | null): Promise<string[]> {
    const fallback = ["clean", "modern", "authentic"];
    if (!toneOfVoice) return fallback;

    try {
      const result = await this.anthropic.complete({
        system:
          "Extraia de 3 a 5 palavras-chave visuais em inglês (separadas por vírgula) que traduzam o tom de " +
          "voz de uma marca em direção fotográfica. Responda apenas com as palavras-chave, nada mais.",
        prompt: `Nicho: ${niche ?? "não informado"}. Tom de voz: ${toneOfVoice}`,
        maxTokens: 50,
      });
      const keywords = result
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      return keywords.length > 0 ? keywords : fallback;
    } catch (err) {
      this.logger.warn(`Falha ao extrair tone keywords via Claude, usando fallback: ${(err as Error).message}`);
      return fallback;
    }
  }

  private describeColors(colorPalette: Record<string, string> | null): string {
    if (!colorPalette || Object.keys(colorPalette).length === 0) {
      return "neutral, brand-agnostic tones";
    }
    return Object.entries(colorPalette)
      .map(([role, hex]) => `${role} (${hex})`)
      .join(", ");
  }

  private determineTextZonePosition(zones: PromptZone[], slideIndex: number): TextZonePosition {
    const slideZones = zones.filter((z) => (z.slideIndex ?? 0) === slideIndex);
    const textZone = slideZones.find((z) => z.type === "text");
    if (!textZone || slideZones.length === 0) return "bottom";

    const maxBottom = Math.max(...slideZones.map((z) => z.y + z.height));
    const maxRight = Math.max(...slideZones.map((z) => z.x + z.width));
    if (maxBottom === 0 || maxRight === 0) return "bottom";

    const relativeY = (textZone.y + textZone.height / 2) / maxBottom;
    const relativeX = (textZone.x + textZone.width / 2) / maxRight;

    if (relativeY < 0.34) return "top";
    if (relativeY > 0.67) return "bottom";
    if (relativeX < 0.34) return "left";
    if (relativeX > 0.67) return "right";
    return "center";
  }
}
