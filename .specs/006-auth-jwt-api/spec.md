# 006 Supabase Auth Bridge

## Objetivo
Fazer a API NestJS confiar em sessões emitidas pelo Supabase Auth (em vez de emitir seus próprios tokens), validando o JWT do Supabase em cada requisição e expondo os dados de usuário/workspaces necessários ao frontend.

## Contexto
Decisão de arquitetura atualizada (ver `.prd/prd_autocontent_os.md`, Seção 7.2): o AutoContent OS usa **Supabase Auth** para cadastro, login e gestão de sessão — não uma implementação própria de bcrypt/JWT. O **frontend fala diretamente com o Supabase Auth** (via `@supabase/supabase-js`, spec `008`) para `signUp`, `signInWithPassword`, `signInWithOAuth` (Google) e `signOut`; o Supabase emite o JWT de sessão. Este spec cobre o **lado da API**: validar esse JWT em cada requisição autenticada e expor os dados derivados que o produto precisa (perfil do usuário + workspaces).

A sincronização `auth.users` (gerenciado pelo Supabase) → `public.users` (tabela do produto) já foi resolvida no spec `003` via trigger de banco (`handle_new_user()`) — este spec não recria usuários, só consome o que já existe em `public.users` a partir do `sub` (user id) do JWT validado.

## Stack
- **Framework**: NestJS, `@nestjs/passport` + `passport-jwt` (estratégia customizada para validar o JWT do Supabase, não emitir).
- **Validação de JWT**: `jsonwebtoken`, verificando a assinatura com `SUPABASE_JWT_SECRET` (HS256 — confirmar no painel do Supabase, Settings → API → JWT Settings, qual algoritmo o projeto usa; alguns projetos Supabase mais novos usam JWKS/RS256, ajustar a estratégia de verificação de acordo com o que o projeto real usar).
- **Variáveis de ambiente necessárias**: `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (usado só para chamadas administrativas pontuais, ex: convite de membro no spec `009` via `auth.admin.inviteUserByEmail` — nunca para validar sessão de usuário comum).

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `004-setup-nestjs-api`
- [ ] `003-schema-postgres-core` — precisa do trigger `handle_new_user()` e da tabela `public.users` já existirem.

## O que implementar

### Arquivos a CRIAR
- `apps/api/src/modules/auth/auth.module.ts`
- `apps/api/src/modules/auth/strategies/supabase-jwt.strategy.ts` — `PassportStrategy(Strategy)` que extrai o Bearer token, valida a assinatura/expiração contra `SUPABASE_JWT_SECRET`, e retorna `{ id: payload.sub, email: payload.email }` como `req.user`.
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` — `AuthGuard('supabase-jwt')`.
- `apps/api/src/modules/auth/auth.controller.ts` — `GET /auth/me` (rota protegida: busca `public.users` pelo `id` do token + `workspace_members` associados, para o frontend montar o seletor de workspace, mesmo formato de resposta que o produto já esperava antes da mudança de arquitetura).
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/common/services/supabase-admin.service.ts` — **se já não existir** (pode ter sido criado no spec `003` para setup de buckets — reusar); expõe métodos administrativos como `inviteUserByEmail`, usados pelo spec `009`.

### Lógica principal
1. `SupabaseJwtStrategy`: toda requisição com header `Authorization: Bearer <token>` passa pela validação de assinatura/expiração; token inválido/expirado → 401. **Não** há endpoint de `/auth/login` ou `/auth/register` nesta API — esses fluxos acontecem inteiramente no frontend contra o Supabase Auth (spec `008`); a API só consome o resultado.
2. `GET /auth/me`: com o `req.user.id` (do token validado), busca `public.users` via Prisma + `workspace_members` (join), retornando o mesmo formato de `AuthResponse` que o resto do produto espera (`user`, lista de `workspaces` com `id`, `nome`, `role`).
3. Se `public.users` ainda não tiver a linha correspondente no momento da primeira chamada (race condition rara entre o trigger do Supabase disparar e a primeira requisição da API) — implementar um retry curto (2 tentativas, 200ms de intervalo) antes de falhar, já que a criação é assíncrona por trigger.
4. Nenhuma senha, hash, ou token de refresh é manipulado por este módulo — isso é 100% responsabilidade do Supabase Auth.

### Schema / Tipos (se aplicável)
```typescript
interface SupabaseJwtPayload {
  sub: string;   // user id, igual ao id em public.users
  email: string;
  role: string;  // 'authenticated', role interna do Supabase — não confundir com workspace role
  exp: number;
}

interface AuthMeResponse {
  user: { id: string; email: string; name: string };
  workspaces: { id: string; name: string; role: string }[];
}
```

## Critérios de Aceitação
- [ ] CA-01: Uma requisição com um JWT válido emitido de fato pelo Supabase Auth (obtido via login real de teste no painel/API do Supabase) é aceita pela `SupabaseJwtStrategy`.
- [ ] CA-02: Uma requisição com JWT adulterado (assinatura inválida) retorna 401.
- [ ] CA-03: Uma requisição com JWT expirado retorna 401 com mensagem clara.
- [ ] CA-04: `GET /auth/me` retorna corretamente os dados de `public.users` + `workspace_members` para um usuário criado via Supabase Auth minutos antes (valida a sincronização via trigger de ponta a ponta).
- [ ] CA-05: Requisição sem header `Authorization` a uma rota protegida retorna 401, não 500.

## Comandos de Validação
```bash
# obter um token real de teste via Supabase Auth REST API
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"teste@exemplo.com","password":"senha12345"}'
curl -s http://localhost:3333/api/v1/auth/me -H "Authorization: Bearer <access_token_retornado>"
```

## Notas de Implementação
Login social (Google) fica pronto "de graça" nesta arquitetura — é só habilitar o provider no painel do Supabase (Authentication → Providers) e chamar `supabase.auth.signInWithOAuth({ provider: 'google' })` no frontend (spec `008`); a API não precisa de nenhuma mudança, já que só valida o JWT resultante, independente de como o usuário se autenticou.
