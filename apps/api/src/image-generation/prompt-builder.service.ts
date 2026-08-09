import { Injectable, Logger } from "@nestjs/common";
import { AnthropicService } from "../common/services/anthropic.service";

// Copiada literalmente do PRD Secao 7.7 — nunca editar sem atualizar a fonte normativa.
const NEGATIVE_LIST =
  "no legible text, no logos, no watermarks, no distorted hands or faces, no plastic-looking skin, " +
  "no AI-generated symmetrical face artifacts, no oversaturated HDR, no generic stock-photo composition, " +
  "no clipart, no extra limbs, no uncanny-valley expressions";

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

  constructor(private readonly anthropic: AnthropicService) {}

  async build(params: BuildPromptParams): Promise<BuiltPrompt> {
    const negativeSpaceHint = this.describeNegativeSpace(params.zones, params.slideIndex);

    const toneKeywords = await this.extractToneKeywords(params.toneOfVoice, params.niche);
    const colorStory = this.describeColors(params.colorPalette);
    const brandIdentityLock =
      `Photography direction for ${params.brandName}, a ${params.niche ?? "unspecified"} brand. ` +
      `Visual signature: ${toneKeywords}. Color story: ${colorStory}, used only as accent tones in props, ` +
      "wardrobe or lighting gel — never as a flat graphic background fill.";

    const sceneBrief = await this.buildSceneBrief(params.copyText, params.niche, negativeSpaceHint);

    const technicalSpec =
      "Photographic technical spec: natural lighting, shallow depth of field (f/2.0-f/2.8), " +
      `35mm lens perspective, subtle film grain texture, no digital sharpening halos. Aspect ratio ${params.aspectRatio}.`;

    const referenceConditioning =
      params.referenceImageUrls.length > 0
        ? `Reference conditioning: ${params.referenceImageUrls.length} brand reference image(s) attached, weight ${params.referenceWeight}.`
        : "No brand reference images available for this workspace — generating without conditioning (fidelity not guaranteed).";

    const negativeListLayer = `Exclusion list: ${NEGATIVE_LIST}.`;

    const slotConstraint =
      "Generate background/scene only — this image will be composited with logo and text afterward. " +
      `Leave the designated text-safe zone visually calm. ${negativeSpaceHint}`.trim();

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

  private async extractToneKeywords(toneOfVoice: string | null, niche: string | null): Promise<string> {
    const fallback = "clean, modern, authentic";
    if (!toneOfVoice) return fallback;

    try {
      const result = await this.anthropic.complete({
        system:
          "Extraia de 3 a 5 palavras-chave visuais em inglês (separadas por vírgula) que traduzam o tom de " +
          "voz de uma marca em direção fotográfica. Responda apenas com as palavras-chave, nada mais.",
        prompt: `Nicho: ${niche ?? "não informado"}. Tom de voz: ${toneOfVoice}`,
        maxTokens: 50,
      });
      return result || fallback;
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

  private describeNegativeSpace(zones: PromptZone[], slideIndex: number): string {
    const slideZones = zones.filter((z) => (z.slideIndex ?? 0) === slideIndex);
    const textZone = slideZones.find((z) => z.type === "text");
    if (!textZone || slideZones.length === 0) return "";

    const maxBottom = Math.max(...slideZones.map((z) => z.y + z.height));
    if (maxBottom === 0) return "";

    const textCenter = textZone.y + textZone.height / 2;
    const relative = textCenter / maxBottom;

    if (relative < 0.34) return "Leave clear negative space in the top third of the frame.";
    if (relative < 0.67) return "Leave clear negative space in the middle third of the frame.";
    return "Leave clear negative space in the bottom third of the frame.";
  }

  private async buildSceneBrief(
    copyText: string | null,
    niche: string | null,
    negativeSpaceHint: string,
  ): Promise<string> {
    const fallback = (
      `A clean, editorial-style scene relevant to the ${niche ?? "brand"} niche, softly lit and uncluttered. ` +
      negativeSpaceHint
    ).trim();

    const context = copyText
      ? `Contexto temático do post (NÃO renderizar este texto na imagem, é só contexto): "${copyText}"`
      : `Nicho: ${niche ?? "geral"}.`;

    try {
      const result = await this.anthropic.complete({
        system:
          "Você é um diretor de fotografia. Escreva 2-3 frases em inglês descrevendo cenário, sujeito, ação e " +
          "mood para uma foto still-life ou lifestyle — nunca mencione texto, palavras ou tipografia na cena. " +
          "Incorpore a instrução de espaço negativo se ela for fornecida.",
        prompt: `${context}\n${negativeSpaceHint}`,
        maxTokens: 150,
      });
      return result || fallback;
    } catch (err) {
      this.logger.warn(`Falha ao gerar scene brief via Claude, usando fallback: ${(err as Error).message}`);
      return fallback;
    }
  }
}
