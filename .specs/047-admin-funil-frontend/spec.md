# 047 Admin Funil & UTM Frontend

## Objetivo
Mostrar ao Super Admin o funil de conversão por etapa e por origem (UTM), identificando onde os usuários desistem.

## Contexto
Segue o spec `046` (captura de eventos). Ver PRD Seção 5.2, página "Funil & UTM (Admin)".

## Stack
- **Backend**: NestJS, queries agregadas sobre `funnel_events`.
- **Frontend**: Next.js, Recharts (funil) + tabela.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `046-funil-utm-tracking`
- [ ] `041-painel-mestre-superadmin`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/funnel/funnel-analytics.controller.ts` — `GET /platform/funnel?from=&to=`, `GET /platform/funnel/by-utm?groupBy=source|medium|campaign`.
- `apps/api/src/modules/funnel/funnel-analytics.service.ts` — calcula contagem distinta de `anonymous_id`/`user_id` por etapa (os 7 eventos do spec `046`, em ordem), e taxa de conversão etapa-a-etapa (`count(etapa N) / count(etapa N-1)`).
- `apps/web/app/(super-admin)/funnel/page.tsx` — funil visual + tabela de UTM.
- `apps/web/components/funnel/FunnelChart.tsx`, `UtmBreakdownTable.tsx`.

### Lógica principal
1. `GET /platform/funnel`: retorna array ordenado das 7 etapas com contagem absoluta e percentual relativo à etapa anterior e à primeira etapa.
2. `GET /platform/funnel/by-utm`: agrupa por `utm_source`/`utm_medium`/`utm_campaign`, mostrando quantos chegaram em cada etapa por origem — permite responder "qual campanha converte melhor".
3. Frontend: funil visual (barras decrescentes) + tabela de UTM ordenável por taxa de conversão.

## Critérios de Aceitação
- [ ] CA-01: Funil mostra as 7 etapas na ordem certa com contagens e percentuais coerentes com os dados brutos de `funnel_events`.
- [ ] CA-02: Filtrar por período (`from`/`to`) recalcula corretamente.
- [ ] CA-03: Quebra por UTM mostra origens distintas com suas respectivas taxas de conversão.
- [ ] CA-04: Acessível só por `super_admin`.

## Comandos de Validação
```bash
curl -s "https://app.<dominio>/api/v1/platform/funnel?from=2026-07-01&to=2026-08-01" -H "Authorization: Bearer <token_super_admin>"
```

## Notas de Implementação
Nenhuma.
