# 007 Multitenant Middleware

## Objetivo
Garantir que toda requisição autenticada resolve um `workspace_id` de forma segura e que nenhum dado de um workspace vaza para outro.

## Contexto
Segue o spec `006-auth-jwt-api` (usuário já autenticado via JWT do Supabase). O AutoContent OS é multi-tenant: um usuário pode pertencer a múltiplos workspaces (`workspace_members`).

**Nota de arquitetura importante**: como decidido no spec `003`, as RLS policies do banco usam `auth.uid()` nativo do Supabase — mas a API acessa o Postgres via **Prisma com uma conexão de aplicação única** (a connection string do `DATABASE_URL`), não como o usuário final autenticado por requisição. Isso significa que, do ponto de vista do Postgres, toda query do Prisma roda com um único "papel" de conexão — **o RLS por `auth.uid()` não se aplica automaticamente às queries feitas pela API via Prisma** (ele se aplicaria nativamente se o frontend consultasse o Supabase diretamente via `supabase-js` com o token do usuário, o que este produto **não** faz para dados de negócio, só para Auth). Por isso, o isolamento multi-tenant real e obrigatório, para todo o produto, é o **`WorkspaceGuard` descrito abaixo** — a aplicação é a linha de frente, não o RLS. O RLS no banco continua habilitado como camada de defesa adicional (protege contra acesso direto ao banco fora da API, ex: alguém com acesso ao painel do Supabase rodando uma query manual), mas nunca deve ser tratado como suficiente sozinho neste produto.

## Stack
- **Framework**: NestJS interceptors/guards.
- **Banco**: Prisma, conexão única de aplicação (sem RLS por sessão de usuário).
- **Header de workspace ativo**: `X-Workspace-Id` (enviado pelo frontend após o usuário escolher/ter só um workspace).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `006-auth-jwt-api` — precisa de usuário autenticado via JWT do Supabase.
- [ ] `003-schema-postgres-core` — precisa das RLS policies (defesa em profundidade) já existirem no banco.

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/common/guards/workspace.guard.ts` — roda depois do `JwtAuthGuard`; lê `X-Workspace-Id` do header, valida que `req.user.id` tem uma linha em `workspace_members` para aquele `workspace_id`, e anexa `req.workspaceId` + `req.workspaceRole` à requisição. Se o header estiver ausente e o usuário pertencer a exatamente 1 workspace, resolve automaticamente esse workspace (evita fricção no frontend). Se pertencer a 0 ou 2+ sem header explícito, retorna 400.
- `apps/api/src/common/decorators/current-workspace.decorator.ts` — decorator `@CurrentWorkspace()` para injetar `{ id, role }` nos controllers.
- `apps/api/src/common/decorators/roles.decorator.ts` e `apps/api/src/common/guards/roles.guard.ts` — `@Roles('workspace_admin', 'super_admin')` para proteger rotas sensíveis (billing, conexões).
- `apps/api/src/common/prisma/scoped-query.helper.ts` — helper/convenção reutilizada por todos os services de negócio a partir do spec `009`: toda query Prisma que lê/escreve uma entidade com `workspace_id` **deve** incluir `where: { workspaceId: currentWorkspace.id, ... }` explicitamente — como o Postgres não filtra isso sozinho neste desenho (ver nota de arquitetura no Contexto), esse helper existe para tornar o padrão consistente e difícil de esquecer (ex: um wrapper fino que já injeta a cláusula, ou no mínimo um lint rule/convenção documentada em `.specs/shared/regras-de-nomenclatura.md` — atualizar esse arquivo compartilhado como parte desta spec).

### Lógica principal
1. Todo controller de recurso de negócio (a partir do spec `009` em diante) usa `@UseGuards(JwtAuthGuard, WorkspaceGuard)` e injeta `@CurrentWorkspace()`.
2. `WorkspaceGuard` nunca confia em `workspace_id` vindo do body/query — sempre resolve a partir do header + tabela `workspace_members`, nunca do payload da requisição.
3. `super_admin` é um caso especial: pode acessar qualquer workspace mesmo sem estar em `workspace_members` daquele workspace — usar uma flag `isPlatformSuperAdmin` no `User` (adicionar coluna se ainda não existir, coordenando com o schema do spec `003` via migration adicional) ou uma tabela `platform_admins` separada.
4. **Toda** query de negócio feita via Prisma nos specs seguintes deve filtrar explicitamente por `workspace_id = req.workspaceId` na cláusula `where` — isso é o mecanismo real de isolamento (não o RLS do banco, conforme nota de arquitetura acima). Deixar isso escrito de forma inequívoca em `.specs/shared/regras-de-nomenclatura.md` para orientar todos os specs futuros que ainda serão escritos/executados.
5. Testar explicitamente o caso de vazamento: usuário do workspace A tentando acessar recurso do workspace B via `X-Workspace-Id` de B sem ser membro → deve retornar 403, mesmo estando autenticado.

## Critérios de Aceitação
- [ ] CA-01: Requisição autenticada sem `X-Workspace-Id`, usuário com 1 único workspace → resolve automaticamente, `req.workspaceId` populado.
- [ ] CA-02: Requisição autenticada sem `X-Workspace-Id`, usuário com 2+ workspaces → retorna 400 pedindo o header.
- [ ] CA-03: Requisição com `X-Workspace-Id` de um workspace ao qual o usuário NÃO pertence → retorna 403.
- [ ] CA-04: Um endpoint de negócio de exemplo (criar um mínimo de CRUD de teste, ou antecipar o do spec `010`) só retorna linhas do `workspace_id` resolvido pelo `WorkspaceGuard`, mesmo que a query não filtre por engano — testar com 2 workspaces populados com dados distintos e confirmar isolamento real na resposta da API.
- [ ] CA-05: `@Roles('workspace_admin')` bloqueia um usuário com role `viewer` tentando acessar a rota, retornando 403.
- [ ] CA-06: `super_admin` consegue acessar qualquer workspace via header, mesmo sem linha em `workspace_members` daquele workspace.

## Comandos de Validação
```bash
# usuário A tenta acessar workspace de usuário B
curl -s http://localhost:3333/api/v1/brand-kit -H "Authorization: Bearer <token_usuario_A>" -H "X-Workspace-Id: <workspace_id_de_B>"
# esperado: 403
```

## Notas de Implementação
Esta é a spec de segurança mais crítica do projeto — um erro aqui significa vazamento de dado entre clientes revendidos, o pior cenário possível para um produto white-label. Escrever teste de integração dedicado (`workspace-isolation.e2e-spec.ts`) que popula 2 workspaces com dados reais e garante isolamento cruzado antes de considerar este spec concluído, mesmo que isso exceda o critério mínimo de cobertura de outros specs.
