# 053 Automação Instagram — Schema & Entitlement

## Objetivo
Modelar o add-on pago de automação de Instagram (entitlement por workspace) e o schema de fluxos/gatilhos/execuções, integrado ao billing como produto separado.

## Contexto
Ver PRD módulo 19 ("Automação de Instagram — Módulo Pago Adicional") e a skill `padrao-saas-plg` item 6 (arquitetura pronta para add-ons). Tabelas já desenhadas no PRD Seção 6.3: `workspace_addons`, `automation_flows`, `automation_triggers`, `automation_flow_steps`, `automation_runs`. Este spec cria o schema + a integração de billing; a execução real do fluxo é do spec `055`.

## Stack
- **Framework**: NestJS, Prisma, Stripe (reusa `apps/api/src/modules/billing` do spec `040`).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `040-billing-stripe`
- [ ] `003-schema-postgres-core`

## O que implementar

### Arquivos a CRIAR
- Migration Prisma adicionando as 5 tabelas do PRD 6.3 (`workspace_addons`, `automation_flows`, `automation_triggers`, `automation_flow_steps`, `automation_runs`).
- `apps/api/src/modules/addons/addons.module.ts`
- `apps/api/src/modules/addons/addons.controller.ts` — `GET /addons` (lista add-ons disponíveis + status do workspace atual), `POST /addons/:addonKey/subscribe` (cria Checkout Session do Stripe para o produto do add-on), `POST /addons/:addonKey/cancel`.
- `apps/api/src/modules/addons/addons.service.ts`
- `apps/api/src/common/guards/addon.guard.ts` — `@RequiresAddon('instagram_automation')`, bloqueia rotas do módulo de automação se `workspace_addons` não tiver o add-on `active` para aquele workspace.
- `scripts/setup-stripe-products.ts` — **modificar** (spec `040`) para incluir o produto/preço do add-on `instagram_automation` em `infra/billing/plans.json` (adicionar uma seção `addons` separada dos planos base).

### Lógica principal
1. `POST /addons/:addonKey/subscribe`: cria uma Checkout Session do Stripe como **item adicional** na assinatura existente do workspace (`stripe.subscriptionItems.create` sobre a subscription já ativa) — não uma assinatura nova e paralela, para manter uma única fatura por cliente.
2. Webhook do Stripe (estendendo o handler do spec `040`) processa a confirmação e cria/ativa a linha em `workspace_addons`.
3. `AddonGuard` é aplicado em todos os controllers do módulo de automação (specs `054`-`056`) — qualquer chamada sem o add-on ativo retorna 402 (Payment Required) com uma mensagem clara de upsell, não 403 genérico.
4. Cancelar o add-on (`POST /addons/:addonKey/cancel`) marca `workspace_addons.status='cancelled'` mas **não deleta** `automation_flows` existentes — ficam desativados (`is_active=false` forçado), preservando o histórico caso o cliente recontrate depois.

## Critérios de Aceitação
- [ ] CA-01: As 5 tabelas do módulo existem com RLS habilitado onde aplicável (`workspace_addons`, `automation_flows`).
- [ ] CA-02: Contratar o add-on via Checkout de teste do Stripe ativa `workspace_addons` corretamente via webhook.
- [ ] CA-03: Uma rota protegida por `@RequiresAddon('instagram_automation')` retorna 402 com mensagem de upsell para um workspace sem o add-on.
- [ ] CA-04: Cancelar o add-on desativa o acesso mas preserva os `automation_flows` já criados (não deleta dados).
- [ ] CA-05: O item do add-on aparece na mesma fatura/assinatura Stripe do plano base do workspace, não como cobrança separada.

## Comandos de Validação
```bash
curl -s https://app.<dominio>/api/v1/addons -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
curl -s -X POST https://app.<dominio>/api/v1/addons/instagram_automation/subscribe -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
```

## Notas de Implementação
Este spec é o "molde" de como qualquer add-on futuro deve ser modelado neste produto (e em produtos futuros, ver skill `padrao-saas-plg`) — `AddonGuard` genérico e reutilizável por chave (`@RequiresAddon('qualquer_addon_futuro')`), não específico de Instagram.
