# 020 Pesquisa & Tendências API

## Objetivo
Expor o CRUD de `research_insights` e o endpoint de disparo manual de uma rodada de pesquisa, servindo tanto o uso manual (usuário clica "pesquisar agora") quanto o piloto automático (Fase 7).

## Contexto
Segue os specs `007` (multitenant) e `010` (brand kit, de onde vem `niche`/`competitors`). Este spec cobre a **API de leitura/gestão** dos insights — a lógica de efetivamente varrer fontes externas é do spec `021-conector-pesquisa-fontes`, chamado por este módulo mas implementado separadamente por lidar com integrações externas que podem não ter credencial ainda.

## Stack
- **Framework**: NestJS, Prisma.
- **Variáveis de ambiente necessárias**: nenhuma nova nesta spec (o conector do spec `021` tem as suas).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `007-multitenant-middleware`
- [ ] `010-crud-brand-kit-api`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/research/research.module.ts`
- `apps/api/src/modules/research/research.controller.ts` — `GET /research-insights` (filtros `?consumed=false&sourceType=&minRelevance=`), `POST /research-insights/scan` (dispara uma rodada manual — chama o serviço do spec `021`), `POST /research-insights` (criação manual de insight, para o caso "briefing manual" do editor de conteúdo).
- `apps/api/src/modules/research/research.service.ts`
- `apps/api/src/modules/research/dto/create-insight.dto.ts`.

### Lógica principal
1. `GET /research-insights`: retorna insights do workspace ativo, ordenados por `relevance_score DESC, captured_at DESC`, com paginação simples (`?page=&limit=`).
2. `POST /research-insights/scan`: valida que o brand kit tem `niche`/`competitors` preenchidos (senão retorna 400 pedindo para completar o onboarding primeiro); chama o serviço de pesquisa do spec `021` de forma **assíncrona** (enfileira via BullMQ, retorna 202 Accepted imediatamente com um `scanId`) — pesquisa pode demorar (chamadas a APIs externas + resumo por LLM), não deve bloquear a requisição HTTP.
3. `POST /research-insights`: usado quando o usuário quer pular a pesquisa e criar um insight manual/briefing direto (`source_type='manual'`).
4. Trigger do banco (`mark_insight_consumed`, já criado no spec `003`) cuida de marcar `consumed=true` automaticamente quando um `content_piece` referencia o insight — este spec não precisa reimplementar essa lógica, só não deve sobrescrever `consumed` manualmente de forma que conflite com o trigger.

## Critérios de Aceitação
- [ ] CA-01: `GET /research-insights?consumed=false` retorna só insights ainda não usados, ordenados por relevância.
- [ ] CA-02: `POST /research-insights/scan` sem `niche` configurado no brand kit retorna 400 com mensagem orientando completar o onboarding.
- [ ] CA-03: `POST /research-insights/scan` com brand kit válido retorna 202 imediatamente (não espera a pesquisa terminar).
- [ ] CA-04: `POST /research-insights` manual cria um insight com `source_type='manual'` e `relevance_score` default alto (ex: 10, já que foi escolhido deliberadamente pelo usuário).
- [ ] CA-05: Insights de um workspace nunca aparecem para outro (teste de isolamento).

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/research-insights/scan -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
curl -s "http://localhost:3333/api/v1/research-insights?consumed=false" -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
```

## Notas de Implementação
O status do scan assíncrono (`scanId`) pode ser consultado via `GET /research-insights?since=<scanId timestamp>` no MVP — não é necessário um endpoint de status dedicado a menos que a UI (spec `024`) precise de feedback mais granular.
