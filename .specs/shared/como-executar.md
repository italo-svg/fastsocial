# Como Executar o Projeto — AutoContent OS

> **Não há ambiente local para este projeto.** Por decisão explícita do dono do produto, nada é instalado/rodado na máquina de quem desenvolve — todo o stack (Supabase self-hospedado, Postiz, n8n, Redis, Traefik, API, render-engine, painel) roda direto no VPS Hostinger já existente (**N8N.volupia**, `69.62.92.74`, KVM 2 — já tem Postiz e n8n instalados). Onde qualquer spec individual mencionar `localhost:3333`, `localhost:3000` etc. nos "Comandos de Validação", isso deve ser executado **via SSH, de dentro do próprio VPS** (onde os serviços realmente escutam em `localhost` uns para os outros) — nunca a partir da máquina local. Não crie `docker-compose.override.yml` de desenvolvimento local nem peça ao usuário para instalar Docker Desktop/Node localmente.

## Gotcha conhecido: variáveis `NEXT_PUBLIC_*` do painel

No `apps/web`, toda variável `NEXT_PUBLIC_*` é embutida no bundle JavaScript **em tempo de build**, não lida em runtime do container. Passar `-e NEXT_PUBLIC_SUPABASE_URL=...` só no `docker run` **não tem efeito nenhum** no código já compilado — o build precisa receber isso como `--build-arg` (o `apps/web/Dockerfile` já declara os `ARG`/`ENV` necessários). Sempre construir a imagem do painel assim:
```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.fastsocial.volupia.cloud \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://supabase.fastsocial.volupia.cloud \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key> \
  -t fastsocial-web:prod .
```
Esquecer isso resulta em erro silencioso só visível no console do navegador (`@supabase/ssr: Your project's URL and API key are required`), não no build nem nos logs do container.

## Acesso ao VPS

- IP: `69.62.92.74` (hostname `N8N.volupia`, data center Campinas/BR).
- Acesso via SSH com chave dedicada (`~/.ssh/autocontent_hostinger_ed25519` no ambiente de quem está executando os specs) — chave pública já deve estar em `authorized_keys` do servidor antes de começar (ver `.prd/checklist_acessos_e_delegacao.md`, item 1.4).
- **Antes de instalar qualquer coisa nova no servidor**: inventarie o que já está rodando (`docker ps -a`, verificar Postiz e n8n existentes) — este servidor já tem produção de outros usos do dono do produto. Nunca rodar comando de "reset"/"reinstalar" nele.

## Estrutura do monorepo (no repositório Git, versionado normalmente)
```
apps/web        → painel Next.js (multi-tenant) — roda como container no VPS
apps/api        → API NestJS — roda como container no VPS
services/render-engine     → composição visual (Playwright) — container no VPS
services/template-importer → normalização de imports Canva/Gamma
infra/                      → docker-compose (produção, direto no VPS), n8n workflows, traefik
```

## Deploy/setup no VPS (via SSH)

```bash
ssh -i ~/.ssh/autocontent_hostinger_ed25519 root@69.62.92.74

# dentro do VPS:
cd /opt/autocontent   # criar se não existir
git clone <repo> .    # ou git pull se já clonado
docker compose -f infra/docker-compose.yml up -d redis traefik
docker compose -f infra/supabase/docker-compose.yml up -d   # stack self-hospedado do Supabase (spec 002)
docker compose -f infra/docker-compose.yml up -d api web render-engine
```

## Gotcha conhecido: `docker run` da API precisa montar `infra/`

`billing.service.ts` lê `infra/billing/plans.json` em runtime (não em build) — o primeiro candidato de caminho hardcoded em `resolvePlansPath()` é `/app/infra/billing/plans.json`. A imagem da API (`apps/api/Dockerfile`) só empacota `prisma`/`dist`, nunca `infra` (de propósito: `plans.json` é mutado em runtime por `scripts/setup-stripe-products.ts`, que grava `stripePriceId` de volta no arquivo — bakeá-lo na imagem perderia essa escrita a cada rebuild). Isso significa que o container real **precisa** do volume montado manualmente:
```bash
docker run -d --name fastsocial-api-prod --network easypanel --restart unless-stopped -p 3333:3333 \
  --env-file <env> \
  -v /opt/fastsocial/infra:/app/infra:ro \
  fastsocial-api:<tag>
```
Esquecer o `-v` não quebra o build nem o healthcheck (`/health` responde `200` normalmente) — só `GET /billing/plans` e `GET /addons` falham com 500 silencioso (achado real no Task 056: estava faltando desde o deploy original do Task 040).

