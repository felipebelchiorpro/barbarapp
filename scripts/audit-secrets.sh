#!/usr/bin/env bash
# ==============================================================================
# Naville SaaS - Auditoria de Secrets & Permissões de Arquivos (.env)
# Responsável: Agente DevSecOps & Infraestrutura
# ==============================================================================

set -euo pipefail

echo "🛡️ [DevSecOps] Executando auditoria de secrets e variáveis sensíveis..."

ENV_FILE="/opt/naville/.env"
if [ -f "$ENV_FILE" ]; then
    PERMS=$(stat -c "%a" "$ENV_FILE" 2>/dev/null || stat -f "%Lp" "$ENV_FILE" 2>/dev/null || echo "unknown")
    if [ "$PERMS" != "600" ]; then
        echo "⚠️ ALERTA DE SEGURANÇA: Permissões de $ENV_FILE são $PERMS (esperado: 600)!"
        echo "Corrigindo permissões agora: chmod 600 $ENV_FILE"
        chmod 600 "$ENV_FILE"
    else
        echo "✅ Permissões de $ENV_FILE estão estritamente seguras (600)."
    fi
fi

# Executa scanner em Node.js
node "$(dirname "$0")/audit-secrets.mjs"

echo "🎉 Auditoria de Secrets concluída com êxito!"
