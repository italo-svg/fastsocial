# 040 Billing Stripe

## Objetivo
Integrar Stripe para gestão de assinatura por workspace: checkout, portal do cliente, webhooks de status, e enforcement dos limites de plano já modelados em `subscriptions`.

## Contexto
Segue os specs `007` (multitenant) e `009` (workspace provisioning, que já cria uma `subscription` trial por padrão). Ver PRD módulo 12 (Billing & Planos) e Seção 6.2 (tabela `subscriptions`, trigger `enforce_monthly_post_limit`). Conforme o checklist de acessos, a conta Stripe é criada pelo usuário — este spec assume que `STRIPE_SECRET_KEY` (modo teste) já está disponível; se não estiver, todo o módulo deve degradar graciosamente (endpoints retornam 501, não quebram o resto do sistema).

## Stack
- **Framework**: NestJS, `stripe` SDK oficial.
- **Variáveis de ambiente necessárias**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_BASE_URL` (para as URLs de retorno do Checkout).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `009-workspace-provisioning`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/billing/billing.module.ts`
- `apps/api/src/modules/billing/billing.controller.ts` — `GET /billing/plans` (lista os planos/preços configurados no Stripe), `POST /billing/checkout-session` (cria sessão de Checkout para o plano escolhido), `POST /billing/portal-session` (link para o Customer Portal do Stripe, onde o usuário gerencia cartão/cancela), `POST /billing/webhook` (recebe eventos do Stripe, **sem** os guards padrão de auth — validado por assinatura do Stripe, não por JWT).
- `apps/api/src/modules/billing/billing.service.ts`
- `apps/api/src/modules/billing/stripe-webhook-handler.service.ts` — processa `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- `scripts/setup-stripe-products.ts` — script standalone (rodado uma vez manualmente pelo operador) que cria os Produtos/Preços no Stripe via API a partir de uma config declarativa (`infra/billing/plans.json` — nome, preço, `max_social_accounts`, `max_posts_per_month` por plano), evitando configuração manual clicando no painel da Stripe.

### Lógica principal
1. `infra/billing/plans.json`: fonte da verdade dos planos (ex: `starter`, `pro`, `agency`), cada um com preço mensal e os limites que mapeiam para `subscriptions.max_social_accounts`/`max_posts_per_month`.
2. `POST /billing/checkout-session`: cria um Stripe Customer (se o workspace ainda não tiver um `stripe_customer_id` — adicionar essa coluna em `subscriptions` via migration adicional) e uma Checkout Session para o `price_id` do plano escolhido, com `success_url`/`cancel_url` apontando para `APP_BASE_URL/settings/billing`.
3. Webhook `checkout.session.completed`: atualiza `subscriptions.plan_type`, `max_social_accounts`, `max_posts_per_month`, `billing_status='active'`, `current_period_end`.
4. Webhook `invoice.payment_failed`: `billing_status='past_due'` — **não** derruba o workspace imediatamente (dar um período de graça), mas a UI deve mostrar um aviso proeminente.
5. Webhook `customer.subscription.deleted`: `billing_status='cancelled'`, plano reverte para `trial` com limites mínimos.
6. Validação de assinatura do webhook via `STRIPE_WEBHOOK_SECRET` (`stripe.webhooks.constructEvent`) — requisito de segurança, nunca processar um payload de webhook sem essa validação.

## Critérios de Aceitação
- [ ] CA-01: `scripts/setup-stripe-products.ts` cria corretamente os produtos/preços no Stripe (modo teste) a partir de `plans.json`, idempotente (rodar 2x não duplica).
- [ ] CA-02: Completar um Checkout de teste (cartão de teste do Stripe) atualiza a `subscription` do workspace corretamente via webhook.
- [ ] CA-03: `POST /billing/webhook` rejeita payloads sem assinatura válida do Stripe (testar com payload forjado).
- [ ] CA-04: Simular `invoice.payment_failed` (via CLI de teste do Stripe) marca `billing_status='past_due'` sem suspender o workspace imediatamente.
- [ ] CA-05: O trigger `enforce_monthly_post_limit` (já existente desde o spec `003`) efetivamente bloqueia criação de `content_pieces` além do limite do plano atualizado — teste de integração validando que o limite reflete o plano pago corretamente após upgrade.
- [ ] CA-06: Sem `STRIPE_SECRET_KEY` configurada, os endpoints de billing retornam 501 sem afetar o resto da API.

## Comandos de Validação
```bash
pnpm tsx scripts/setup-stripe-products.ts
curl -s -X POST http://localhost:3333/api/v1/billing/checkout-session -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"planType":"pro"}'
stripe listen --forward-to localhost:3333/api/v1/billing/webhook   # CLI oficial do Stripe para testar webhooks localmente
```

## Notas de Implementação
Nunca ativar `STRIPE_SECRET_KEY` de modo **live** em ambiente de desenvolvimento — sempre modo teste até o go-live real, conforme a ordem sugerida no checklist de acessos (`.prd/checklist_acessos_e_delegacao.md`, "Stripe em modo live... por último").
