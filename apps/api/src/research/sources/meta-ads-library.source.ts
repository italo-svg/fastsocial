import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { BrandKitContext, RawSignal, TrendSource } from "./trend-source.interface";

interface AdsArchiveEntry {
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_snapshot_url?: string;
}

interface AdsArchiveResponse {
  data?: AdsArchiveEntry[];
}

const MAX_COMPETITORS_PER_SCAN = 5;

// API publica de app da Meta (Ads Library) — autenticacao de app (access token de
// app), diferente do OAuth de usuario do spec 028. Conferir a documentacao atual
// (versao do Graph API, campos disponiveis) antes de ligar billing real, mesma
// ressalva dos outros providers externos deste projeto (fal.ai, Anthropic).
@Injectable()
export class MetaAdsLibrarySource implements TrendSource {
  readonly sourceName = "meta_ads_library";
  private readonly logger = new Logger(MetaAdsLibrarySource.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return !!this.config.get<string>("META_ADS_LIBRARY_ACCESS_TOKEN");
  }

  async fetch(brandKit: BrandKitContext): Promise<RawSignal[]> {
    const token = this.config.get<string>("META_ADS_LIBRARY_ACCESS_TOKEN");
    if (!token) return [];

    const signals: RawSignal[] = [];
    for (const competitor of brandKit.competitors.slice(0, MAX_COMPETITORS_PER_SCAN)) {
      try {
        const params = new URLSearchParams({
          access_token: token,
          search_terms: competitor,
          ad_type: "ALL",
          ad_reached_countries: "['BR']",
          fields: "ad_creative_bodies,page_name,ad_snapshot_url",
        });
        const res = await fetch(`https://graph.facebook.com/v19.0/ads_archive?${params.toString()}`);
        if (!res.ok) {
          this.logger.warn(`Meta Ads Library falhou para "${competitor}": ${res.status}`);
          continue;
        }
        const data = (await res.json()) as AdsArchiveResponse;
        for (const ad of data.data ?? []) {
          signals.push({
            sourceType: "competitor",
            sourceRef: competitor,
            rawText: (ad.ad_creative_bodies ?? []).join(" "),
            rawUrl: ad.ad_snapshot_url,
          });
        }
      } catch (err) {
        this.logger.warn(`Erro consultando Meta Ads Library para "${competitor}": ${(err as Error).message}`);
      }
    }
    return signals;
  }
}
