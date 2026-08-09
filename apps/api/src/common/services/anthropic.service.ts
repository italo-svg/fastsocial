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
}
