# 041 Painel Mestre (Super Admin)

## Objetivo
Implementar a visão de todos os workspaces/clientes da plataforma para o Super Admin: provisionamento, monitoramento de uso e ações administrativas (suspender/reativar).

## Contexto
Segue os specs `009` (workspace provisioning), `036` (autopilot, para métricas de uso) e `040` (billing, para status de pagamento). Ver PRD módulo/página "Painel Mestre (Super Admin)".

## Stack
- **Backend**: NestJS.
- **Frontend**: Next.js, TanStack Table (ou tabela simples com paginação manual) para a lista de workspaces.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `009-workspace-provisioning`
- [ ] `040-billing-stripe`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/platform-admin/platform-admin.module.ts`
- `apps/api/src/modules/platform-admin/platform-admin.controller.ts` — `GET /platform/workspaces` (lista todos, com uso agregado: contas conectadas, posts do mês, status de billing), `POST /platform/workspaces/:id/suspend`, `POST /platform/workspaces/:id/reactivate`, `POST /platform/workspaces` (provisionamento — reusa o `WorkspacesService` do spec `009`), `POST /platform/workspaces/:id/impersonate` (modo suporte — gera um token de acesso temporário ao workspace do cliente, com auditoria obrigatória).
- `apps/api/src/common/guards/platform-admin.guard.ts` — exige `isPlatformSuperAdmin=true` no `User` (flag mencionada no spec `007`), independente de `workspace_members`.
- `apps/web/app/(super-admin)/master-panel/page.tsx` — tabela de workspaces.
- `apps/web/components/platform-admin/WorkspaceTable.tsx`, `ProvisionWorkspaceModal.tsx`, `SuspendConfirmModal.tsx`.

### Lógica principal
1. `GET /platform/workspaces`: join agregado (Prisma) trazendo, por workspace: nome, `subscription.plan_type`/`billing_status`, contagem de `social_accounts` ativas, contagem de `content_pieces` publicadas no mês corrente, `autopilot_pipelines.last_run_at`.
2. `POST /platform/workspaces/:id/suspend`: `workspace.status='suspended'` — todos os guards de negócio (`WorkspaceGuard`, spec `007`) devem checar esse status e bloquear qualquer operação do workspace suspenso com 403 claro ("workspace suspenso, contate o suporte"), incluindo o piloto automático (workflow do n8n deve parar de processar workspaces suspensos — o endpoint `GET /internal/autopilot/active-workspaces` do spec `033` já deve filtrar por `workspace.status='active'`, ajustar lá se necessário).
3. `POST /platform/workspaces/:id/impersonate`: gera um JWT de curta duração (15 min) marcado como "sessão de suporte", grava um `audit_log` obrigatório com `action='platform_admin_impersonation'` no momento da geração — nunca permitir acesso a workspace de cliente sem essa trilha de auditoria.
4. Provisionamento pelo Super Admin reusa exatamente `WorkspacesService.create()` do spec `009`, só que chamado a partir deste controller com o `ownerUserId` sendo o e-mail informado pelo Super Admin (que ainda pode nem ter conta — nesse caso, o fluxo cria o convite, não um membership direto).

## Critérios de Aceitação
- [ ] CA-01: `GET /platform/workspaces` retorna a lista completa com os dados agregados corretos para 2+ workspaces de teste.
- [ ] CA-02: Usuário sem `isPlatformSuperAdmin=true` recebe 403 em qualquer rota `/platform/*`, mesmo sendo `workspace_admin` do seu próprio workspace.
- [ ] CA-03: Suspender um workspace bloqueia efetivamente operações de negócio nele (testar ao menos 1 endpoint de negócio retornando 403 após suspensão) e o piloto automático para de processá-lo na próxima rodada do workflow do spec `033`.
- [ ] CA-04: Reativar um workspace suspenso restaura o funcionamento normal.
- [ ] CA-05: Usar "modo suporte" (impersonate) sempre grava o `audit_log` correspondente, sem exceção.
- [ ] CA-06: Provisionar um workspace novo para um e-mail sem conta existente gera um convite (não erro), e para um e-mail com conta existente vincula diretamente.

## Comandos de Validação
```bash
curl -s http://localhost:3333/api/v1/platform/workspaces -H "Authorization: Bearer <token_super_admin>"
curl -s -X POST http://localhost:3333/api/v1/platform/workspaces/<id>/suspend -H "Authorization: Bearer <token_super_admin>"
```

## Notas de Implementação
A flag `isPlatformSuperAdmin` não deve ser autoatribuível por nenhum endpoint de produto — só setável diretamente no banco (seed/migration) ou por outro super admin através de um processo manual documentado, nunca exposta como campo editável em nenhum formulário de usuário comum.
