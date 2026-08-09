# Estado Atual do Deploy (ad-hoc, pré-spec-043)

Este documento existe porque, até o spec `043` formalizar o deploy via `docker-compose.prod.yml` + CI/CD, os containers da API e do painel foram subidos manualmente (`docker run`) durante a validação dos specs 004-008, e ficaram no ar servindo os domínios reais — não são só testes descartáveis, são o ambiente de desenvolvimento contínuo atual.

## Containers de longa duração no VPS

| Container | Imagem | Rede(s) | Serve |
|---|---|---|---|
| `fastsocial-api-prod` | `fastsocial-api:dev` | `easypanel` + `supabase_default` | `https://api.fastsocial.volupia.cloud` |
| `fastsocial-web-auth` | `fastsocial-web:dev` | `easypanel` | `https://app.fastsocial.volupia.cloud` |

Roteamento em `/etc/easypanel/traefik/config/fastsocial.yaml` (arquivo próprio, não gerado pelo Easypanel — ver `infra/supabase/README.md` para a explicação de por que essa abordagem existe).

## Como atualizar (até o spec 043 existir)

```bash
ssh -i ~/.ssh/autocontent_hostinger_ed25519 root@69.62.92.74
cd /opt/fastsocial && git pull origin main

# API
cd apps/api && docker build -t fastsocial-api:dev .
docker rm -f fastsocial-api-prod
docker run -d --name fastsocial-api-prod --network easypanel \
  -e DATABASE_URL=... -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... -e SUPABASE_JWT_SECRET=... -e APP_BASE_URL=... \
  fastsocial-api:dev
docker network connect supabase_default fastsocial-api-prod

# Web (build-args obrigatorios — ver .specs/shared/como-executar.md, secao "Gotcha")
cd ../web && docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.fastsocial.volupia.cloud \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://supabase.fastsocial.volupia.cloud \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -t fastsocial-web:dev .
docker rm -f fastsocial-web-auth
docker run -d --name fastsocial-web-auth --network easypanel -p 127.0.0.1:3002:3000 fastsocial-web:dev
```

## Lição de rede aprendida

Anexar uma rede overlay (`easypanel`) a um container **já rodando** via `docker network connect` nem sempre fica reachable pelo Traefik de forma confiável (visto na prática: `docker exec traefik wget http://container:porta` deu "connection refused" mesmo com IP correto). O que funcionou de forma confiável: declarar a rede que o Traefik precisa alcançar (`easypanel`) como rede **primária na criação** do container (`docker run --network easypanel ...`), e conectar redes adicionais (`supabase_default`, para acesso ao Postgres) **depois** — nessa ordem funcionou sem problema. Sempre criar os containers já com `--network easypanel` desde o início.

## Dados de teste no banco

Usuários e workspaces de teste (specs 006-008) continuam no banco — úteis para os próximos specs, não foram removidos:
- `teste-validacao@fastsocial.dev` — membro de `workspace-a` (admin) e `workspace-b` (viewer)
- `teste-b@fastsocial.dev` — membro de `workspace-b` (admin)
