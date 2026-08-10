import { Injectable, Logger } from "@nestjs/common";
import { AnthropicService } from "../common/services/anthropic.service";
import { SystemPromptsService } from "../system-prompts/system-prompts.service";

export type TextZonePosition = "top" | "bottom" | "left" | "right" | "center";

export interface BuildSceneBriefInput {
  copyText: string;
  niche: string;
  toneKeywords: string[];
  textZonePosition: TextZonePosition;
}

const MAX_SCENE_SENTENCES = 3;

const NEGATIVE_SPACE_BY_POSITION: Record<TextZonePosition, string> = {
  top: "Composition leaves clear negative space in the top third for text overlay.",
  bottom: "Composition leaves clear negative space in the bottom third for text overlay.",
  left: "Composition leaves clear negative space on the left side for text overlay.",
  right: "Composition leaves clear negative space on the right side for text overlay.",
  center: "Composition leaves clear negative space in the center for text overlay.",
};

// Isolado do prompt-builder.service.ts (spec 017) de proposito — permite ajustar a
// qualidade da "direcao de cena" isoladamente do resto da montagem de prompt
// (ancoras tecnicas, negative list etc. sao fixas e nao precisam de LLM; so a cena
// em si precisa). Ver spec 023, Notas de Implementacao.
@Injectable()
export class SceneDirectorService {
  private readonly logger = new Logger(SceneDirectorService.name);

  constructor(
    private readonly anthropic: AnthropicService,
    private readonly systemPrompts: SystemPromptsService,
  ) {}

  async buildSceneBrief(input: BuildSceneBriefInput): Promise<string> {
    const negativeSpaceInstruction = NEGATIVE_SPACE_BY_POSITION[input.textZonePosition];
    const fallback =
      `A clean, editorial-style scene relevant to the ${input.niche} niche, softly lit and uncluttered. ` +
      negativeSpaceInstruction;

    let sceneText: string;
    try {
      const system = await this.systemPrompts.get("scene_director");
      sceneText =
        (await this.anthropic.complete({
          system,
          prompt:
            `Tema do post: "${input.copyText}"\nNicho: ${input.niche}\n` +
            `Tom: ${input.toneKeywords.join(", ") || "não informado"}\n` +
            `Instrução de espaço negativo a incluir: "${negativeSpaceInstruction}"`,
          maxTokens: 200,
        })) || fallback;
    } catch (err) {
      this.logger.warn(`Falha ao gerar scene brief via Claude, usando fallback: ${(err as Error).message}`);
      sceneText = fallback;
    }

    return this.finalize(sceneText, negativeSpaceInstruction);
  }

  // Garante CA-02 (instrucao de espaco negativo sempre presente e correta) e CA-03
  // (nunca mais que ~3 frases) mesmo que a resposta do LLM nao siga as instrucoes
  // perfeitamente — rede de seguranca deterministica sobre uma saida nao-deterministica.
  private finalize(text: string, negativeSpaceInstruction: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text.trim()];
    const capped = sentences.slice(0, MAX_SCENE_SENTENCES).join(" ").trim();
    return capped.includes(negativeSpaceInstruction)
      ? capped
      : `${capped} ${negativeSpaceInstruction}`.trim();
  }
}
