# 054 Automação Instagram — Webhook & Matching de Gatilho

## Objetivo
Receber eventos em tempo real do Instagram (comentário, DM, resposta de story) via webhook da Meta e identificar qual automação configurada deve disparar.

## Contexto
Segue o spec `053` (schema/entitlement). Requer escopo adicional no app Meta além do já usado para publicação (Módulo 10/PRD): `instagram_manage_messages` e assinatura de webhooks de `comments`/`messages` no app Meta — atualizar o checklist de acessos (`.prd/checklist_acessos_e_delegacao.md`) se esse escopo ainda não tiver sido solicitado no App Review.

## Stack
- **Framework**: NestJS, endpoint de webhook público (verificado por assinatura HMAC da Meta).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `053-instagram-automation-schema-entitlement`
- [ ] `028-meta-oauth-bridge`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/instagram-automation/webhook.controller.ts` — `GET /webhooks/instagram` (handshake de verificação do webhook da Meta), `POST /webhooks/instagram` (recebe eventos).
- `apps/api/src/modules/instagram-automation/trigger-matcher.service.ts` — dado um evento recebido (`comment` ou `message`), busca `automation_triggers` ativos daquele `social_account_id` cujo `match_value` bate com o texto (case-insensitive, correspondência por palavra-chave contida, não exata).
- `apps/api/src/modules/instagram-automation/webhook-signature.guard.ts` — valida a assinatura `X-Hub-Signature-256` do payload contra `META_APP_SECRET`.

### Lógica principal
1. `POST /webhooks/instagram`: valida assinatura primeiro (`webhook-signature.guard.ts`), rejeita com 401 se inválida — nunca processar payload não assinado corretamente.
2. Identifica o tipo de evento (comentário em post, DM recebida, resposta de story) e o `social_account_id` correspondente (via `external_account_id` que vem no payload da Meta, cruzado com `social_accounts`).
3. Só processa automações para workspaces com `workspace_addons.instagram_automation = active` (checar antes de fazer qualquer matching — economiza trabalho para quem não contratou).
4. `trigger-matcher.service.ts` encontra o(s) `automation_flow` cujo gatilho bate; se mais de um bater, dispara todos (comportamento simples de MVP, sem priorização) — enfileira a execução (BullMQ) para o spec `055` processar, não executa síncrono dentro do webhook (webhooks da Meta têm timeout curto, responder rápido é obrigatório).
5. Responde `200 OK` imediatamente após enfileirar, antes de qualquer processamento de fato acontecer.

## Critérios de Aceitação
- [ ] CA-01: Handshake de verificação do webhook (`GET`) responde corretamente ao desafio da Meta na configuração inicial do app.
- [ ] CA-02: Payload com assinatura inválida é rejeitado com 401, sem processar.
- [ ] CA-03: Comentário de teste contendo uma palavra-chave configurada num `automation_trigger` ativo enfileira corretamente um job de execução.
- [ ] CA-04: Evento de um workspace sem o add-on ativo é ignorado (nenhum job enfileirado), sem erro.
- [ ] CA-05: Webhook responde em menos de 1s mesmo com múltiplos gatilhos batendo (matching + enfileiramento é rápido, execução real é assíncrona).

## Comandos de Validação
```bash
curl -s "https://app.<dominio>/api/v1/webhooks/instagram?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123" 
```

## Notas de Implementação
Sem `META_APP_SECRET` com o escopo de mensageria aprovado ainda, este spec pode ser desenvolvido e testado com payloads simulados (fixtures) — não bloquear o desenvolvimento esperando o App Review adicional da Meta, seguindo o mesmo padrão de degradação graciosa dos demais specs de integração externa.
