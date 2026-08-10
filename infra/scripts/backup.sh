#!/usr/bin/env bash
# backup.sh (spec 043) — dump diário dos bancos internos que ficam SÓ no VPS
# (Postiz Postgres via pg_dump; n8n usa SQLite interno ao volume do
# container, então copiamos o arquivo em vez de pg_dump — ver
# infra/n8n/README.md). O banco do produto em si (Supabase) já tem backup
# gerenciado pela própria stack Supabase, não replicado aqui.
#
# Upload pro bucket "backups" do Supabase Storage self-hospedado (mesmo
# provedor de armazenamento já usado pelo resto do projeto, evita operar um
# MinIO só pra isso). Retenção: script fica agnóstico, a política de
# retenção de 30 dias (PRD 7.5) é feita pelo bucket ou por rotina separada
# de limpeza — este script só produz e sobe o dump do dia.
#
# Agendado via cron do SO (não dentro de container, sobrevive a reinícios de
# container): `0 3 * * * /opt/fastsocial/infra/scripts/backup.sh >> /var/log/fastsocial-backup.log 2>&1`
set -euo pipefail

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

: "${SUPABASE_URL:?SUPABASE_URL não configurada}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY não configurada}"
: "${POSTIZ_DATABASE_URL:?POSTIZ_DATABASE_URL não configurada}"

echo "==> Dump do Postgres do Postiz..."
POSTIZ_DUMP="${WORKDIR}/postiz-${TIMESTAMP}.sql"
docker run --rm --network easypanel postgres:17 \
  pg_dump "${POSTIZ_DATABASE_URL}" > "$POSTIZ_DUMP"

echo "==> Copiando SQLite do n8n..."
N8N_DUMP="${WORKDIR}/n8n-database-${TIMESTAMP}.sqlite"
docker cp volupia_n8n:/home/node/.n8n/database.sqlite "$N8N_DUMP" 2>/dev/null \
  || echo "AVISO: não consegui copiar o SQLite do n8n (caminho pode ter mudado — checar infra/n8n/README.md)."

echo "==> Compactando..."
ARCHIVE="${WORKDIR}/fastsocial-backup-${TIMESTAMP}.tar.gz"
tar -czf "$ARCHIVE" -C "$WORKDIR" $(basename "$POSTIZ_DUMP") $(basename "$N8N_DUMP" 2>/dev/null || true) 2>/dev/null

echo "==> Upload para o bucket 'backups' do Supabase Storage..."
curl -sf -X POST "${SUPABASE_URL}/storage/v1/object/backups/$(basename "$ARCHIVE")" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/gzip" \
  --data-binary "@${ARCHIVE}" \
  && echo "==> Backup enviado: $(basename "$ARCHIVE")" \
  || { echo "ERRO: falha ao subir o backup pro Storage."; exit 1; }
