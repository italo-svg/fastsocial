import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { BrandKitContext, RawSignal, TrendSource } from "./trend-source.interface";

// Desabilitado por padrao (ENABLE_COMPETITOR_SCRAPING != "true") ate validacao
// juridica de ToS/robots.txt por rede (spec 021). A implementacao real de scraping
// fica fora do escopo do MVP — esta fonte existe so' para a interface TrendSource
// ficar completa e o gate de habilitacao ser testavel (CA-03): mesmo que o codigo
// exista, fetch() nunca executa scraping de verdade sem a flag ligada.
@Injectable()
export class CompetitorScrapingSource implements TrendSource {
  readonly sourceName = "competitor_scraping";

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<string>("ENABLE_COMPETITOR_SCRAPING") === "true";
  }

  async fetch(_brandKit: BrandKitContext): Promise<RawSignal[]> {
    if (!this.isEnabled()) return [];
    // TODO: scraping real de perfis publicos dos concorrentes, respeitando
    // robots.txt/ToS por rede — gap conhecido do MVP (spec 021).
    return [];
  }
}
