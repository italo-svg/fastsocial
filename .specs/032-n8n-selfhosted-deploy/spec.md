# 032 n8n Self-hosted Deploy

## Objetivo
Subir o n8n (self-hosted, open source) via Docker Compose, configurado para orquestrar os workflows do piloto automático, com autenticação para chamar de volta a nossa API.

## Contexto
Decisão de arquitetura do PRD (Seção 7.2): n8n orquestra o ciclo pesquisa → geração → composição → aprovação → agendamento → publicação → coleta de métricas do piloto automático (PRD módulo 9). Este spec só sobe a infraestrutura do n8n; os workflows em si são dos specs `033`-`035`.

## Stack
- **n8n**: imagem Docker oficial.
- **Variáveis de ambiente necessárias**: `N8N_API_URL`, `N8N_API_KEY` (gerada dentro do próprio n8n para uso da nossa API), `N8N_WEBHOOK_SECRET` (assinatura HMAC dos webhooks que o n8n chama de volta na nossa API), `N8N_ENCRYPTION_KEY` (própria do n8n, para cifrar credenciais salvas nele).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `002-setup-docker-compose`

## O que implementar

### Arquivos a CRIAR
- `infra/n8n/docker-compose.yml` — serviço n8n, banco Postgres próprio (schema `n8n` dedicado, mesmo padrão do Postiz no spec `027`), volume persistente para dados internos.
- `infra/n8n/README.md` — como gerar a API key do n8n, como configurar a credencial HTTP genérica dentro do n8n para chamar nossa API (`Authorization: Bearer <service token>` — ver nota abaixo), como importar os workflows JSON dos specs `033`-`035`.
- `apps/api/src/modules/auth/service-token.strategy.ts` — nossa API precisa aceitar um tipo de autenticação de "serviço" (não é um usuário humano) para as chamadas que o n8n faz de volta — implementar um token de serviço de longa duração (não expira em 1h como o JWT de usuário), validado por uma strategy Passport separada (`Authorization: Bearer <SERVICE_TOKEN>`, comparado contra `N8N_SERVICE_TOKEN` do ambiente via comparação de tempo constante).
- `infra/traefik/dynamic.yml` — **modificar** para rotear `n8n.<dominio-interno>`.

### Lógica principal
1. Subir o n8n com banco próprio.
2. Gerar a API key do n8n (usada pela nossa API para dispará-lo programaticamente — ex: ativar/desativar um workflow quando o usuário liga/desliga o piloto automático).
3. Criar o `N8N_SERVICE_TOKEN` (usado pelo n8n para autenticar chamadas de volta à nossa API) e implementar a strategy de validação correspondente.
4. Validar manualmente que o n8n sobe, a UI própria é acessível, e é possível criar um workflow de teste simples (ex: webhook → HTTP request para `GET /api/v1/health` da nossa API) com sucesso — confirma que a rede Docker e a autenticação de serviço funcionam antes de importar os workflows reais.

## Critérios de Aceitação
- [ ] CA-01: `docker compose -f infra/n8n/docker-compose.yml up -d` sobe o n8n sem erro, acessível em `n8n.<dominio-interno>` (ou `localhost:5678` em dev).
- [ ] CA-02: Um workflow de teste dentro do n8n consegue chamar `GET /api/v1/health` da nossa API com sucesso (mesma rede Docker).
- [ ] CA-03: Uma chamada de teste de um workflow do n8n para um endpoint autenticado da nossa API, usando o `N8N_SERVICE_TOKEN`, é aceita pela `service-token.strategy.ts`.
- [ ] CA-04: Uma chamada com token de serviço inválido/ausente é rejeitada com 401.
- [ ] CA-05: Reiniciar o container do n8n preserva os workflows criados (volume persistente funcionando).

## Comandos de Validação
```bash
docker compose -f infra/n8n/docker-compose.yml up -d
curl -s http://localhost:5678/healthz
curl -s http://localhost:3333/api/v1/health -H "Authorization: Bearer $N8N_SERVICE_TOKEN"
```

## Notas de Implementação
O token de serviço é um mecanismo de autenticação **separado** do JWT de usuário (spec `006`) — nunca deve ser confundido com ele nem aceito nas mesmas rotas que esperam um usuário humano com `workspace_id` resolvido via `X-Workspace-Id`. Os workflows do n8n sempre passam o `workspace_id` explicitamente no corpo/query de cada chamada (não há "usuário logado" no contexto de um workflow automatizado), e os endpoints que aceitam o token de serviço devem validar isso explicitamente, não reusar o `WorkspaceGuard` do spec `007` sem ajuste.
