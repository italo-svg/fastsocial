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
# docker cp precisa do nome REAL do container, não do nome de serviço Swarm
# (que só resolve via DNS na rede overlay, não como alvo de docker cp/exec) —
# o Swarm nomeia o container real como "volupia_n8n.<slot>.<task-id>".
N8N_CONTAINER="$(docker ps --filter "name=volupia_n8n" --format '{{.Names}}' | head -1)"
N8N_DUMP="${WORKDIR}/n8n-database-${TIMESTAMP}.sqlite"
if [ -n "$N8N_CONTAINER" ] && docker cp "${N8N_CONTAINER}:/home/node/.n8n/database.sqlite" "$N8N_DUMP" 2>/dev/null; then
  :
else
  echo "AVISO: não consegui copiar o SQLite do n8n (container não encontrado ou caminho mudou — checar infra/n8n/README.md)."
  N8N_DUMP=""
fi

# Achado real ao validar este script (spec 043): o SQLite do n8n em uso pela
# agência chegou a 480MB no momento do teste — dados de execução de workflow
# acumulados (comportamento default conhecido do n8n; recomendação oficial é
# configurar EXECUTIONS_DATA_PRUNE, fora do escopo deste script). Isso excede
# o limite padrão de upload do storage-api do Supabase self-hospedado (~50MB
# — configurado no próprio container, não por bucket, então elevá-lo exigiria
# reiniciar um serviço compartilhado com tráfego real de produção, o que não
# fizemos sem combinar antes com o usuário). Upload de cada arquivo em
# separado (em vez de um .tar.gz único) reduz o problema mas não o resolve
# se o SQLite sozinho já excede o limite — por isso o dump do Postiz (pequeno)
# sempre sobe; o do n8n só sobe se couber, com aviso claro caso não caiba.
UPLOAD_LIMIT_BYTES=52428800  # 50MB, mesmo default do storage-api do Supabase

upload_file() {
  local filepath="$1"
  local filename
  filename="$(basename "$filepath")"
  local size
  size="$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath")"
  if [ "$size" -gt "$UPLOAD_LIMIT_BYTES" ]; then
    echo "AVISO: ${filename} tem $((size / 1024 / 1024))MB, acima do limite de upload do Storage — pulando (ver comentário no topo do script)."
    return 1
  fi
  curl -sf -X POST "${SUPABASE_URL}/storage/v1/object/backups/${filename}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@${filepath}" \
    && echo "==> Backup enviado: ${filename}"
}

echo "==> Upload para o bucket 'backups' do Supabase Storage (um arquivo por vez)..."
upload_file "$POSTIZ_DUMP" || echo "ERRO: dump do Postiz não foi enviado."
if [ -n "$N8N_DUMP" ]; then
  upload_file "$N8N_DUMP" || true
fi
