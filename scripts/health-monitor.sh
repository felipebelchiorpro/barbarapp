#!/usr/bin/env bash
# ==============================================================================
# Naville SaaS - Watchdog de Monitoramento Contínuo & Auto-Cura
# Responsável: Agente SRE, Monitoramento & Resiliência Operacional
# Requisito [19]: Health checks automáticos (/api/health) e alertas em caso de queda
# ==============================================================================

set -euo pipefail

HEALTH_URL="http://127.0.0.1:3001/api/health/deep"
MAX_RETRIES=2
DELAY_BETWEEN_RETRIES=3

check_health() {
    curl -s -m 5 -w "%{http_code}" "$HEALTH_URL" -o /tmp/naville_health_response.json || echo "000"
}

STATUS_CODE=$(check_health)

if [ "$STATUS_CODE" != "200" ]; then
    echo "⚠️ [$(date)] Falha detectada no Health Check ($STATUS_CODE). Re-tentando em ${DELAY_BETWEEN_RETRIES}s..."
    sleep $DELAY_BETWEEN_RETRIES
    STATUS_CODE=$(check_health)
fi

if [ "$STATUS_CODE" != "200" ]; then
    ALERT_MSG="🚨 [ALERTA NAVILLE SAAS] Queda de Serviço Detectada! Status HTTP: ${STATUS_CODE}. Timestamp: $(date)"
    echo "$ALERT_MSG"

    # 1. Alerta via Webhook (Discord / Slack) se configurado
    if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
        curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"content\": \"$ALERT_MSG\"}" \
            "${ALERT_WEBHOOK_URL}" || true
    fi

    # 2. Alerta via WhatsApp (Evolution API) se configurado
    if [ -n "${ALERT_WHATSAPP_NUMBER:-}" ] && [ -n "${EVOLUTION_API_GLOBAL_KEY:-}" ]; then
        EVO_URL="${EVOLUTION_API_PUBLIC_URL:-http://127.0.0.1:8080}"
        curl -s -X POST "${EVO_URL}/message/sendText/monitor" \
            -H "apikey: ${EVOLUTION_API_GLOBAL_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"number\": \"${ALERT_WHATSAPP_NUMBER}\", \"text\": \"${ALERT_MSG}\"}" || true
    fi

    # 3. Procedimento de Auto-Cura: Reinicia containers com falha
    DEPLOY_DIR="/opt/naville/deploy"
    if [ -d "$DEPLOY_DIR" ]; then
        echo "🔧 Tentando auto-recuperação reiniciando serviços..."
        cd "$DEPLOY_DIR"
        docker compose restart app-backend pocketbase || true
    fi
else
    echo "✅ [$(date)] Todos os componentes (VPS, SQLite, Webhooks, Caddy) operando normalmente."
fi
