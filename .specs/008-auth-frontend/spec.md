# 008 Auth Frontend (Supabase)

## Objetivo
Implementar as telas de login, cadastro e seletor de workspace no painel, usando o Supabase Auth diretamente (não a nossa API) para as ações de autenticação, e nossa API só para dados de negócio (workspaces).

## Contexto
Decisão de arquitetura atualizada: o painel fala **diretamente com o Supabase Auth** via `@supabase/supabase-js`/`@supabase/ssr` para cadastro, login, login social e sessão — a nossa API (spec `006`) só valida o JWT resultante e nunca emite tokens própria. O esqueleto do painel já existe (`005-setup-nextjs-web`, com placeholders em `(auth)/login` e `(auth)/signup`, e as dependências do Supabase já instaladas). Este spec substitui os placeholders por telas funcionais e estabelece o padrão de sessão que todas as telas futuras vão reusar.

## Stack
- **Framework**: Next.js 14 App Router, `@supabase/ssr` (helpers oficiais para App Router — gerenciam cookies de sessão entre client/server components corretamente), React Hook Form + Zod para validação de formulário.
- **Estado**: Zustand só para `activeWorkspaceId` (não para a sessão de auth em si — isso fica a cargo do Supabase client/cookies, fonte única da verdade).
- **Dados remotos**: TanStack Query para `GET /auth/me` (nossa API, spec `006`) e para chamadas de negócio subsequentes.
- **Variáveis de ambiente necessárias**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `005-setup-nextjs-web`
- [ ] `006-auth-jwt-api` (Supabase Auth Bridge)

## O que implementar

### Arquivos a CRIAR
- `apps/web/lib/supabase/client.ts` — cliente Supabase para uso em Client Components (`createBrowserClient` do `@supabase/ssr`).
- `apps/web/lib/supabase/server.ts` — cliente Supabase para uso em Server Components/Route Handlers (`createServerClient`, lendo/escrevendo cookies via `next/headers`).
- `apps/web/app/(auth)/login/page.tsx` — form de login (email/senha) + botão "Entrar com Google", chama `supabase.auth.signInWithPassword()` / `supabase.auth.signInWithOAuth({ provider: 'google' })` diretamente; em caso de sucesso redireciona para `/dashboard` (ou `/workspace-select`).
- `apps/web/app/(auth)/signup/page.tsx` — form de cadastro, chama `supabase.auth.signUp()`; se o projeto Supabase exigir confirmação de e-mail, mostrar tela de "verifique seu e-mail" em vez de redirecionar direto.
- `apps/web/app/(auth)/callback/route.ts` — Route Handler que troca o `code` do OAuth (retorno do Google) por sessão (`exchangeCodeForSession`), padrão do `@supabase/ssr` para App Router.
- `apps/web/app/(auth)/workspace-select/page.tsx` — lista os workspaces do usuário (de `GET /auth/me` na nossa API), seleção salva em `useAuthStore.activeWorkspaceId`.
- `apps/web/stores/auth.store.ts` — Zustand store, agora só com `activeWorkspaceId` e a ação `setActiveWorkspace`.
- `apps/web/lib/api-client.ts` — **modificar** o cliente criado no spec `005` para, antes de cada requisição, ler a sessão atual via `supabase.auth.getSession()` e injetar `Authorization: Bearer <access_token>` + `X-Workspace-Id: <activeWorkspaceId>`. Renovação de token é automática pelo próprio SDK do Supabase (não precisa de lógica de refresh manual).
- `apps/web/hooks/useAuth.ts` — hook que expõe `user`, `isAuthenticated` (derivado de `supabase.auth.onAuthStateChange`), `logout()` (chama `supabase.auth.signOut()`).
- `apps/web/middleware.ts` — middleware do Next.js usando `@supabase/ssr` para verificar sessão via cookies e redirecionar para `/login` qualquer rota `(workspace)/*` ou `(super-admin)/*` sem sessão válida (padrão oficial documentado pelo Supabase para Next.js App Router).

### Lógica principal
1. Login/cadastro nunca chamam nossa API diretamente — só o Supabase Auth. Nossa API só entra em cena depois, via `GET /auth/me`, para buscar dados de negócio (workspaces).
2. `onAuthStateChange` do Supabase é a fonte única da verdade sobre "logado ou não" no client — evita duplicar estado entre Zustand e sessão real.
3. Se o usuário tem exatamente 1 workspace (retornado por `GET /auth/me`), pula a tela de seleção e vai direto para `/dashboard`.
4. Formulários usam Zod schema (email válido, senha mínimo 8 caracteres, confirmação de senha no cadastro) — a validação de força de senha específica fica a cargo do próprio Supabase Auth (configurável no painel do projeto), o frontend só valida o mínimo óbvio antes de gastar uma chamada de rede.
5. Erros do Supabase Auth (`AuthApiError`, ex: "Invalid login credentials") são mapeados para mensagens em português antes de exibir via toast — nunca mostrar o erro técnico em inglês cru para o usuário final.

## Critérios de Aceitação
- [ ] CA-01: Cadastro com dados válidos cria a conta no Supabase Auth, dispara o trigger `handle_new_user()` (spec `003`) e — após confirmação de e-mail, se exigida pelo projeto — permite login e chegada ao dashboard (ou seleção de workspace).
- [ ] CA-02: Login com credenciais erradas mostra toast de erro em português, sem redirecionar.
- [ ] CA-03: Login social com Google completa o fluxo OAuth via `/auth/callback` e chega ao dashboard com sessão válida.
- [ ] CA-04: Acessar `/dashboard` sem sessão redireciona para `/login` (validado pelo `middleware.ts`).
- [ ] CA-05: Recarregar a página (F5) numa rota protegida mantém a sessão (cookies gerenciados pelo `@supabase/ssr`), sem deslogar o usuário.
- [ ] CA-06: Logout (`supabase.auth.signOut()`) limpa a sessão e uma tentativa subsequente de acessar rota protegida redireciona para login.
- [ ] CA-07: `GET /auth/me` chamado com o token da sessão Supabase retorna corretamente os dados de `public.users` + workspaces (integração real com o spec `006`).

## Comandos de Validação
```bash
pnpm --filter web dev
# manual: cadastrar, confirmar e-mail se exigido, logar (email/senha e Google), recarregar página, deslogar — validar cada CA acima no navegador
pnpm --filter web build
```

## Notas de Implementação
Seguir exatamente o padrão oficial do Supabase para Next.js App Router (`@supabase/ssr`, três clientes: browser, server, middleware) em vez de improvisar gestão de cookies manualmente — é a parte mais fácil de errar nessa integração e o pacote oficial já resolve os edge cases de refresh de token em Server Components.
