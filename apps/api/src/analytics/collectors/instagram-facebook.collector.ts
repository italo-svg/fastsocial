import { Injectable } from "@nestjs/common";
import type { CollectedMetrics, NetworkMetricsCollector, PublicationForCollection } from "./metrics-collector.interface";

// Instagram/Facebook (Caminho A, spec 028) — DECISÃO DOCUMENTADA (spec 038):
// contas Meta são custodiadas pelo Postiz reusado (spec 027/028), então o
// FastSocial NUNCA guarda o access_token real do Meta em social_accounts —
// só a referência da integração no Postiz. A API pública do Postiz v2.11.3
// (validada ao vivo nos specs 027/028) expõe apenas `/integrations` (listar)
// e `/posts` (publicar) — nenhum endpoint de insights/estatísticas, e nenhuma
// forma de "exportar" o token real para uma chamada pontual à Graph API.
//
// Isso significa que a coleta de métricas de Instagram/Facebook está
// BLOQUEADA pela mesma lacuna arquitetural já registrada no spec 028
// ("cliente nunca vê o Postiz" quebra também aqui, não só no primeiro
// connect): não há caminho técnico atual para buscar reach/impressions/likes
// de um post do Instagram publicado via Postiz sem acesso direto a ele.
//
// Três saídas possíveis, nenhuma implementada aqui (decisão de produto, não
// técnica — registrar no PRD/roadmap):
//   (a) pedir ao Postiz um endpoint de API pública para insights por post;
//   (b) migrar Meta para Caminho B (FastSocial com App próprio + token
//       custodiado direto, como já foi feito para o LinkedIn no spec 029);
//   (c) aceitar que analytics de Instagram/Facebook fica indisponível
//       enquanto (a) ou (b) não acontecerem.
// Lançar erro claro em vez de fingir uma chamada que não pode funcionar.
@Injectable()
export class InstagramFacebookCollector implements NetworkMetricsCollector {
  supports(network: string): boolean {
    return network === "instagram" || network === "facebook";
  }

  async collect(_publication: PublicationForCollection): Promise<CollectedMetrics> {
    throw new Error(
      "Coleta de métricas de Instagram/Facebook ainda não é possível: a conta é custodiada pelo Postiz " +
        "(Caminho A, spec 028) e a API pública dele não expõe insights nem o token real. " +
        "Ver comentário no topo de instagram-facebook.collector.ts para as opções de resolução.",
    );
  }
}
