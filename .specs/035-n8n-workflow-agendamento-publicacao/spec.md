# 035 n8n Workflow — Agendamento, Publicação e Coleta de Métricas

## Objetivo
Criar os workflows n8n que agendam peças aprovadas para publicação e, posteriormente, coletam métricas de performance dos posts já publicados.

## Contexto
Terceiro e último workflow do piloto automático. Segue os specs `030` (agendamento/publicação via Postiz) e `038` (coleta de métricas — se ainda não pronto quando este spec rodar, implementar a parte de agendamento primeiro e deixar a parte de coleta de métricas com um `TODO` claro apontando para o spec `038`, sem bloquear). Ver PRD Seção 3 "Ciclo do Piloto Automático", passos 7-9.

## Stack
- **n8n**: 2 workflows JSON versionados (agendamento é acionado por aprovação; coleta de métricas é um cron separado).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `034-n8n-workflow-geracao`
- [ ] `030-postiz-api-bridge`

## O que implementar

### Arquivos a CRIAR
- `infra/n8n-workflows/scheduling-pipeline.json` — disparado por webhook quando uma peça é aprovada (manual ou automaticamente).
- `infra/n8n-workflows/metrics-collection-pipeline.json` — cron diário.
- `apps/api/src/modules/content-pieces/content-pieces.service.ts` — **modificar** (criado no spec `025`) para, na transição `pending_approval → approved` (seja por aprovação humana no spec `026` ou por auto-aprovação no spec `034`), disparar um webhook HTTP para o n8n (`N8N_API_URL/webhook/content-approved`) com o `contentPieceId`, assinado com `N8N_WEBHOOK_SECRET`.
- `apps/api/src/modules/publications/metrics-internal.controller.ts` — `GET /internal/publications/pending-metrics-collection` (publications `published` há mais de 24h e menos de 30 dias, sem snapshot recente).

### Lógica principal — Workflow de Agendamento
1. **Webhook Trigger** — recebe `{ contentPieceId, workspaceId }` da nossa API quando uma peça é aprovada.
2. **HTTP Request** → busca `autopilot_pipelines.preferred_times` e as contas sociais do workspace (via endpoints já existentes).
3. **Code node** → calcula o próximo horário disponível dentro dos `preferred_times` configurados, respeitando não empilhar múltiplos posts no mesmo horário exato.
4. **HTTP Request** → `POST /content-pieces/:id/schedule` (spec `030`) com o horário calculado.

### Lógica principal — Workflow de Coleta de Métricas
1. **Trigger Cron** — diário.
2. **HTTP Request** → `GET /internal/publications/pending-metrics-collection`.
3. **Split In Batches** — um por publication.
4. **HTTP Request** → endpoint da API que consulta a Graph API (Meta) ou LinkedIn API para aquela publication específica e grava um `analytics_snapshots` (este endpoint é entregue pelo spec `038` — se não existir ainda, este nó fica com a URL documentada mas o workflow não é ativado em produção até o spec `038` completar; documentar isso no `metrics-collection-pipeline.json` como comentário/nota).

## Critérios de Aceitação
- [ ] CA-01: Aprovar uma peça (manualmente, spec `026`) dispara o webhook e o workflow de agendamento calcula e agenda um horário dentro dos `preferred_times` configurados.
- [ ] CA-02: Duas peças aprovadas quase simultaneamente para o mesmo workspace não recebem exatamente o mesmo horário de agendamento (espaçamento mínimo configurável, ex: 30 min).
- [ ] CA-03: O webhook rejeita chamadas sem a assinatura HMAC correta (`N8N_WEBHOOK_SECRET`).
- [ ] CA-04: O workflow de coleta de métricas identifica corretamente publications elegíveis (publicadas há 24h-30 dias) e ignora as fora dessa janela.
- [ ] CA-05: Todo o ciclo ponta a ponta — aprovação → agendamento → publicação → coleta de métricas — funciona sem intervenção manual num teste completo com uma peça real em conta de teste (validação de integração, não só unitária).

## Comandos de Validação
```bash
curl -s "http://localhost:3333/api/v1/internal/publications/pending-metrics-collection" -H "Authorization: Bearer $N8N_SERVICE_TOKEN"
# validar workflows completos manualmente via UI do n8n com uma peça de ponta a ponta
```

## Notas de Implementação
Este spec fecha o loop completo do piloto automático descrito no PRD — depois dele, vale a pena rodar um teste de integração de ponta a ponta genuíno (pesquisa → copy → imagem → composição → aprovação → agendamento → publicação) num workspace de teste antes de considerar a Fase 7 "pronta" como um todo, mesmo que cada spec individual já tenha passado nos próprios critérios de aceitação isoladamente.
