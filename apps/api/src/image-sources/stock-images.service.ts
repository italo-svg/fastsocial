import { Injectable, NotImplementedException } from "@nestjs/common";
import { UnsplashAdapter } from "./adapters/unsplash.adapter";
import { PexelsAdapter } from "./adapters/pexels.adapter";
import type {
  ImageOrientation,
  NormalizedStockImage,
  StockImageAdapter,
} from "./adapters/stock-image-adapter.interface";

const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  results: NormalizedStockImage[];
}

export interface StockImageSearchResult {
  results: NormalizedStockImage[];
  cacheHit: boolean;
}

export interface StockImagesStatus {
  configured: boolean;
  provider: string | null;
}

@Injectable()
export class StockImagesService {
  // Cache em memoria (nao Redis) — desvio consciente do spec 016: o unico Redis do
  // VPS pertence ao Postiz (volupia_postiz-redis) e nao deve ser compartilhado entre
  // produtos; subir um Redis dedicado so para este cache simples de 1h nao se
  // justificava no MVP. Reavaliar se o servico escalar para multiplas instancias.
  private readonly cache = new Map<string, CacheEntry>();
  private readonly adapters: StockImageAdapter[];

  constructor(unsplash: UnsplashAdapter, pexels: PexelsAdapter) {
    this.adapters = [unsplash, pexels];
  }

  private getActiveAdapter(): StockImageAdapter | null {
    return this.adapters.find((adapter) => adapter.isConfigured()) ?? null;
  }

  getStatus(): StockImagesStatus {
    const active = this.getActiveAdapter();
    return { configured: !!active, provider: active?.providerName ?? null };
  }

  async search(query: string, orientation?: ImageOrientation): Promise<StockImageSearchResult> {
    const active = this.getActiveAdapter();
    if (!active) {
      throw new NotImplementedException("Nenhuma fonte de banco de imagens configurada.");
    }

    const cacheKey = `${active.providerName}:${query.toLowerCase()}:${orientation ?? ""}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { results: cached.results, cacheHit: true };
    }

    const results = await active.search(query, orientation);
    this.cache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
    return { results, cacheHit: false };
  }
}
