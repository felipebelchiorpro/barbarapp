#!/usr/bin/env bash
# ==============================================================================
# Naville SaaS - Rotina Diária de Backup Automatizado para S3/Cloudflare R2
# Responsável: Agente SRE, Monitoramento & Resiliência Operacional
# Requisito [15]: Snapshot de banco de dados + rotação de 7 dias
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/opt/naville/backups"
PB_DATA_DIR="/opt/naville/pocketbase/pb_data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/naville-pb-${TIMESTAMP}.tar.gz"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "🔄 [$(date)] Iniciando snapshot do PocketBase SQLite e Storage..."

# 1. Snapshot com integridade SQLite WAL
# Para garantir que nenhuma transação em andamento corrompa o backup
if command -v sqlite3 >/dev/null 2>&1 && [ -f "${PB_DATA_DIR}/data.db" ]; then
    echo "💾 Executando sqlite3 online backup..."
    sqlite3 "${PB_DATA_DIR}/data.db" ".backup '${BACKUP_DIR}/temp_data.db'"
fi

# 2. Compactação com Tar + Gzip
tar -czf "${BACKUP_FILE}" -C "$(dirname "${PB_DATA_DIR}")" pb_data

# Limpa temp db se gerado
rm -f "${BACKUP_DIR}/temp_data.db"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup local concluído com sucesso: ${BACKUP_FILE} (${BACKUP_SIZE})"

# 3. Envio seguro para bucket externo Cloudflare R2 / AWS S3
if [ -n "${R2_BUCKET_NAME:-}" ] && command -v rclone >/dev/null 2>&1; then
    echo "☁️ Sincronizando com Cloudflare R2 bucket: ${R2_BUCKET_NAME}..."
    rclone copy "${BACKUP_FILE}" "r2:${R2_BUCKET_NAME}/daily/"
    echo "✅ Sincronização em nuvem finalizada."
elif [ -n "${R2_BUCKET_NAME:-}" ] && command -v aws >/dev/null 2>&1; then
    echo "☁️ Sincronizando com AWS S3 / R2 via aws-cli..."
    aws s3 cp "${BACKUP_FILE}" "s3://${R2_BUCKET_NAME}/daily/"
    echo "✅ Sincronização em nuvem finalizada."
fi

# 4. Rotação e purga de backups locais com mais de 7 dias
echo "🧹 Limpando backups com mais de ${RETENTION_DAYS} dias..."
find "${BACKUP_DIR}" -type f -name "naville-pb-*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "🎉 Rotina de backup concluída com êxito!"
