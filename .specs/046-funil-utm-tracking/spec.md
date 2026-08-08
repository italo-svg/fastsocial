# 046 Funil & UTM Tracking

## Objetivo
Capturar UTM desde a primeira visita e instrumentar cada etapa do funil de trial como evento, usando PostHog self-hospedado como motor de análise.

## Contexto
Requisito padrão (skill `padrao-saas-plg`, item 4). Ver PRD módulo 17 e tabela `funnel_events` (Seção 6.3). Este spec cobre a captura (frontend + API) — a tela de visualização do funil é do spec `047`.

## Stack
- **PostHog self-hosted** — deploy próprio no VPS, usado tanto para pageview/eventos quanto para funil.
- **Frontend**: `posthog-js` capturando `$pageview` automaticamente + eventos customizados nos pontos-chave do funil.
- **Backend**: NestJS grava eventos também em `funnel_events` (tabela própria) para consultas de admin sem depender de query complexa na API do PostHog — os dois convivem, PostHog para exploração ad-hoc, tabela própria para o painel de funil simples do spec `047`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `002-setup-docker-compose`
- [ ] `008-auth-frontend`

## O que implementar

### Arquivos a CRIAR
- `infra/posthog/docker-compose.yml` — stack self-hosted do PostHog (tem seu próprio Postgres/ClickHouse/Redis internos — isolado do banco do produto).
- `apps/web/lib/analytics/posthog-client.ts` — inicializa `posthog-js` com `NEXT_PUBLIC_POSTHOG_HOST`/`KEY`, captura UTM da URL na primeira visita e persiste em cookie/localStorage (`anonymous_id` do PostHog reusado como `anonymous_id` da tabela própria).
- `apps/web/lib/analytics/track-funnel-event.ts` — helper `trackFunnelEvent(eventName, metadata?)` chamado nos pontos do funil (ver lista abaixo), dispara pro PostHog **e** para o endpoint da API.
- `apps/api/src/modules/funnel/funnel.module.ts`
- `apps/api/src/modules/funnel/funnel.controller.ts` — `POST /funnel/events` (aceita chamada não-autenticada, já que boa parte do funil acontece antes do login — usar rate limiting agressivo nesta rota por ser pública).
- `apps/api/src/modules/funnel/funnel.service.ts` — grava em `funnel_events`, associando `user_id`/`workspace_id` quando existirem no momento do evento.

### Lógica principal
1. Eventos de funil mínimos a instrumentar: `landing_viewed`, `signup_started`, `signup_completed`, `email_confirmed`, `onboarding_completed`, `first_content_piece_created`, `trial_converted_to_paid`.
2. `POST /funnel/events`: `{ anonymousId, eventName, utm?, metadata? }`; se o request tiver sessão autenticada, enriquece com `user_id`/`workspace_id` automaticamente.
3. UTM é capturado uma única vez por `anonymous_id` (primeira visita "gruda" — não sobrescrever UTM de conversões subsequentes na mesma sessão, comportamento padrão de first-touch attribution).
4. Quando um usuário anônimo se cadastra, todos os `funnel_events` daquele `anonymous_id` são retroativamente associados ao `user_id` recém-criado (`UPDATE funnel_events SET user_id = ... WHERE anonymous_id = ...`).

## Critérios de Aceitação
- [ ] CA-01: Visitar a landing com `?utm_source=teste&utm_campaign=x` e depois completar o cadastro resulta num `funnel_events` com `utm_source='teste'` associado ao `user_id` correto.
- [ ] CA-02: Os 7 eventos mínimos disparam nos pontos certos da jornada real (testar manualmente o fluxo completo).
- [ ] CA-03: `POST /funnel/events` sem autenticação funciona (evento pré-cadastro) e com autenticação enriquece corretamente.
- [ ] CA-04: PostHog mostra os mesmos eventos capturados (validação cruzada entre a tabela própria e o PostHog).
- [ ] CA-05: Rate limiting da rota pública impede abuso trivial (testar > N requisições/minuto do mesmo IP).

## Comandos de Validação
```bash
curl -s -X POST https://app.<dominio>/api/v1/funnel/events -d '{"anonymousId":"abc123","eventName":"landing_viewed","utm":{"source":"teste"}}'
```

## Notas de Implementação
Nenhuma.
