# 036 Autopilot Config API

## Objetivo
Expor o CRUD de configuração do piloto automático (`autopilot_pipelines`) — cadência, mix de formatos, regra de aprovação, horários preferenciais — e o toggle de ativação.

## Contexto
Segue o spec `010` (brand kit). Esta API é consultada pelos workflows do n8n (specs `033`-`035`, via `GET /internal/autopilot/active-workspaces` e afins, já criados nesses specs) e gerenciada pelo usuário via UI (spec `037`). A tabela `autopilot_pipelines` já existe desde o spec `003`.

## Stack
- **Framework**: NestJS, Prisma.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `007-multitenant-middleware`
- [ ] `009-workspace-provisioning`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/autopilot/autopilot.module.ts`
- `apps/api/src/modules/autopilot/autopilot.controller.ts` — `GET /autopilot`, `PUT /autopilot` (upsert, 1-para-1 com workspace), `POST /autopilot/toggle` (`{ isActive: boolean }`), `GET /autopilot/runs` (histórico de execuções — ver nota abaixo).
- `apps/api/src/modules/autopilot/autopilot.service.ts`
- `apps/api/src/modules/autopilot/dto/update-autopilot.dto.ts` — valida `postsPerWeek` (1-21), `formatMix` (objeto cujas chaves somam 1.0), `requiresApproval` (boolean), `preferredTimes` (array de strings `HH:mm`).

### Lógica principal
1. `PUT /autopilot`: só `workspace_admin`/`super_admin`. Validação de negócio: `postsPerWeek` acima de um limite prático (ex: > 14) deve gerar um aviso não-bloqueante sobre custo de API de IA (retornar em `warnings`, mesmo padrão do spec `010`).
2. `POST /autopilot/toggle`: ativar exige que o brand kit já tenha `niche` preenchido e ao menos 1 `social_account` conectada e `connected` — sem isso, retorna 400 explicando o que falta (evita ativar um piloto automático que não vai conseguir publicar nada).
3. `last_run_at` é atualizado pelo próprio workflow do n8n (via um endpoint `PATCH /internal/autopilot/:workspaceId/mark-run` chamado ao final do workflow de pesquisa, spec `033` — adicionar esse endpoint aqui já que é puramente sobre a entidade `autopilot_pipelines`).
4. `GET /autopilot/runs`: histórico simples — no MVP, pode ser derivado de `content_pieces` filtrando `origin='autopilot'` agrupado por dia, sem precisar de uma tabela de log de execuções dedicada (mais simples, reusa dado que já existe).

## Critérios de Aceitação
- [ ] CA-01: `PUT /autopilot` cria/atualiza a configuração corretamente, validando que `formatMix` soma 1.0 (rejeitar com 400 se não somar).
- [ ] CA-02: `POST /autopilot/toggle` com `isActive=true` falha com mensagem clara se não houver conta social conectada.
- [ ] CA-03: `POST /autopilot/toggle` com `isActive=true` e pré-requisitos atendidos ativa corretamente, refletido em `GET /autopilot`.
- [ ] CA-04: Usuário `editor` consegue ler (`GET /autopilot`) mas não alterar (`PUT`/`toggle`) a configuração — só `workspace_admin`.
- [ ] CA-05: `GET /autopilot/runs` reflete corretamente o histórico de peças geradas automaticamente, agrupado por período.

## Comandos de Validação
```bash
curl -s -X PUT http://localhost:3333/api/v1/autopilot -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"postsPerWeek":5,"formatMix":{"static_post":0.4,"carousel":0.6},"requiresApproval":true,"preferredTimes":["09:00","18:00"]}'
curl -s -X POST http://localhost:3333/api/v1/autopilot/toggle -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"isActive":true}'
```

## Notas de Implementação
Este spec e os workflows n8n (`033`-`035`) têm uma dependência circular natural de projeto (a API expõe endpoints internos que os workflows chamam, e os workflows chamam endpoints que vivem no mesmo módulo criado aqui) — na prática, recomenda-se implementar este spec **em paralelo** com o `033`, já que ambos tocam `autopilot_pipelines`, e alinhar os nomes de endpoint exatamente como documentado nos dois specs para evitar retrabalho.