Postiz e n8n já existem neste servidor — **não** subir novas instâncias; os specs `027` e `032` devem ser executados em modo "conectar ao existente" (levantar apenas a configuração/integração necessária, como o app OAuth da Meta/LinkedIn dentro do Postiz já rodando), nunca em modo "instalar do zero", a menos que uma inspeção real do servidor mostre que algo está faltando.

## Variáveis de ambiente (`.env` dentro do VPS, em `/opt/autocontent/.env` — nunca commitado)

```
# Supabase self-hospedado (roda no mesmo VPS — ver infra/supabase/)
SUPABASE_URL=https://supabase.<dominio-do-projeto>
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=                       # Postgres do stack Supabase self-hospedado, rede Docker interna
NEXT_PUBLIC_SUPABASE_URL=https://supabase.<dominio-do-projeto>
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Infra própria
# REDIS_URL: fila de agendamento/publicação via BullMQ (spec 030). Container
# real no VPS: fastsocial-redis (rede easypanel), subido via
# `docker run -d --name fastsocial-redis --network easypanel --restart unless-stopped
#   -v fastsocial-redis-data:/data redis:7-alpine redis-server --appendonly yes`
REDIS_URL=redis://fastsocial-redis:6379

# IA
ANTHROPIC_API_KEY=
FAL_API_KEY=

# Bancos de imagem
UNSPLASH_ACCESS_KEY=

# Meta (Instagram + Facebook) — inclui escopo de automação de DM (Módulo 19) além de publicação
META_APP_ID=
META_APP_SECRET=

# LinkedIn (spec 029 — Caminho B: OAuth + publicação direto na API do
# LinkedIn, sem Postiz por trás, porque ele não custodia documento/PDF de
# forma confiável para carrossel — ver infra/postiz/README.md)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_API_VERSION=202501
TOKEN_ENCRYPTION_KEY=          # openssl rand -hex 32 — cifra os tokens do LinkedIn em repouso
API_PUBLIC_URL=https://api.fastsocial.volupia.cloud   # usado no redirect_uri do OAuth do LinkedIn

# Postiz (self-hosted, já existente neste VPS — container real: volupia_postiz,
# rede easypanel; API pública fica no backend Node na porta 3000, não na 5000
# do nginx/frontend — confirmado na investigação do spec 027/028)
POSTIZ_API_URL=http://volupia_postiz:3000
# POSTIZ_DATABASE_URL: acesso direto ao Postgres do Postiz, usado só para
# provisionar a Organization dedicada de cada workspace (a API pública do
# Postiz não expõe criação de organização). A apiKey por workspace fica em
# workspaces.postiz_api_key, não numa env var global.
POSTIZ_DATABASE_URL=postgresql://postgres:<senha>@volupia_postiz-db:5432/volupia

# n8n (self-hosted, já existente neste VPS — container real: volupia_n8n,
# rede easypanel; reusado pelo FastSocial, spec 032 — ver infra/n8n/README.md)
N8N_API_URL=http://volupia_n8n:5678
N8N_API_KEY=          # gerar pela UI do n8n (Configurações -> n8n API) — nao geramos por escrita direta no SQLite dele
N8N_WEBHOOK_SECRET=
N8N_SERVICE_TOKEN=    # openssl rand -hex 32 — segredo nosso, usado pelo n8n para chamar de volta nossa API

# Stripe (planos + add-ons, ver Módulo 12/19)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Observabilidade (Módulo 15)
GLITCHTIP_DSN=
POSTHOG_API_KEY=
POSTHOG_HOST=http://posthog:8000

# App
APP_BASE_URL=https://app.<dominio-do-projeto>
```

> Enquanto uma credencial real não existir, os specs de integração externa devem funcionar com a variável vazia/ausente caindo em modo mock (ver "Notas de Implementação" de cada spec de integração). Nunca falhar o build por falta de credencial de produção.

## Testes
Rodar dentro do VPS, via SSH:
```bash
pnpm test
pnpm --filter api test:e2e
```

## Convenção de commits
Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`), em português ou inglês, mensagem no imperativo.
