import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ImageOrientation, NormalizedStockImage, StockImageAdapter } from "./stock-image-adapter.interface";

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  user: { name: string };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
}

@Injectable()
export class UnsplashAdapter implements StockImageAdapter {
  readonly providerName = "unsplash";

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>("UNSPLASH_ACCESS_KEY");
  }

  async search(query: string, orientation?: ImageOrientation): Promise<NormalizedStockImage[]> {
    const accessKey = this.config.get<string>("UNSPLASH_ACCESS_KEY");
    if (!accessKey) {
      throw new Error("UNSPLASH_ACCESS_KEY não configurada.");
    }

    const params = new URLSearchParams({ query, per_page: "20" });
    if (orientation) params.set("orientation", orientation);

    const res = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      throw new Error(`Falha ao consultar Unsplash: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as UnsplashSearchResponse;
    return data.results.map((photo) => ({
      id: photo.id,
      thumbnailUrl: photo.urls.small,
      fullUrl: photo.urls.regular,
      attribution: `Foto por ${photo.user.name} no Unsplash`,
      provider: "unsplash",
    }));
  }
}
