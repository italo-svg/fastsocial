# 045 Página Saúde do Sistema (Admin)

## Objetivo
Dar ao Super Admin uma visão única do status de todos os serviços/integrações críticos do produto, sem precisar entrar em cada ferramenta separadamente.

## Contexto
Segue o spec `044` (observabilidade). Ver PRD módulo 15 e a página "Saúde do Sistema (Admin)" na Seção 5.2. Este spec agrega, não recria — consulta os serviços já existentes (banco, Redis, Postiz, n8n, GlitchTip, APIs externas) e mostra tudo num painel.

## Stack
- **Backend**: NestJS, checks HTTP/TCP simples por serviço.
- **Frontend**: Next.js, polling a cada 30s.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `044-observabilidade-stack`
- [ ] `041-painel-mestre-superadmin` (reusa o `PlatformAdminGuard`)

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/system-health/system-health.module.ts`
- `apps/api/src/modules/system-health/system-health.controller.ts` — `GET /platform/system-health`.
- `apps/api/src/modules/system-health/health-checkers/*.checker.ts` — um checker por dependência: `database.checker.ts` (SELECT 1), `redis.checker.ts` (PING), `postiz.checker.ts` (GET no health do Postiz), `n8n.checker.ts`, `glitchtip.checker.ts`, `anthropic.checker.ts` (chamada leve/ping), `fal.checker.ts`, `meta.checker.ts`, `linkedin.checker.ts`, `stripe.checker.ts` — cada um retorna `{ name, status: 'up'|'down'|'degraded', latencyMs, lastCheckedAt }`.
- `apps/web/app/(super-admin)/system-health/page.tsx` — cards de status por serviço.
- `apps/web/components/system-health/StatusCard.tsx`, `RecentErrorsList.tsx` (últimos erros do GlitchTip via API dele), `QueueBacklogWidget.tsx` (link direto pro Bull Board).

### Lógica principal
1. `GET /platform/system-health` roda todos os checkers em paralelo (`Promise.allSettled`, timeout de 3s cada) e retorna o agregado — nunca deixa um checker travado travar a resposta inteira.
2. Serviços sem credencial configurada (ex: `fal.checker.ts` sem `FAL_API_KEY`) retornam `status: 'not_configured'` (distinto de `down`) — evita alarme falso para integrações ainda não habilitadas.
3. Frontend faz polling a cada 30s, com indicador visual de "atualizado há Xs".
4. Card de status vermelho (`down`) é persistente e não desaparece sozinho — precisa de um novo check bem-sucedido.

## Critérios de Aceitação
- [ ] CA-01: Com todos os serviços saudáveis, a página mostra todos os cards verdes.
- [ ] CA-02: Derrubar propositalmente o Redis (parar o container) faz o card correspondente virar vermelho em até 30s, sem quebrar o resto da página.
- [ ] CA-03: Um serviço sem credencial configurada (ex: fal.ai antes de a chave chegar) mostra estado "não configurado", visualmente distinto de "fora do ar".
- [ ] CA-04: Página acessível só por `super_admin` — `workspace_admin` comum recebe 403.

## Comandos de Validação
```bash
curl -s https://app.<dominio>/api/v1/platform/system-health -H "Authorization: Bearer <token_super_admin>"
```

## Notas de Implementação
Nenhuma.
