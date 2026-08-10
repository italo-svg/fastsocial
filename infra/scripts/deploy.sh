#!/usr/bin/env bash
# deploy.sh (spec 043) — pull das imagens mais recentes + sobe via
# docker-compose.prod.yml + roda migrations pendentes do Prisma. Chamado
# pelo workflow .github/workflows/deploy.yml via SSH, ou manualmente.
#
# Pressupõe: repositório já clonado em /opt/fastsocial, .env em
# /opt/fastsocial/.env (nunca commitado), volume fastsocial-redis-data e
# rede "easypanel" já existentes (criados uma vez, não por este script).
set -euo pipefail

cd "$(dirname "$0")/../.."  # raiz do repo (infra/scripts/deploy.sh -> raiz)
REPO_ROOT="$(pwd)"
COMPOSE_FILE="infra/docker-compose.prod.yml"

echo "==> git pull origin main"
git pull origin main

echo "==> Aplicando migrations pendentes do Prisma (db push — mesmo padrão já usado manualmente durante o desenvolvimento, sem pasta prisma/migrations formal)"
docker run --rm --network easypanel \
  --env-file "${REPO_ROOT}/.env" \
  -v "${REPO_ROOT}/apps/api:/app" -w /app \
  node:20-slim sh -c "npm install --no-save prisma >/dev/null 2>&1 && npx prisma db push --skip-generate"

echo "==> docker compose pull (imagens publicadas pelo workflow de CI)"
docker compose -f "$COMPOSE_FILE" pull

echo "==> docker compose up -d"
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Limpando imagens antigas não usadas"
docker image prune -f

echo "==> Deploy concluído. Status:"
docker compose -f "$COMPOSE_FILE" ps
