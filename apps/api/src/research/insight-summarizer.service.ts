import { Injectable, Logger } from "@nestjs/common";
import { AnthropicService } from "../common/services/anthropic.service";
import type { RawSignal } from "./sources/trend-source.interface";

export interface SynthesizedInsight {
  summary: string;
  relevanceScore: number;
  suggestedFormat: "static_post" | "carousel" | "reels_script";
  sourceRefs: string[];
}

@Injectable()
export class InsightSummarizerService {
  private readonly logger = new Logger(InsightSummarizerService.name);

  constructor(private readonly anthropic: AnthropicService) {}

  // Uma unica chamada a Claude por scan, nunca uma por sinal coletado (CA-04,
  // spec 021) — custo e latencia previsiveis independente de quantos sinais
  // as fontes habilitadas retornarem.
  async summarize(signals: RawSignal[], niche: string | null): Promise<SynthesizedInsight[]> {
    if (signals.length === 0) return [];

    try {
      const raw = await this.anthropic.complete({
        system:
          "Você é um analista de marketing. Agrupe sinais semelhantes em temas, atribua relevanceScore " +
          '(0-10, sempre numérico, nunca omitir) e suggestedFormat ("static_post"|"carousel"|"reels_script") ' +
          "a cada tema, e escreva o summary em português, tom analítico e acionável (ex: \"Concorrente X está " +
          'publicando bastidores de produção com alto engajamento — considerar formato carrossel mostrando ' +
          'processo\"). Responda APENAS com um array JSON válido de objetos ' +
          '{"summary":string,"relevanceScore":number,"suggestedFormat":string,"sourceRefs":string[]}, sem texto fora do array.',
        prompt: this.buildPrompt(signals, niche),
        maxTokens: 1500,
      });
      return this.parseResult(raw);
    } catch (err) {
      this.logger.warn(`Falha ao sintetizar insights via Claude: ${(err as Error).message}`);
      return [];
    }
  }

  private buildPrompt(signals: RawSignal[], niche: string | null): string {
    const signalsText = signals
      .map((s, i) => `${i + 1}. [${s.sourceType}/${s.sourceRef}] ${s.rawText}`)
      .join("\n");
    return `Nicho da marca: ${niche ?? "não informado"}.\n\nSinais coletados:\n${signalsText}`;
  }

  private parseResult(raw: string): SynthesizedInsight[] {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      this.logger.warn("Resposta da Anthropic não continha um array JSON válido.");
      return [];
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<SynthesizedInsight>[];
      return parsed
        .filter((item) => typeof item.summary === "string" && typeof item.relevanceScore === "number")
        .map((item) => ({
          summary: item.summary!,
          relevanceScore: item.relevanceScore!,
          suggestedFormat: (item.suggestedFormat as SynthesizedInsight["suggestedFormat"]) ?? "static_post",
          sourceRefs: item.sourceRefs ?? [],
        }));
    } catch {
      this.logger.warn("Falha ao fazer parse do JSON retornado pela Anthropic.");
      return [];
    }
  }
}
