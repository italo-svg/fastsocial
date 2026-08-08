# 003 Schema Postgres Core (Supabase)

## Objetivo
Traduzir o schema SQL completo do produto (definido no PRD) em um schema Prisma versionado, aplicado sobre o Postgres gerenciado pelo Supabase, com a integração correta entre `auth.users` (gerenciado pelo Supabase Auth) e a tabela `public.users` do produto.

## Contexto
O AutoContent OS é uma plataforma white-label multi-tenant de automação de redes sociais. O modelo de dados completo — 15 tabelas, incluindo RLS, triggers e funções de negócio — já está especificado e é a fonte da verdade em **`.prd/prd_autocontent_os.md`, Seção 6 (Modelo de Dados) e Seção 7.2**: leia o diagrama ER (6.1) e o SQL completo (6.2) antes de começar. Não reinvente o schema — traduza exatamente o que está lá para Prisma, incluindo a tabela `image_generation_jobs`.

**Decisão de arquitetura (atualizada)**: o banco é o Postgres gerenciado do **Supabase**, não uma instância self-hosted. Isso muda duas coisas importantes em relação a uma instalação Postgres genérica:
1. **`auth.uid()` funciona nativamente** nas RLS policies — é a function embutida do Supabase que resolve o usuário autenticado da sessão atual, sem nenhum workaround necessário. As policies do PRD 6.2 (que já usam `auth.uid()`) podem ser aplicadas literalmente.
2. **Autenticação é gerenciada pelo Supabase Auth**, que mantém seus próprios usuários na tabela `auth.users` (schema `auth`, gerenciado pelo Supabase, não editável diretamente por migration nossa). A tabela `public.users` deste produto (já modelada no PRD) precisa ter seu `id` **igual** ao `id` de `auth.users` (mesmo UUID) e ser populada automaticamente via trigger no Postgres quando um novo usuário se cadastra pelo Supabase Auth — nunca inserida manualmente pela API.

## Stack
- **ORM**: Prisma (schema em `apps/api/prisma/schema.prisma`), apontando para a connection string do projeto Supabase.
- **Banco**: Postgres gerenciado pelo Supabase (projeto já criado pelo usuário — ver `.prd/checklist_acessos_e_delegacao.md`, item 1.0).
- **Variáveis de ambiente necessárias**: `DATABASE_URL` (connection string do Supabase, usar a **pooler connection** para a aplicação e a **direct connection** para rodar migrations — o Supabase fornece as duas), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (usado apenas para operações administrativas pontuais, ex: criar buckets de Storage — nunca para queries de negócio comuns, que passam pelo Prisma).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `001-setup-monorepo` — precisa do monorepo existir.
- [ ] `002-setup-docker-compose` — precisa do stack Supabase self-hospedado rodando no VPS, com `DATABASE_URL` disponível no `.env` do servidor. Todas as migrations desta spec rodam via SSH no VPS, nunca localmente (ver `.specs/shared/como-executar.md`).

## O que implementar

### Arquivos a CRIAR
- `apps/api/prisma/schema.prisma` — todos os 15 models (ver lista abaixo), com `@@map` para os nomes de tabela `snake_case` exatos do PRD. O model `User` mapeia para `public.users`, com `id` **sem** `@default(uuid())` (o valor vem sempre de `auth.users.id` via trigger, nunca gerado pelo Prisma/API).
- `apps/api/prisma/migrations/<timestamp>_init/migration.sql` — gerada pelo `prisma migrate dev`, depois **editada manualmente** para incluir: `ENABLE ROW LEVEL SECURITY` e todas as `CREATE POLICY` de cada tabela (copiadas literalmente do PRD 6.2, usando `auth.uid()` nativo do Supabase — sem workaround), as functions/triggers de negócio (`set_updated_at`, `mark_insight_consumed`, `enforce_monthly_post_limit`), **e** a function/trigger de sincronização `handle_new_user()` (ver "Lógica principal", passo 6).
- `apps/api/prisma/seed.ts` — seed mínimo: 1 workspace de exemplo (`demo`), 3-5 templates de sistema (`is_system_template = true`) vazios (slot_map de exemplo). **Não** cria usuário via seed — usuários só existem depois de passar pelo Supabase Auth (spec `006`).
- `apps/api/package.json` — scripts `prisma:migrate`, `prisma:generate`, `prisma:seed`.
- `apps/api/src/common/services/supabase-admin.service.ts` — client Supabase inicializado com `SUPABASE_SERVICE_ROLE_KEY`, usado só para criar os buckets de Storage necessários (`brand-assets`, `templates`, `content-renders`, `exports`) na inicialização/setup, não para queries de negócio.

