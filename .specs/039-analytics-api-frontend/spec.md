# 039 Analytics API + Frontend

## Objetivo
Expor os dados agregados de performance e implementar a tela de Analytics do painel.

## Contexto
Segue o spec `038` (coleta de métricas já populando `analytics_snapshots`). Ver PRD Seção 5.2, linha "Analytics" e módulo 11.

## Stack
- **Backend**: NestJS, queries agregadas via Prisma (`groupBy`).
- **Frontend**: Next.js, Recharts.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `038-analytics-coleta-metricas`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/analytics/analytics.controller.ts` — `GET /analytics/summary?from=&to=&network=&format=`, `GET /analytics/ranking?metric=reach|likes|comments&limit=10`.
- `apps/api/src/modules/analytics/analytics-query.service.ts` — usa sempre o snapshot mais recente de cada publication dentro do período (não soma snapshots históricos da mesma publication, que representariam double counting).
- `apps/web/app/(workspace)/analytics/page.tsx` — filtros + gráficos + ranking.
- `apps/web/components/analytics/EngagementChart.tsx`, `RankingTable.tsx`, `FilterBar.tsx`.
- `apps/web/hooks/useAnalytics.ts`.

### Lógica principal
1. `GET /analytics/summary`: retorna série temporal agregada (reach/engajamento por dia) + totais do período, filtrável por rede e formato.
2. `GET /analytics/ranking`: top N posts por métrica escolhida, com metadado cruzado (qual insight originou, qual template usado — join com `content_pieces`/`research_insights`) para responder "o que está funcionando", conforme o objetivo do módulo 11 do PRD.
3. Frontend: gráfico de linha (evolução temporal) + gráfico de barras (comparação por rede/formato) + tabela de ranking, todos reativos aos filtros.
4. Export de relatório (CSV) do resumo filtrado — endpoint adicional `GET /analytics/export.csv` reusando a mesma query de `summary`.

## Critérios de Aceitação
- [ ] CA-01: `GET /analytics/summary` retorna dados agregados corretos para um workspace com histórico de publicações e snapshots de teste.
- [ ] CA-02: Filtrar por rede específica (`?network=instagram`) exclui corretamente dados de outras redes do resultado.
- [ ] CA-03: `GET /analytics/ranking` retorna os posts corretamente ordenados pela métrica escolhida, com o insight/template de origem visível.
- [ ] CA-04: Múltiplos snapshots da mesma publication não inflam os totais (usa sempre o snapshot mais recente por publication no período, não soma todos).
- [ ] CA-05: Export CSV baixa corretamente com os dados filtrados atuais da tela.

## Comandos de Validação
```bash
curl -s "http://localhost:3333/api/v1/analytics/summary?from=2026-07-01&to=2026-08-01" -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
pnpm --filter web dev
```

## Notas de Implementação
Nenhuma.
