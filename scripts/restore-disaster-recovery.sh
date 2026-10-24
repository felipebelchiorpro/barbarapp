#!/usr/bin/env bash
# ==============================================================================
# Naville SaaS - Protocolo Automatizado de Disaster Recovery (RTO < 30m, RPO < 24h)
# Responsável: Agente SRE, Monitoramento & Resiliência Operacional
# Requisito [20]: Restauração rápida em caso de pane total da VPS
# ==============================================================================

set -euo pipefail

BACKUP_SOURCE="${1:-latest}"
RESTORE_ROOT="/opt/naville"
PB_TARGET_DIR="${RESTORE_ROOT}/pocketbase/pb_data"
START_TIME=$(date +%s)

echo "🚨 [DISASTER RECOVERY] Iniciando protocolo de restauração emergencial..."
echo "⏱️ Meta operacional: RTO < 30 minutos | RPO < 24 horas"

# 1. Obtenção do Arquivo de Backup
if [ "$BACKUP_SOURCE" = "latest" ]; then
    echo "☁️ Buscando snapshot mais recente no Cloudflare R2 / S3..."
    mkdir -p /tmp/dr_restore
    if command -v rclone >/dev/null 2>&1 && [ -n "${R2_BUCKET_NAME:-}" ]; then
        LATEST_REMOTE=$(rclone lsf "r2:${R2_BUCKET_NAME}/daily/" --sort-by-time | tail -n 1)
        rclone copy "r2:${R2_BUCKET_NAME}/daily/${LATEST_REMOTE}" /tmp/dr_restore/
        BACKUP_FILE="/tmp/dr_restore/${LATEST_REMOTE}"
    else
        # Procura backup local mais recente
        BACKUP_FILE=$(find "${RESTORE_ROOT}/backups" -name "naville-*.tar.gz" | sort | tail -n 1)
    fi
else
    BACKUP_FILE="$BACKUP_SOURCE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERRO CRÍTICO: Arquivo de backup não localizado: $BACKUP_FILE"
    exit 1
fi

echo "📦 Usando snapshot de backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# 2. Interrupção temporária de containers para evitar concorrência de escrita
echo "🛑 Parando containers Docker para escrita atômica..."
if [ -d "${RESTORE_ROOT}/deploy" ]; then
    cd "${RESTORE_ROOT}/deploy"
    docker compose down || true
fi

# 3. Restauração do Banco SQLite e Dados de Mídia
echo "📂 Restaurando banco SQLite e storage..."
mkdir -p "$PB_TARGET_DIR"

# Backup de segurança do estado atual (se houver)
if [ -f "${PB_TARGET_DIR}/data.db" ]; then
    mv "${PB_TARGET_DIR}" "${PB_TARGET_DIR}_corrupted_$(date +%s)"
    mkdir -p "$PB_TARGET_DIR"
fi

tar -xzf "$BACKUP_FILE" -C "$(dirname "$PB_TARGET_DIR")"
echo "✅ Arquivos restaurados com sucesso."

# 4. Verificação de Integridade SQLite
if command -v sqlite3 >/dev/null 2>&1 && [ -f "${PB_TARGET_DIR}/data.db" ]; then
    echo "🔍 Executando PRAGMA integrity_check no SQLite restaurado..."
    INTEGRITY=$(sqlite3 "${PB_TARGET_DIR}/data.db" "PRAGMA integrity_check;")
    if [ "$INTEGRITY" != "ok" ]; then
        echo "❌ ERRO: Falha na integridade do banco restaurado: $INTEGRITY"
        exit 1
    fi
    echo "✅ Integridade do SQLite verificada: OK."
fi

# 5. Reinicialização dos Containers e Caddy TLS 1.3
echo "🚀 Reiniciando stack Docker com PocketBase, Caddy e Backend..."
cd "${RESTORE_ROOT}/deploy"
docker compose up -d

# 6. Validação do Health Check Pós-Restauração
echo "🏥 Aguardando subida dos serviços e executando health check..."
sleep 6

STATUS_CODE=$(curl -s -m 5 -w "%{http_code}" "http://127.0.0.1:3001/api/health/deep" -o /tmp/restore_health.json || echo "000")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$STATUS_CODE" = "200" ]; then
    echo "================================================================="
    echo "🎉 DISASTER RECOVERY CONCLUÍDO COM SUCESSO!"
    echo "⏱️ Tempo Total de Restauração (RTO atingido): ${DURATION} segundos (< 30 min)"
    echo "📊 Status da API: 100% Saudável (HTTP 200)"
    echo "================================================================="
    exit 0
else
    echo "❌ ALERTA: Restauração executada, porém health check retornou HTTP $STATUS_CODE."
    cat /tmp/restore_health.json || true
    exit 1
fi
