# 005 Setup Next.js Web

## Objetivo
Criar o esqueleto do painel web (`apps/web`) em Next.js com Tailwind, shadcn/ui e a estrutura de rotas base, para que as telas de negócio futuras tenham onde existir.

## Contexto
Segue o spec `001-setup-monorepo`. O painel é a interface administrativa multi-tenant do AutoContent OS (ver `.prd/prd_autocontent_os.md`, Seção 5 para design system e Seção 7.3 para estrutura de pastas alvo). Este spec cria apenas o esqueleto navegável — sem lógica de negócio, sem dados reais.

## Stack
- **Framework**: Next.js 14 (App Router), TypeScript strict.
- **Estilo**: Tailwind CSS 3 + shadcn/ui (componentes base: Button, Card, Input, Badge — instalar via `shadcn-ui add`).
- **Fontes**: Inter via `next/font/google`.
- **Estado/dados**: `@tanstack/react-query` configurado (provider global), `zustand` instalado (uso real só nos specs de auth/workspace).
- **Auth**: `@supabase/supabase-js` + `@supabase/ssr` instalados desde já (uso real no spec `008` — o painel fala diretamente com o Supabase Auth para login/cadastro/sessão, não com nossa própria API para essas ações).
- **Variáveis de ambiente necessárias**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Dependências
> Estas specs devem estar CONCLUÍDAS antes de executar esta:
- [ ] `001-setup-monorepo`

## O que implementar

### Arquivos a CRIAR
- `apps/web/package.json`, `apps/web/tsconfig.json` (extends base), `next.config.js`, `tailwind.config.ts`, `postcss.config.js`.
- `apps/web/app/layout.tsx` — layout raiz, fonte Inter, `QueryClientProvider`.
- `apps/web/app/globals.css` — reset + variáveis de cor do design system (Seção 5.1 do PRD: `--primary: #4F46E5` etc, como CSS vars para suportar dark mode).
- `apps/web/app/(public)/landing/page.tsx` — placeholder simples ("AutoContent OS — em construção").
- `apps/web/app/(auth)/login/page.tsx` e `apps/web/app/(auth)/signup/page.tsx` — placeholders de formulário (sem lógica ainda).
- `apps/web/app/(workspace)/dashboard/page.tsx` — placeholder de dashboard.
- `apps/web/components/ui/` — componentes shadcn instalados (button, card, input, badge, toast).
- `apps/web/lib/api-client.ts` — instância `fetch`/`axios` base apontando para `NEXT_PUBLIC_API_URL`, sem auth ainda (spec `008` adiciona).
- `apps/web/Dockerfile` — build multi-stage para produção.

### Lógica principal
1. App Router com os grupos de rota já estruturados conforme PRD 7.3: `(public)`, `(auth)`, `(workspace)`, `(super-admin)` — cada um com pelo menos uma página placeholder.
2. Design tokens (cores, tipografia) do PRD Seção 5.1 aplicados como CSS variables em `globals.css`, com suporte a `prefers-color-scheme: dark` desde já (mesmo que as telas reais ainda não usem).
3. `QueryClientProvider` global configurado em `layout.tsx`.
4. Navegação básica entre as páginas placeholder funcionando (só para validar que o roteamento do App Router está correto).

## Critérios de Aceitação
- [ ] CA-01: `pnpm --filter web dev` sobe o painel em `http://localhost:3000` sem erro.
- [ ] CA-02: As 5 rotas placeholder (`/landing`, `/login`, `/signup`, `/dashboard`) renderizam sem erro de build.
- [ ] CA-03: `pnpm --filter web build` gera build de produção sem erros de TypeScript/ESLint.
- [ ] CA-04: Os componentes shadcn (`Button`, `Card`, `Input`, `Badge`) estão instalados e renderizam com o tema de cores do PRD (índigo `#4F46E5` como cor primária).
- [ ] CA-05: Alternar o tema do SO entre claro/escuro muda o `background`/`foreground` da página (via `prefers-color-scheme`).

## Comandos de Validação
```bash
pnpm --filter web dev &
curl -s http://localhost:3000/landing | grep -i "AutoContent"
pnpm --filter web build
```

## Notas de Implementação
Não implementar autenticação real, chamadas à API com dados reais, nem as telas completas do PRD (Seção 5.2) — isso é responsabilidade dos specs de cada módulo (`008-auth-frontend`, `011-onboarding-wizard-frontend`, etc). Este spec só garante que a casca do app está de pé e navegável.
