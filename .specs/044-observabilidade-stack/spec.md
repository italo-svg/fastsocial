# 044 Observabilidade Stack (GlitchTip + Dozzle + Bull Board)

## Objetivo
Subir e integrar as três ferramentas de observabilidade do produto — error tracking, logs navegáveis e monitoramento de filas — sem depender de SSH para diagnóstico do dia a dia.

## Contexto
Requisito padrão de todo produto deste dono (ver skill `padrao-saas-plg`, item 1). Roda no mesmo VPS (`N8N.volupia`) que o resto do stack — nada local, ver `.specs/shared/como-executar.md`. Ver PRD módulo 15 e Seção 7.2.

## Stack
- **GlitchTip** (self-hosted, compatível com SDK do Sentry) — error tracking.
- **Dozzle** (self-hosted) — visualização de logs de containers via navegador.
- **Bull Board** — dashboard sobre as filas BullMQ já usadas pela API (specs `017`, `030`, `038`).
- **Variáveis de ambiente necessárias**: `GLITCHTIP_DSN` (gerado pelo próprio GlitchTip após deploy).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `002-setup-docker-compose`
- [ ] `004-setup-nestjs-api`

## O que implementar

### Arquivos a CRIAR
- `infra/observability/docker-compose.yml` — serviços GlitchTip (web + worker + seu próprio Postgres/Redis internos) e Dozzle.
- `infra/traefik/dynamic-observability.yml` — rotas `glitchtip.<dominio>` e `logs.<dominio>` (Dozzle, protegido por autenticação básica do Traefik — nunca exposto sem senha, já que expõe logs de todo o sistema).
- `apps/api/src/common/services/error-tracking.service.ts` — wrapper fino sobre o SDK do Sentry (compatível com GlitchTip via DSN), capturando exceções não tratadas globalmente (`Sentry.init` no `main.ts`).
- `apps/api/src/modules/queue/bull-board.module.ts` — monta o Bull Board como rota protegida (`/admin/queues`, só acessível por `super_admin`) dentro da própria API, reusando as filas já registradas (BullMQ) pelos módulos de imagem/publicação/métricas.

### Lógica principal
1. GlitchTip recebe exceções não tratadas da API e do render-engine (ambos configurados com o SDK do Sentry apontando pro DSN do GlitchTip).
2. Dozzle é somente leitura, protegido por autenticação básica (usuário/senha definidos no `.env`), acessível só pelo Super Admin.
3. Bull Board é montado como sub-rota da própria API (evita mais um serviço/subdomínio) e protegido pelo `PlatformAdminGuard` (spec `041`).
4. Nenhuma dessas ferramentas deve derrubar o restante do sistema se estiver fora do ar — captura de erro/log é best-effort, nunca bloqueante.

## Critérios de Aceitação
- [ ] CA-01: Uma exceção não tratada lançada propositalmente na API aparece no GlitchTip em poucos segundos, com stack trace.
- [ ] CA-02: Dozzle mostra logs em tempo real dos containers da API, render-engine, Postiz e n8n, acessível só com autenticação.
- [ ] CA-03: `/admin/queues` (Bull Board) mostra as filas reais em uso (ex: geração de imagem) com jobs pendentes/completos/falhos, acessível só por `super_admin`.
- [ ] CA-04: Derrubar o container do GlitchTip não impede a API de continuar respondendo normalmente (falha de captura de erro é silenciosa, não propaga).

## Comandos de Validação
```bash
ssh -i ~/.ssh/autocontent_hostinger_ed25519 root@69.62.92.74 "docker compose -f /opt/autocontent/infra/observability/docker-compose.yml ps"
curl -sI https://glitchtip.<dominio>
curl -sI https://logs.<dominio>
```

## Notas de Implementação
GlitchTip precisa de seu próprio Postgres/Redis — não reusar o Postgres do produto (Supabase self-hosted) para isso, mesma lógica de isolamento já aplicada ao Postiz/n8n (specs `027`/`032`).
