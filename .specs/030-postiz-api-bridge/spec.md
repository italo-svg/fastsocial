# 030 Postiz API Bridge (Agendamento e Publicação)

## Objetivo
Implementar o cliente que agenda e publica peças de conteúdo aprovadas nas redes conectadas, via API do Postiz (Instagram/Facebook, e LinkedIn se o Caminho A do spec `029` se aplicar), gravando o resultado em `publications`.

## Contexto
Segue os specs `025` (content-pieces, peças em `approved`), `028` (contas Meta conectadas) e `029` (contas LinkedIn conectadas). Ver PRD módulo 8 (Agendamento & Publicação) e tabela `publications` (Seção 6.2). Este spec é o que efetivamente move uma peça `approved` para `scheduled` e depois `published`.

## Stack
- **Framework**: NestJS, BullMQ (jobs agendados de publicação).
- **Variáveis de ambiente necessárias**: `POSTIZ_API_URL`, `POSTIZ_API_KEY` (já configuradas no spec `028`).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `025-content-pieces-api`
- [ ] `028-meta-oauth-bridge`
- [ ] `029-linkedin-oauth-bridge`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/publications/publications.module.ts`
- `apps/api/src/modules/publications/publications.controller.ts` — `POST /content-pieces/:id/schedule` (`{ socialAccountId, scheduledAt }`), `GET /publications?from=&to=` (para o calendário, spec futuro se necessário — reusa aqui), `POST /publications/:id/cancel`, `POST /publications/:id/reschedule`.
- `apps/api/src/modules/publications/publications.service.ts`
- `apps/api/src/modules/publications/publish.processor.ts` — worker BullMQ que dispara a publicação efetiva no horário agendado (usar o "delay" nativo do BullMQ calculado a partir de `scheduledAt - now()`).
- `apps/api/src/modules/publications/network-publishers/instagram-facebook.publisher.ts` — chama a API do Postiz.
- `apps/api/src/modules/publications/network-publishers/linkedin.publisher.ts` — chama Postiz (Caminho A) ou `linkedin-publish.service.ts` do spec `029` (Caminho B), conforme o que foi decidido lá.

### Lógica principal
1. `POST /content-pieces/:id/schedule`: valida que a peça está `approved`, cria uma `publication` por `social_account_id` alvo (uma peça pode ser publicada em mais de uma conta/rede simultaneamente — o schema já suporta N publications por content_piece), transição `content_piece.status: approved → scheduled`, enfileira o job no BullMQ com delay até `scheduledAt`.
2. `publish.processor.ts`: no horário, busca a `publication`, resolve qual publisher usar (`network` da `social_account`), chama o publisher correspondente passando as `rendered_image_url`/`document_url` da `content_piece`.
3. Sucesso: `publication.status='published'`, `published_at=now()`, `postiz_reference_id` salvo (id retornado pelo Postiz ou pela LinkedIn API direta); `content_piece.status='published'` quando **todas** as publications daquela peça estiverem publicadas com sucesso (uma peça pode ir para múltiplas redes).
4. Falha: `publication.status='failed'`, `error_message` salvo com o erro real (não genérico — precisa ser acionável para o usuário, ex: "token expirado", "formato de imagem rejeitado pela API do Instagram"); retry automático 2x com backoff (5min, 30min) antes de desistir e notificar (a notificação em si, se for além de um badge na UI, pode ser um spec futuro de e-mail/push — aqui só grava o estado de falha corretamente).
5. `POST /publications/:id/reschedule`: só permitido enquanto `status='scheduled'` (não publicado ainda); cancela o job BullMQ atual e cria um novo com o novo delay.

## Critérios de Aceitação
- [ ] CA-01: Agendar uma peça aprovada para "daqui a 2 minutos" (teste) resulta na publicação real acontecendo dentro dessa janela, sem intervenção manual.
- [ ] CA-02: Uma peça agendada para 2 redes diferentes (ex: Instagram e LinkedIn) gera 2 `publications` e publica em ambas de forma independente — falha em uma não impede a outra.
- [ ] CA-03: Publicação com token expirado registra `status='failed'` com mensagem específica ("token expirado, reconecte a conta"), não uma mensagem genérica.
- [ ] CA-04: Reagendar uma publicação ainda pendente cancela o job antigo e cria um novo corretamente (validar que não publica duas vezes).
- [ ] CA-05: `content_piece.status` só vira `published` quando todas as suas `publications` associadas estão `published` — se uma rede falhar e outra suceder, o status da peça reflete isso de forma clara (ex: manter `scheduled` com um indicador de falha parcial, não marcar como `published` prematuramente).

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/content-pieces/<id>/schedule -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>" -d '{"socialAccountId":"<sa-id>","scheduledAt":"2026-08-08T15:00:00Z"}'
```

## Notas de Implementação
Este é o spec que efetivamente "publica na internet de verdade" — testar exaustivamente em contas de teste/sandbox antes de qualquer cliente real usar. O retry com backoff é importante especificamente porque falhas transitórias de rate limit das APIs de rede social são comuns e não devem virar falha permanente na primeira tentativa.
