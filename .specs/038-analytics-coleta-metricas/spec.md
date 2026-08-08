# 038 Analytics — Coleta de Métricas

## Objetivo
Consultar as APIs de Instagram/Facebook (Meta Graph API) e LinkedIn para cada publicação já publicada, e gravar os resultados em `analytics_snapshots`.

## Contexto
Segue os specs `030` (publications com `postiz_reference_id`/dados suficientes para localizar o post na rede) e `028`/`029` (contas conectadas, tokens/referências disponíveis). Consumido pelo workflow do spec `035` (coleta de métricas) e pela tela do spec `039`.

## Stack
- **Framework**: NestJS.
- **Meta Graph API**: endpoint de insights de mídia (`/​{media-id}/insights`), acessado via a mesma credencial gerenciada pelo Postiz (se Caminho A do spec `028`) — nesse caso, pode ser necessário obter o `media-id`/token através do próprio Postiz (checar se a API do Postiz expõe isso) ou, se o Postiz não expuser dados de insights, chamar a Graph API diretamente usando o token custodiado por ele (avaliar se o Postiz permite "exportar" o token para uso pontual, ou se é preciso pedir esse escopo adicional na conexão).
- **LinkedIn API**: endpoint de estatísticas de post (`organizationalEntityShareStatistics` ou equivalente vigente).
- **Variáveis de ambiente necessárias**: as já existentes de Meta/LinkedIn.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `030-postiz-api-bridge`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/analytics/analytics.module.ts`
- `apps/api/src/modules/analytics/metrics-collector.service.ts` — `collectForPublication(publicationId)`.
- `apps/api/src/modules/analytics/collectors/instagram-facebook.collector.ts`, `collectors/linkedin.collector.ts`.
- `apps/api/src/modules/analytics/metrics-internal.controller.ts` — **modificar/completar** (endpoint `GET /internal/publications/pending-metrics-collection` já previsto no spec `035`; adicionar aqui `POST /internal/publications/:id/collect-metrics`, chamado pelo workflow n8n por publication).

### Lógica principal
1. `POST /internal/publications/:id/collect-metrics`: resolve a `publication`, identifica a rede (`social_account.network`), delega ao collector correspondente.
2. Cada collector busca reach, impressions, likes, comments, shares, saves (quando a API da rede expuser o dado — nem toda métrica existe em toda rede; campos ausentes ficam `null`/`0` documentado, não inventados).
3. Grava um novo `analytics_snapshots` a cada coleta (histórico de snapshots ao longo do tempo, não sobrescreve o anterior — permite ver evolução do post nos primeiros dias).
4. Falha de coleta (token expirado, post removido pelo usuário na rede) registra o erro sem quebrar o restante do batch processado pelo workflow.

## Critérios de Aceitação
- [ ] CA-01: Coletar métricas de uma publicação real de teste no Instagram retorna valores plausíveis (reach/likes > 0 para um post com engajamento real de teste).
- [ ] CA-02: Coletar métricas de uma publicação no LinkedIn retorna os campos disponíveis pela API do LinkedIn, com os indisponíveis explicitamente `null`.
- [ ] CA-03: Cada chamada cria um novo snapshot (não atualiza um existente) — é possível ver o histórico de `analytics_snapshots` de uma mesma publication crescendo ao longo de múltiplas coletas.
- [ ] CA-04: Token expirado durante a coleta é tratado como falha registrada, não como exceção não tratada que derruba o processo.

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/internal/publications/<id>/collect-metrics -H "Authorization: Bearer $N8N_SERVICE_TOKEN"
```

## Notas de Implementação
A viabilidade exata deste spec depende de quanto acesso a dados de insights o Caminho A vs. B dos specs `028`/`029` permite (ver notas desses specs) — se o Postiz não expuser insights de mídia via sua API, pode ser necessário solicitar o escopo `instagram_manage_insights` diretamente e fazer essa chamada específica fora do Postiz, mesmo estando no Caminho A para o resto do fluxo de publicação. Documentar a decisão tomada no topo de `instagram-facebook.collector.ts`.
