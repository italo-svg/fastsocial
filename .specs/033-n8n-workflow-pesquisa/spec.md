# 033 n8n Workflow — Pesquisa Recorrente

## Objetivo
Criar o workflow n8n que dispara, para cada workspace com piloto automático ativo, uma rodada de pesquisa recorrente.

## Contexto
Primeiro dos 3 workflows do piloto automático (PRD módulo 9, Seção 3 "Sistema — Ciclo do Piloto Automático"). Segue os specs `032` (n8n rodando), `020`/`021` (API de pesquisa) e `036` (config de `autopilot_pipelines` — se ainda não existir quando este spec rodar, usar diretamente a tabela via um endpoint mínimo de leitura, e o spec `036` completa a gestão via UI depois).

## Stack
- **n8n**: workflow exportado como JSON versionado (não só configurado manualmente na UI do n8n — precisa ser reproduzível).
- **Autenticação**: `N8N_SERVICE_TOKEN` (spec `032`) nas chamadas HTTP deste workflow para nossa API.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `032-n8n-selfhosted-deploy`
- [ ] `020-pesquisa-tendencias-api`
- [ ] `021-conector-pesquisa-fontes`

## O que implementar

### Arquivos a CRIAR
- `infra/n8n-workflows/research-pipeline.json` — workflow exportado do n8n com os nós descritos abaixo.
- `apps/api/src/modules/autopilot/autopilot-internal.controller.ts` — `GET /internal/autopilot/active-workspaces` (autenticado via `N8N_SERVICE_TOKEN`, retorna lista de `workspace_id` com `autopilot_pipelines.is_active=true` e que ainda não atingiram a cadência da semana) — endpoint interno, prefixo `/internal/` reservado para chamadas de serviço, nunca exposto ao frontend.

### Lógica principal (nós do workflow)
1. **Trigger Cron** — roda diariamente em um horário fixo (ex: 06:00, configurável).
2. **HTTP Request** → `GET /internal/autopilot/active-workspaces` — retorna a lista de workspaces a processar nesta rodada.
3. **Split In Batches** (loop) — um por workspace da lista.
4. **HTTP Request** → `POST /research-insights/scan` (com o token de serviço + `workspace_id` explícito no corpo, já que não há usuário logado neste contexto — reforça a nota de arquitetura do spec `032` sobre o `WorkspaceGuard` precisar de um caminho alternativo para chamadas de serviço).
5. **Wait** (opcional, pequeno delay entre workspaces para não sobrecarregar as APIs externas de pesquisa simultaneamente).
6. Fim do loop.

## Critérios de Aceitação
- [ ] CA-01: O workflow, ao ser executado manualmente pela UI do n8n, processa corretamente todos os workspaces com piloto automático ativo (validar com 2+ workspaces de teste).
- [ ] CA-02: Workspaces com piloto automático inativo (`is_active=false`) nunca são incluídos na lista retornada por `GET /internal/autopilot/active-workspaces`.
- [ ] CA-03: O endpoint interno rejeita chamadas sem o `N8N_SERVICE_TOKEN` correto.
- [ ] CA-04: O workflow agendado (cron) dispara automaticamente no horário configurado, sem intervenção manual (validar deixando rodar por um ciclo em ambiente de teste com horário próximo).
- [ ] CA-05: Falha em um workspace específico (ex: erro na chamada de scan) não interrompe o processamento dos demais workspaces do loop.

## Comandos de Validação
```bash
curl -s http://localhost:3333/api/v1/internal/autopilot/active-workspaces -H "Authorization: Bearer $N8N_SERVICE_TOKEN"
# validar execução manual do workflow pela UI do n8n em localhost:5678
```

## Notas de Implementação
O JSON do workflow deve ser versionado em `infra/n8n-workflows/` e reimportado via API do n8n em cada deploy (não editado manualmente em produção sem atualizar o arquivo versionado também) — isso evita que a configuração de produção do piloto automático divirja silenciosamente do que está no repositório.
