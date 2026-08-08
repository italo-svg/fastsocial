# 009 Workspace Provisioning

## Objetivo
Permitir a criação de um novo workspace (tenant) e o convite de membros para ele, tanto pelo próprio usuário (self-service) quanto pelo Super Admin.

## Contexto
Segue os specs `006` (auth) e `007` (multitenant middleware). Até aqui, um usuário pode se cadastrar mas não tem nenhum workspace — este spec resolve isso: cria o workspace, a primeira linha em `workspace_members` (role `workspace_admin`, o próprio criador), e o mecanismo de convite por e-mail para adicionar mais membros com outros papéis (`editor`, `viewer`). Ver PRD Seção 3, jornada "Super Admin — Gestão de Clientes" e "Admin do Workspace — Primeiro Uso".

## Stack
- **Framework**: NestJS (API) + Next.js (frontend mínimo desta spec — o wizard completo de onboarding de marca é do spec `011`).
- **E-mail de convite**: usar a **Supabase Auth Admin API** (`supabase.auth.admin.inviteUserByEmail`, via `SUPABASE_SERVICE_ROLE_KEY`) para o e-mail de convite em si — o Supabase já cuida do envio (com SMTP próprio configurável no painel do projeto) e, ao aceitar, cria a linha em `auth.users`, disparando o trigger `handle_new_user()` do spec `003` automaticamente. Nossa tabela `workspace_invites` (abaixo) guarda o contexto de negócio (qual workspace, qual role) que o Supabase não conhece. Um `EmailService` genérico (Resend ou mock) segue existindo para outras notificações do produto que não são convite de conta (ex: aviso de export de dados pronto, spec `042`) — não duplicar esse serviço aqui, só reusar se necessário.
- **Variáveis de ambiente necessárias**: `SUPABASE_SERVICE_ROLE_KEY` (já configurada), `RESEND_API_KEY` (opcional/mock, para o `EmailService` genérico).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `006-auth-jwt-api` (Supabase Auth Bridge)
- [ ] `007-multitenant-middleware`

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/workspaces/workspaces.module.ts`
- `apps/api/src/modules/workspaces/workspaces.controller.ts` — `POST /workspaces` (cria workspace + torna o criador `workspace_admin`), `GET /workspaces/:id`, `POST /workspaces/:id/invites`, `POST /invites/:token/accept`, `GET /workspaces/:id/members`, `DELETE /workspaces/:id/members/:userId`.
- `apps/api/src/modules/workspaces/workspaces.service.ts`
- `apps/api/src/modules/workspaces/dto/create-workspace.dto.ts`, `invite-member.dto.ts`.
- `apps/api/src/common/services/email.service.ts` — interface + implementação Resend + implementação mock.
- `apps/web/app/(workspace)/onboarding/create/page.tsx` — form simples "nome do workspace" → chama `POST /workspaces`, seta como workspace ativo, redireciona para `011-onboarding-wizard-frontend` (brand kit).
- `apps/web/app/(workspace)/settings/members/page.tsx` — lista de membros + form de convite por e-mail (placeholder de UI, a tela completa de Configurações é polida depois se necessário).

### Lógica principal
1. `POST /workspaces`: cria `Workspace` (slug gerado a partir do nome, garantindo unicidade com sufixo numérico se colidir) + `WorkspaceMember` do criador com role `workspace_admin` + `Subscription` em plano `trial` com limites padrão (`max_social_accounts=1`, `max_posts_per_month=20`, conforme default do PRD 6.2) — tudo numa transação Prisma.
2. `POST /workspaces/:id/invites`: só `workspace_admin`/`super_admin` pode convidar; gera um registro em `workspace_invites` (UUID, expiração de 7 dias: `id, workspace_id, email, role, token, expires_at, accepted_at`) e chama `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: APP_BASE_URL + '/invites/' + token })` — o Supabase envia o e-mail de convite e, se o e-mail ainda não tiver conta, cria o `auth.users` já na aceitação do convite (fluxo padrão do Supabase), disparando `handle_new_user()`. Se o e-mail já tiver conta Supabase existente, `inviteUserByEmail` retorna erro "já existe" — nesse caso, enviar em vez disso uma notificação simples (via `EmailService` genérico) com o link direto `APP_BASE_URL/invites/:token`, já que a pessoa só precisa logar e aceitar, não criar conta nova.
3. `POST /invites/:token/accept`: usuário autenticado (via sessão Supabase — já logado ou acabou de definir senha pelo fluxo de convite do Supabase) aceita o convite → cria `WorkspaceMember` com o role definido no convite.
4. `DELETE /workspaces/:id/members/:userId`: remove acesso; `workspace_admin` não pode remover a si mesmo se for o último admin do workspace (bloquear com erro claro).

### Schema / Tipos (se aplicável)
```prisma
model WorkspaceInvite {
  id          String    @id @default(uuid())
  workspaceId String    @map("workspace_id")
  email       String
  role        String
  token       String    @unique
  expiresAt   DateTime  @map("expires_at")
  acceptedAt  DateTime? @map("accepted_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("workspace_invites")
}
```
Criar como migration adicional sobre o schema do spec `003` (esta tabela não estava no PRD original — documentar essa adição no changelog/README do projeto).

## Critérios de Aceitação
- [ ] CA-01: `POST /workspaces` cria o workspace, o membership admin e a subscription trial numa única operação atômica (falha em qualquer etapa reverte tudo).
- [ ] CA-02: Slug duplicado é resolvido automaticamente (`minha-marca`, `minha-marca-2`, ...) sem erro para o usuário.
- [ ] CA-03: Convite gera token válido por 7 dias; aceitar após expirado retorna erro claro.
- [ ] CA-04: Usuário com role `editor` tentando convidar alguém recebe 403.
- [ ] CA-05: Tentar remover o único `workspace_admin` restante retorna erro em vez de deixar o workspace órfão de admin.
- [ ] CA-06: Convidar um e-mail sem conta existente dispara o e-mail de convite do Supabase; convidar um e-mail com conta Supabase já existente cai no caminho alternativo (notificação com link direto) sem erro para o usuário que está convidando.

## Comandos de Validação
```bash
curl -s -X POST http://localhost:3333/api/v1/workspaces -H "Authorization: Bearer <token>" -d '{"name":"Minha Marca"}'
curl -s -X POST http://localhost:3333/api/v1/workspaces/<id>/invites -H "Authorization: Bearer <token>" -d '{"email":"novo@exemplo.com","role":"editor"}'
```

## Notas de Implementação
O provisionamento feito pelo **Super Admin** (criar workspace para um cliente revendido, PRD módulo "Painel Mestre") reusa este mesmo `POST /workspaces`, só que chamado a partir da tela do spec `041-painel-mestre-superadmin` — não precisa de endpoint duplicado, só de uma UI diferente por cima.
