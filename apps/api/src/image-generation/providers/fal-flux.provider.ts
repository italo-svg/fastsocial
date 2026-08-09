import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ImageGenerationParams,
  ImageGenerationProvider,
  ImageGenerationResult,
} from "./image-generation-provider.interface";

interface FalFluxResponse {
  images?: { url: string }[];
  request_id?: string;
}

// Endpoint e formato de payload conforme documentacao publica do fal.ai no momento da
// implementacao (flux-pro/v1.1-ultra, image-to-image via image_url) — spec 017 pede
// explicitamente para checar a doc atual do provider antes de ligar billing real,
// pois esses parametros mudam entre versoes do modelo.
const FAL_ENDPOINT = "https://fal.run/fal-ai/flux-pro/v1.1-ultra";

@Injectable()
export class FalFluxProvider implements ImageGenerationProvider {
  readonly providerName = "fal-flux";

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>("FAL_API_KEY");
  }

  async generate(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    const apiKey = this.config.get<string>("FAL_API_KEY");
    if (!apiKey) {
      throw new Error("FAL_API_KEY não configurada.");
    }

    const res = await fetch(FAL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio,
        ...(params.referenceImageUrls[0]
          ? { image_url: params.referenceImageUrls[0], image_prompt_strength: params.referenceWeight }
          : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`Falha ao chamar fal.ai: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as FalFluxResponse;
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error("fal.ai não retornou nenhuma imagem.");
    }

    return { imageUrl, providerJobId: data.request_id ?? "unknown" };
  }
}
