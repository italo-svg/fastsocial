# 042 Audit Log e Conformidade LGPD

## Objetivo
Registrar de forma consistente as ações sensíveis do sistema em `audit_logs`, e implementar a rotina de exportação/exclusão de dados de um workspace sob solicitação.

## Contexto
Ver PRD módulo 13 (Segurança, Auditoria & Compliance) e Seção 7.5. Vários specs anteriores (`028` conexão de conta, `041` impersonation, `026` aprovação/rejeição) já mencionam "gravar audit_log" pontualmente — este spec consolida o mecanismo central e cobre as ações que ainda não têm registro explícito, além da rotina de exportação/exclusão de dados (direito do titular sob a LGPD).

## Stack
- **Framework**: NestJS — interceptor global + serviço de auditoria.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `007-multitenant-middleware`
- [ ] `009-workspace-provisioning`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/common/services/audit-log.service.ts` — `record({ workspaceId, userId, action, entityType, entityId, metadata })`, chamado explicitamente pelos módulos que já fazem ações sensíveis (não é um interceptor automático genérico, para evitar logs ruidosos sem contexto útil — decisão consciente: auditoria explícita e intencional por chamada, não automática por rota).
- `apps/api/src/modules/audit/audit.controller.ts` — `GET /audit-logs` (só `workspace_admin`/`super_admin`, paginado, filtrável por `action`/período).
- `apps/api/src/modules/data-privacy/data-privacy.module.ts`
- `apps/api/src/modules/data-privacy/data-privacy.controller.ts` — `POST /workspaces/:id/export-data` (gera um ZIP/JSON com todos os dados do workspace: brand kit, content_pieces, publications, analytics — sobe pro storage e retorna URL assinada com expiração), `POST /workspaces/:id/delete-data` (exclusão completa e irreversível, exige confirmação explícita via um token de confirmação enviado por e-mail antes de executar — nunca uma exclusão de 1 clique).
- `apps/api/src/modules/data-privacy/data-export.service.ts`, `data-deletion.service.ts`.

### Lógica principal
1. Ações que **devem** chamar `audit-log.service.ts` explicitamente (revisar e completar nos módulos já existentes onde faltar): conexão/desconexão de conta social (`028`/`029`), alteração de brand kit (`010`), aprovação/rejeição de conteúdo (`026`), mudança de configuração do piloto automático (`036`), suspensão/reativação/impersonation de workspace (`041`), mudança de plano (`040`).
2. `POST /workspaces/:id/export-data`: roda como job assíncrono (BullMQ, pode demorar para workspaces com muito histórico), notifica quando pronto (reusa `EmailService` do spec `009`).
3. `POST /workspaces/:id/delete-data`: fluxo de duas etapas — (a) solicitação gera token de confirmação enviado ao e-mail do `workspace_admin`; (b) confirmação com o token dispara a exclusão real, que usa os `ON DELETE CASCADE` já modelados no schema (spec `003`) para limpar todas as tabelas dependentes a partir do `DELETE FROM workspaces WHERE id = ...`. Se o workspace excluído era o único vínculo de negócio de um usuário (ele não pertence a mais nenhum outro workspace), oferecer também a opção de excluir a conta em si via `supabase.auth.admin.deleteUser(userId)` — exclusão de `public.users` sozinha não remove o login em `auth.users`, e o direito do titular sob a LGPD cobre a conta inteira, não só os dados de negócio.
4. Todo o fluxo de exclusão é registrado em `audit_logs` **antes** de o workspace ser removido (já que depois não have mais como registrar nada associado a ele — usar `workspace_id NULL` com o id salvo em `metadata` para o log de exclusão em si, aproveitando o `ON DELETE SET NULL` da tabela `audit_logs`).

## Critérios de Aceitação
- [ ] CA-01: Conectar/desconectar uma conta social gera uma entrada correspondente em `audit_logs`.
- [ ] CA-02: `GET /audit-logs` é acessível só por `workspace_admin`/`super_admin`, retorna 403 para `editor`/`viewer`.
- [ ] CA-03: `POST /workspaces/:id/export-data` produz um arquivo baixável contendo os dados reais do workspace (validar abrindo o export de um workspace de teste com dados populados).
- [ ] CA-04: `POST /workspaces/:id/delete-data` sem o token de confirmação correto não executa a exclusão.
- [ ] CA-05: Confirmar a exclusão remove efetivamente todos os dados do workspace (validar que nenhuma tabela relacionada mantém linhas órfãs).
- [ ] CA-06: A ação de exclusão em si fica registrada em `audit_logs` mesmo após o workspace não existir mais.

## Comandos de Validação
```bash
curl -s http://localhost:3333/api/v1/audit-logs -H "Authorization: Bearer <token>" -H "X-Workspace-Id: <ws>"
curl -s -X POST http://localhost:3333/api/v1/workspaces/<id>/export-data -H "Authorization: Bearer <token>"
```

## Notas de Implementação
A exclusão de dados é a operação mais irreversível do sistema inteiro — implementar com o mesmo nível de cuidado que operações financeiras, incluindo um período de espera entre solicitação e confirmação (o token por e-mail já cumpre esse papel) e nunca expor um endpoint de exclusão direta sem esse fluxo de dupla confirmação.
