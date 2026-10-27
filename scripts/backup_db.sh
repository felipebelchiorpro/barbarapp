#!/bin/bash
set -e
BACKUP_DIR="/opt/naville/backups"
DB_PATH="/opt/naville/pocketbase/pb_data/data.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/data_$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
    python3 -c "import sqlite3; src = sqlite3.connect('$DB_PATH'); dst = sqlite3.connect('$BACKUP_FILE'); src.backup(dst); dst.close(); src.close()"
    gzip -f "$BACKUP_FILE"
    echo "[BACKUP OK] $BACKUP_FILE.gz criado com sucesso ($(du -h "$BACKUP_FILE.gz" | cut -f1))"
    # Limpa backups com mais de 30 dias
    find "$BACKUP_DIR" -name "data_*.db.gz" -mtime +30 -delete
else
    echo "[BACKUP ERRO] Banco $DB_PATH nao encontrado!" >&2
    exit 1
fi