### Lógica principal
1. Modelar as 15 tabelas do PRD 6.2 em Prisma: `workspaces`, `users`, `workspace_members`, `brand_kits`, `template_assets`, `research_insights`, `content_pieces`, `content_slides`, `image_generation_jobs`, `social_accounts`, `publications`, `analytics_snapshots`, `autopilot_pipelines`, `subscriptions`, `audit_logs`.
2. Toda outra tabela (exceto `users`) com `UUID DEFAULT gen_random_uuid()` vira `@id @default(uuid())` (o Supabase já tem `pgcrypto`/`uuid-ossp` disponível por padrão, confirmar qual extensão está habilitada no projeto).
3. Todo `CHECK` constraint do SQL original vira `@db.VarChar` + comentário no schema indicando o enum de valores válidos, replicado via SQL raw na migration (Prisma não gera CHECK constraints automaticamente a partir de comentários).
4. Relacionamentos (`FK ... ON DELETE CASCADE/SET NULL`) mapeados com `onDelete: Cascade` / `SetNull` no Prisma.
5. Após `prisma migrate dev --name init`, editar a migration gerada para acrescentar ao final: todos os `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e `CREATE POLICY` do PRD 6.2 (usando `auth.uid()` diretamente, sem adaptação), mais as 3 functions/triggers de negócio.
6. **Sincronização `auth.users` → `public.users`**: criar a function `handle_new_user()` (`SECURITY DEFINER`) que insere em `public.users (id, email, name, auth_provider)` a partir de `NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.app_metadata->>'provider'`, e o trigger `AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`. Isso é o que faz um cadastro via Supabase Auth (spec `006`) automaticamente existir como `public.users` para o resto do produto usar.
7. Criar os buckets de Storage do Supabase (`brand-assets`, `templates`, `content-renders`, `exports`) via `supabase-admin.service.ts` (script de setup rodado uma vez, ou verificação idempotente no boot da API) — cada bucket com política de acesso apropriada (buckets de conteúdo gerado podem ser públicos para leitura já que servem imagens para as redes sociais; uploads sempre exigem service role ou usuário autenticado do workspace dono).
8. Rodar `prisma generate` para gerar o client tipado.

### Schema / Tipos (se aplicável)
Usar exatamente os nomes de tabela do PRD via `@@map`, por exemplo:
```prisma
model Workspace {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  planType  String   @default("trial") @map("plan_type")
  status    String   @default("active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @map("updated_at")

  members      WorkspaceMember[]
  brandKit     BrandKit?
  // ... demais relations

  @@map("workspaces")
}
```
Repetir o padrão para as 14 tabelas restantes, seguindo fielmente os tipos/colunas do PRD 6.2.

## Critérios de Aceitação
- [ ] CA-01: `prisma migrate dev` roda sem erro contra o banco Supabase e cria as 15 tabelas em `public`.
- [ ] CA-02: Todas as tabelas com dado de tenant têm RLS habilitado (`SELECT relrowsecurity FROM pg_class WHERE relname = 'content_pieces'` retorna `true`).
- [ ] CA-03: As 3 functions/triggers de negócio do PRD (`set_updated_at`, `mark_insight_consumed`, `enforce_monthly_post_limit`) existem no banco, mais a function `handle_new_user()` e seu trigger em `auth.users`.
- [ ] CA-04: Criar um usuário de teste diretamente pelo painel do Supabase (Authentication → Add User) resulta automaticamente numa linha correspondente em `public.users` com o mesmo `id` — validação direta do trigger de sincronização.
- [ ] CA-05: `prisma db seed` roda sem erro e popula o workspace `demo` com templates de sistema.
- [ ] CA-06: `prisma generate` produz um client TypeScript sem erros de tipo.
- [ ] CA-07: Os 4 buckets de Storage existem no projeto Supabase (verificável no painel, aba Storage) após rodar o setup.
- [ ] CA-08: Inserir uma `content_piece` de teste sem `insight_id` dispara o trigger corretamente sem erro.

## Comandos de Validação
```bash
pnpm --filter api prisma migrate dev --name init
pnpm --filter api prisma generate
pnpm --filter api prisma db seed
psql $DATABASE_URL -c "\dt public.*" | wc -l   # deve listar as 15 tabelas (+ _prisma_migrations)
psql $DATABASE_URL -c "SELECT relname, relrowsecurity FROM pg_class WHERE relkind='r' AND relnamespace = 'public'::regnamespace;"
psql $DATABASE_URL -c "SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';"
```

## Notas de Implementação
- Use a **direct connection** do Supabase (não a pooler/PgBouncer) para rodar `prisma migrate dev` — migrations com `CREATE TRIGGER`/DDL podem falhar via connection pooling em modo transaction. A aplicação em runtime (spec `004`) usa a pooler connection normalmente.
- A tabela `public.users` nunca recebe `INSERT` da nossa API diretamente — sempre via o trigger a partir de `auth.users`. Se algum spec futuro precisar "criar um usuário" (ex: convite, spec `009`), o fluxo correto é convidar via Supabase Auth Admin API (`supabase.auth.admin.inviteUserByEmail`), não inserir direto em `public.users`.
- Esta é uma decisão de arquitetura da qual os specs `006` (auth), `007` (multitenant-middleware) e `009` (workspace provisioning) dependem diretamente — manter isso documentado como comentário no topo do `schema.prisma`.
