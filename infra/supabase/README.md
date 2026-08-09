# Supabase Self-hosted — FastSocial

Stack oficial do Supabase (`docker-compose.yml`, vendorizado do repositório oficial `supabase/supabase`, pasta `docker/`) rodando no VPS `N8N.volupia` (`69.62.92.74`), ao lado do Postiz/n8n/Cal.com já existentes, gerenciados pelo Easypanel.

## Serviços ativos (trimados do stack completo para economizar recursos)

Rodando: `db` (Postgres), `auth` (GoTrue), `rest` (PostgREST), `storage`, `meta` (postgres-meta), `kong` (gateway), `studio` (painel admin), `imgproxy` (dependência do storage).

**Desligados de propósito** (podem ser ligados depois se necessário, bastando `docker compose up -d <serviço>`): `realtime` (não usado pelos specs atuais), `functions` (edge functions — usamos a API NestJS própria em vez disso), `supavisor` (pooler de conexão — avaliar se necessário quando a carga real justificar).

## Rede e roteamento

- `kong` está conectado a **duas** redes: a rede interna padrão do compose (`supabase_default`, onde fala com `db`/`auth`/`rest`/`storage`/`meta`) e a rede overlay `easypanel` (já existente no servidor), via `docker-compose.override.yml` — isso é o que permite o Traefik do Easypanel alcançar o Kong sem expor porta nenhuma para fora.
- Rota pública: `https://supabase.fastsocial.volupia.cloud` → `http://supabase-kong:8000`, configurada em `/etc/easypanel/traefik/config/fastsocial.yaml` no servidor (arquivo separado do `main.yaml` gerado pelo Easypanel — **nunca editar o `main.yaml`**). Esse arquivo de rota **não está neste repositório** (vive só no servidor) — replicar manualmente se o servidor precisar ser recriado (ver conteúdo abaixo).
- DNS: `*.fastsocial.volupia.cloud` e `fastsocial.volupia.cloud` (A record) apontam para `69.62.92.74`, configurados via API da Hostinger.

### Conteúdo de referência do arquivo de rota (para recriar se necessário)

```yaml
http:
  routers:
    fastsocial-supabase:
      rule: "Host(`supabase.fastsocial.volupia.cloud`)"
      entryPoints:
        - https
      service: fastsocial-supabase-kong
      tls:
        certResolver: letsencrypt
  services:
    fastsocial-supabase-kong:
      loadBalancer:
        servers:
          - url: "http://supabase-kong:8000"
```

## Segredos

O `.env` real (com `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `DASHBOARD_PASSWORD`, etc.) **não está neste repositório** — vive só em `/opt/fastsocial/infra/supabase/.env` no servidor, permissão `600`. Gerado a partir do `.env.example` oficial do Supabase, com os placeholders substituídos por valores gerados via `openssl rand` (segredos simétricos) e um JWT assinado com o `JWT_SECRET` gerado (`ANON_KEY`/`SERVICE_ROLE_KEY`).

Para a API do produto (spec `004` em diante) usar essas credenciais, elas precisam ser copiadas para o `.env` da aplicação (`/opt/fastsocial/.env`, ver `.specs/shared/como-executar.md`) — não duplicar geração de segredos, reusar os mesmos valores.

## URLs

- **Studio (admin)**: `https://supabase.fastsocial.volupia.cloud/` (basic auth: usuário `admin`, senha no `.env` do servidor).
- **Auth**: `https://supabase.fastsocial.volupia.cloud/auth/v1/*`
- **REST (PostgREST)**: `https://supabase.fastsocial.volupia.cloud/rest/v1/*`
- **Storage**: `https://supabase.fastsocial.volupia.cloud/storage/v1/*`

## Validado em 2026-08-09

- [x] `db`, `auth`, `rest`, `storage`, `meta`, `kong`, `studio`, `imgproxy` — todos `healthy`.
- [x] `GET /auth/v1/health` com `apikey` retorna resposta válida do GoTrue.
- [x] Studio acessível via Kong com basic auth (redirect 307 esperado na raiz).
- [x] Certificado HTTPS válido emitido automaticamente (Let's Encrypt, resolver `letsencrypt` já existente do Easypanel).
- [ ] `REST /rest/v1/` retornou 403 com a `anon key` — esperado neste ponto (schema/roles ainda não configurados pela spec `003`); revalidar depois que o schema do produto for aplicado.
