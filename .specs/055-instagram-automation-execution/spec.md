# 055 Automação Instagram — Motor de Execução

## Objetivo
Executar, passo a passo, o fluxo de automação configurado (enviar DM, enviar respostas rápidas, esperar, marcar contato) quando um gatilho é disparado.

## Contexto
Segue o spec `054` (que enfileira jobs de execução). Ver PRD módulo 19. "Automações simplificadas" no MVP significa: fluxo linear (sem ramificação condicional complexa), 4 tipos de passo apenas (`send_dm`, `send_quick_replies`, `wait`, `tag_contact`).

## Stack
- **Framework**: NestJS, worker BullMQ.
- **Publicação de DM**: Meta Graph API (Instagram Messaging), reusando o token/conta já conectada via `social_accounts` (spec `028`).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `054-instagram-automation-webhook-api`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/instagram-automation/flow-executor.processor.ts` — worker BullMQ, consome os jobs enfileirados pelo spec `054`.
- `apps/api/src/modules/instagram-automation/step-handlers/send-dm.handler.ts`, `send-quick-replies.handler.ts`, `wait.handler.ts`, `tag-contact.handler.ts`.
- `apps/api/src/modules/instagram-automation/instagram-messaging.client.ts` — cliente HTTP para a Instagram Messaging API (enviar DM/quick replies).

### Lógica principal
1. Worker recebe `{ automationFlowId, triggeredBy, contactId }`, busca os `automation_flow_steps` em ordem (`step_order`).
2. Executa cada passo sequencialmente: `send_dm` chama a Instagram Messaging API; `wait` agenda o próximo passo com delay (usando o delay nativo do BullMQ, não um `sleep` bloqueante); `tag_contact` só grava metadado (sem efeito externo, usado para segmentação futura).
3. Cada execução (sucesso ou falha) grava uma linha em `automation_runs` com `status` e `error_message` quando aplicável.
4. Falha num passo específico (ex: DM rejeitada porque a janela de 24h de mensageria da Meta expirou) interrompe o fluxo daquele contato naquele momento, registra a falha, mas não afeta execuções de outros contatos/gatilhos.
5. Respeitar rate limit da API de mensageria da Meta — filas com concorrência limitada (BullMQ `concurrency`) para não estourar limite e derrubar a conexão da conta.

## Critérios de Aceitação
- [ ] CA-01: Um fluxo de 2 passos (`send_dm` → `wait` 5s → `send_quick_replies`) executa na ordem certa, com o delay respeitado.
- [ ] CA-02: Falha ao enviar DM (ex: janela de 24h expirada, simulável com mock) registra `automation_runs.status='failed'` com mensagem específica, sem derrubar o worker.
- [ ] CA-03: Dois contatos disparando o mesmo fluxo simultaneamente são processados independentemente (um não bloqueia o outro).
- [ ] CA-04: Rate limit configurado impede mais de N mensagens/segundo por conta conectada (validar com carga de teste).

## Comandos de Validação
```bash
pnpm --filter api test flow-executor.processor.spec.ts
```

## Notas de Implementação
A "janela de 24h" é uma regra real da Meta Messaging Platform (só é possível iniciar DM livre para quem interagiu nas últimas 24h, fora disso só templates aprovados) — documentar essa limitação claramente na UI do spec `056` para não gerar expectativa errada no cliente sobre o que a automação consegue fazer.
