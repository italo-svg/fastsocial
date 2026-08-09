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

export function buildCopyPrompt(params: CopyPromptParams): string {
  const { format, niche, toneOfVoice, contextText, slideCount, variationHint } = params;
  const brandContext = `Nicho da marca: ${niche ?? "não informado"}. Tom de voz: ${toneOfVoice ?? "não informado"}.`;
  const variationText = variationHint
    ? `\n\nInstrução adicional para esta variação: ${variationHint}.`
    : "";

  if (format === "static_post") {
    return (
      `${brandContext}\n\nContexto/briefing: ${contextText}\n\n` +
      "Escreva uma legenda para um post estático de Instagram/Facebook: um gancho forte na primeira " +
      "linha, seguido da legenda completa (150-300 caracteres no total). Escreva em português do Brasil." +
      variationText
    );
  }

  if (format === "carousel") {
    const count = slideCount ?? 5;
    return (
      `${brandContext}\n\nContexto/briefing: ${contextText}\n\n` +
      `Escreva o texto de cada slide de um carrossel de ${count} slides: o slide 1 é sempre a capa ` +
      `(gancho forte), o slide ${count} é sempre um CTA. Um texto curto por slide. Escreva em português ` +
      "do Brasil." +
      variationText
    );
  }

  return (
    `${brandContext}\n\nContexto/briefing: ${contextText}\n\n` +
    "Escreva um roteiro de Reels/vídeo curto, dividido em cenas com marcação de tempo (formato " +
    '"[0-3s]", "[3-8s]" etc.), cobrindo do gancho inicial ao CTA final. Não gere vídeo, só o texto do ' +
    "roteiro. Escreva em português do Brasil." +
    variationText
  );
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
