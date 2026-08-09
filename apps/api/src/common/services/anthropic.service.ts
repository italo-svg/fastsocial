import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface AnthropicMessageResponse {
  content: { type: string; text: string }[];
}

interface CompleteParams {
  system?: string;
  prompt: string;
  maxTokens?: number;
}

interface CompleteWithImageParams extends CompleteParams {
  imageUrl: string;
}

export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface CompleteWithToolParams extends CompleteParams {
  tool: AnthropicToolDefinition;
}

// REST puro (nao @anthropic-ai/sdk) — mesma decisao de apps/api/src/common/services/
// storage.service.ts e supabase-admin.service.ts: evitar SDKs completos e suas
// dependencias transitivas quando um fetch simples resolve, reduzindo risco de
// incompatibilidade com Node 20 (ver historico do spec 006/010).
@Injectable()
export class AnthropicService {
  private static readonly DEFAULT_MODEL = "claude-sonnet-5";

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>("ANTHROPIC_API_KEY");
  }

  async complete(params: CompleteParams): Promise<string> {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não configurada.");
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.get<string>("ANTHROPIC_MODEL") ?? AnthropicService.DEFAULT_MODEL,
        max_tokens: params.maxTokens ?? 300,
        ...(params.system ? { system: params.system } : {}),
        messages: [{ role: "user", content: params.prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Falha ao chamar Anthropic API: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as AnthropicMessageResponse;
    return data.content
      .map((block) => block.text)
      .join("")
      .trim();
  }

  // Content block "image" com source tipo "url" — formato mais recente da API de
  // visao da Anthropic; conferir a documentacao atual antes de ligar billing real,
  // mesma ressalva do fal-flux.provider.ts (spec 017) sobre providers externos.
  async completeWithImage(params: CompleteWithImageParams): Promise<string> {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não configurada.");
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.get<string>("ANTHROPIC_MODEL") ?? AnthropicService.DEFAULT_MODEL,
        max_tokens: params.maxTokens ?? 300,
        ...(params.system ? { system: params.system } : {}),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: params.imageUrl } },
              { type: "text", text: params.prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Falha ao chamar Anthropic API (visão): ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as AnthropicMessageResponse;
    return data.content
      .map((block) => block.text)
      .join("")
      .trim();
  }

  // Forca a resposta via tool use (structured output) em vez de pedir "responda em
  // JSON" em texto livre — elimina falha de parsing por formatacao inconsistente
  // (spec 022, Notas de Implementacao). O bloco tool_use.input ja vem parseado pela
  // propria API da Anthropic segundo o input_schema declarado.
  async completeWithTool<T = unknown>(params: CompleteWithToolParams): Promise<T> {
    const apiKey = this.config.get<string>("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não configurada.");
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.get<string>("ANTHROPIC_MODEL") ?? AnthropicService.DEFAULT_MODEL,
        max_tokens: params.maxTokens ?? 1500,
        ...(params.system ? { system: params.system } : {}),
        messages: [{ role: "user", content: params.prompt }],
        tools: [params.tool],
        tool_choice: { type: "tool", name: params.tool.name },
      }),
    });

    if (!res.ok) {
      throw new Error(`Falha ao chamar Anthropic API (tool use): ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { content: { type: string; input?: unknown }[] };
    const toolBlock = data.content.find((block) => block.type === "tool_use");
    if (!toolBlock || toolBlock.input === undefined) {
      throw new Error("Anthropic não retornou um bloco tool_use válido.");
    }

    return toolBlock.input as T;
  }
}
