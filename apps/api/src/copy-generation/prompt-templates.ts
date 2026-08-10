import type { AnthropicToolDefinition } from "../common/services/anthropic.service";

export type CopyFormat = "static_post" | "carousel" | "reels_script";

export interface CopyPromptParams {
  format: CopyFormat;
  niche: string | null;
  toneOfVoice: string | null;
  contextText: string;
  slideCount?: number;
  variationHint?: string;
}

// formatInstruction vem do banco (spec 048, SystemPromptsService.get(`copy_generation_${format}`))
// em vez de hardcoded aqui — brandContext/contextText/variationText continuam
// montados em código porque são dados dinâmicos, não instrução editável.
export function buildCopyPrompt(params: CopyPromptParams, formatInstruction: string): string {
  const { niche, toneOfVoice, contextText, variationHint } = params;
  const brandContext = `Nicho da marca: ${niche ?? "não informado"}. Tom de voz: ${toneOfVoice ?? "não informado"}.`;
  const variationText = variationHint
    ? `\n\nInstrução adicional para esta variação: ${variationHint}.`
    : "";

  return `${brandContext}\n\nContexto/briefing: ${contextText}\n\n${formatInstruction}${variationText}`;
}

export function buildCopyTool(format: CopyFormat): AnthropicToolDefinition {
  if (format === "reels_script") {
    return {
      name: "submit_reels_script",
      description: "Envia o roteiro de reels estruturado, dividido em cenas com marcação de tempo.",
      input_schema: {
        type: "object",
        properties: {
          scenes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timeRange: { type: "string" },
                text: { type: "string" },
              },
              required: ["timeRange", "text"],
            },
          },
        },
        required: ["scenes"],
      },
    };
  }

  return {
    name: "submit_copy_slides",
    description: "Envia o texto de cada slide/legenda gerado, em ordem.",
    input_schema: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              order: { type: "number" },
              text: { type: "string" },
            },
            required: ["order", "text"],
          },
        },
      },
      required: ["slides"],
    },
  };
}
