import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TokenEncryptionService } from "../../common/services/token-encryption.service";
import type { CollectedMetrics, NetworkMetricsCollector, PublicationForCollection } from "./metrics-collector.interface";

const API_BASE = "https://api.linkedin.com";

interface ShareStatisticsResponse {
  elements: {
    totalShareStatistics: {
      impressionCount?: number;
      shareCount?: number;
      likeCount?: number;
      commentCount?: number;
      clickCount?: number;
    };
  }[];
}

// LinkedIn (Caminho B, spec 029) — FastSocial guarda o access_token cifrado
// diretamente, então a coleta é direta na API do LinkedIn, sem depender do
// Postiz. Endpoint `organizationalEntityShareStatistics` (LinkedIn-Version
// 202501, mesma versão usada em linkedin-oauth.service.ts/linkedin-publish.service.ts)
// — revisar contra a documentação vigente antes de habilitar em produção,
// como os specs 029/038 já antecipam.
//
// A API do LinkedIn NÃO expõe "reach" (alcance único) nem "saves" no nível de
// post via este endpoint — ficam explicitamente `null` (CA-02), nunca 0.
@Injectable()
export class LinkedInCollector implements NetworkMetricsCollector {
  constructor(
    private readonly config: ConfigService,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {}

  supports(network: string): boolean {
    return network === "linkedin";
  }

  private get linkedInApiVersion(): string {
    return this.config.get<string>("LINKEDIN_API_VERSION") ?? "202501";
  }

  async collect(publication: PublicationForCollection): Promise<CollectedMetrics> {
    if (!publication.postizReferenceId) {
      throw new Error("Publication sem postUrn do LinkedIn (postizReferenceId nulo) — não publicada ou publicação falhou.");
    }

    const accessToken = this.tokenEncryption.decrypt(publication.socialAccount.accessTokenEncrypted);
    const organizationUrn = `urn:li:organization:${publication.socialAccount.externalAccountId}`;
    const shareUrn = publication.postizReferenceId;

    const params = new URLSearchParams({
      q: "organizationalEntity",
      organizationalEntity: organizationUrn,
    });
    params.append("shares[0]", shareUrn);

    const res = await fetch(`${API_BASE}/rest/organizationalEntityShareStatistics?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": this.linkedInApiVersion,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (!res.ok) {
      throw new Error(`Falha ao coletar estatísticas do LinkedIn: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as ShareStatisticsResponse;
    const stats = json.elements[0]?.totalShareStatistics;
    if (!stats) {
      throw new Error("Resposta do LinkedIn sem totalShareStatistics para este post.");
    }

    return {
      reach: null,
      impressions: stats.impressionCount ?? null,
      likes: stats.likeCount ?? null,
      comments: stats.commentCount ?? null,
      shares: stats.shareCount ?? null,
      saves: null,
    };
  }
}
