# 021 Conector de Pesquisa de Fontes

## Objetivo
Implementar a varredura efetiva de tendências/concorrentes a partir de fontes externas configuráveis, resumindo o resultado bruto em `research_insights` estruturados via LLM.

## Contexto
Segue o spec `020` (que expõe o endpoint que dispara este serviço). Ver PRD módulo 3 (Pesquisa & Inteligência de Tendências) e Seção 7.2 ("Pipeline de pesquisa"). Este é o spec com maior dependência de credenciais externas e maior incerteza de "o que está realmente disponível" — deve ser implementado com fontes plugáveis e degradar graciosamente quando uma fonte não está configurada.

## Stack
- **Framework**: NestJS, worker BullMQ (consome a fila publicada pelo `POST /research-insights/scan` do spec `020`).
- **Fontes candidatas (cada uma um adapter independente, habilitado só se a credencial existir)**:
  - **Meta Ads Library API** (pública, não requer app review — bom ponto de partida real para benchmarking de anúncios de concorrentes).
  - **Scraping autorizado de perfis públicos** dos concorrentes cadastrados no brand kit — implementar com cautela, respeitando robots.txt/ToS; se incerto, deixar como adapter desabilitado por padrão (`ENABLE_COMPETITOR_SCRAPING=false`) até validação jurídica.
  - **API de hashtag/trend** — nenhuma API gratuita robusta e estável costuma existir para isso; implementar como adapter "stub" que retorna vazio até um provider real ser escolhido, documentado claramente como gap conhecido do MVP.
- **Resumo/síntese**: Claude (Anthropic API), reusando `AnthropicService`.
- **Variáveis de ambiente necessárias**: `META_ADS_LIBRARY_ACCESS_TOKEN` (token de app da Meta, não confundir com o OAuth de usuário do spec `028` — Ads Library API usa autenticação de app), `ENABLE_COMPETITOR_SCRAPING`, `ANTHROPIC_API_KEY`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `020-pesquisa-tendencias-api`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/research/research-scan.processor.ts` — worker BullMQ, ponto de entrada do scan.
- `apps/api/src/modules/research/sources/meta-ads-library.source.ts`
- `apps/api/src/modules/research/sources/competitor-scraping.source.ts` (desabilitado por padrão, conforme acima).
- `apps/api/src/modules/research/sources/trend-source.interface.ts` — interface comum `TrendSource.fetch(brandKit): Promise<RawSignal[]>`.
- `apps/api/src/modules/research/insight-summarizer.service.ts` — recebe `RawSignal[]` de todas as fontes habilitadas, chama Claude para sintetizar em `research_insights` estruturados.

### Lógica principal
1. Worker recebe `{ workspaceId }`, busca o `brand_kit` (niche + competitors).
2. Para cada `TrendSource` habilitado (credencial presente), chama `.fetch(brandKit)`, coleta `RawSignal[]` (formato comum: `{ sourceType, sourceRef, rawText, rawUrl }`).
3. Se **nenhuma** fonte estiver habilitada (nenhuma credencial configurada), o scan ainda "roda" mas não produz insights novos — grava um log/evento indicando "scan concluído sem fontes ativas" em vez de falhar silenciosamente ou travar.
4. `insight-summarizer.service.ts` recebe todos os `RawSignal[]` coletados e faz **uma única chamada** a Claude (não uma por sinal, para custo/latência) pedindo para: agrupar sinais semelhantes, atribuir `relevance_score` (0-10) e `suggested_format` (`static_post|carousel|reels_script`) a cada tema identificado, e escrever o `summary` em português, tom analítico e acionável (ex: "Concorrente X está publicando bastidores de produção com alto engajamento — considerar formato carrossel mostrando processo").
5. Cada tema resultante vira uma linha em `research_insights`.

### Schema / Tipos (se aplicável)
```typescript
interface RawSignal {
  sourceType: 'competitor' | 'hashtag_trend' | 'topic_trend';
  sourceRef: string;
  rawText: string;
  rawUrl?: string;
}
interface TrendSource {
  isEnabled(): boolean;
  fetch(brandKit: BrandKit): Promise<RawSignal[]>;
}
```

## Critérios de Aceitação
- [ ] CA-01: Com `META_ADS_LIBRARY_ACCESS_TOKEN` configurado, um scan para um workspace com concorrentes cadastrados produz ao menos 1 `research_insight` novo (testável com concorrente real conhecido por ter anúncios ativos).
- [ ] CA-02: Sem nenhuma credencial de fonte configurada, o scan completa sem erro e sem criar insights, registrando isso de forma visível (log ou campo de status do scan).
- [ ] CA-03: `competitor-scraping.source.ts` nunca executa quando `ENABLE_COMPETITOR_SCRAPING` não é `true`, mesmo que o código exista.
- [ ] CA-04: A síntese via Claude é feita em uma única chamada por scan (não N chamadas por sinal coletado) — validar via contagem de chamadas em teste com mock da Anthropic API.
- [ ] CA-05: Insights gerados têm `relevance_score` e `suggested_format` sempre preenchidos (nunca null após uma síntese bem-sucedida).

## Comandos de Validação
```bash
pnpm --filter api test research-scan.processor.spec.ts
```

## Notas de Implementação
Este spec é o que mais provavelmente vai precisar de iteração pós-MVP — as fontes de dados de "o que está viralizando" no mercado brasileiro mudam de disponibilidade com frequência (APIs de rede social restringem acesso periodicamente). Manter a interface `TrendSource` desacoplada é o que permite trocar/adicionar fontes sem reescrever o resto do pipeline.
