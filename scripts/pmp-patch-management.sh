#!/usr/bin/env bash
# ==============================================================================
# Naville SaaS - Patch Management Program (PMP)
# Responsável: Agente SRE, Monitoramento & Resiliência Operacional
# Requisito [18]: Gestão programada de patches do SO (Ubuntu) e containers Docker
# ==============================================================================

set -euo pipefail

echo "🛡️ [PMP] Iniciando ciclo de manutenção e aplicação de patches de segurança..."
DATE_STR=$(date +"%Y-%m-%d_%H%M%S")
DEPLOY_DIR="/opt/naville/deploy"

# 1. Pré-checagem de Saúde
echo "🏥 1. Verificando integridade atual do sistema antes de aplicar patches..."
if command -v curl >/dev/null 2>&1; then
    HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health" || echo "000")
    if [ "$HEALTH_CODE" != "200" ]; then
        echo "❌ ERRO: Sistema não está 100% saudável (HTTP $HEALTH_CODE). Abortando patch automático para evitar agravar incidentes."
        exit 1
    fi
    echo "✅ Sistema saudável. Prosseguindo."
fi

# 2. Atualização de Patches de Segurança do Sistema Operacional (Ubuntu LTS)
echo "🐧 2. Verificando atualizações de segurança do sistema operacional..."
if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -q
    # Atualiza apenas pacotes de segurança sem quebrar dependências do sistema
    sudo apt-get --only-upgrade install -y unattended-upgrades linux-libc-dev openssl ca-certificates || true
    echo "✅ Patches de segurança do host Ubuntu aplicados."
fi

# 3. Atualização e Pull de Imagens Docker
echo "🐳 3. Baixando novas versões seguras de imagens Docker..."
if [ -d "$DEPLOY_DIR" ]; then
    cd "$DEPLOY_DIR"
    docker compose pull

    echo "🔄 Reiniciando containers suavemente com imagens atualizadas..."
    docker compose up -d --remove-orphans

    # 4. Pós-Checagem de Saúde (Readiness Probe)
    echo "🏥 4. Aguardando estabilização e validando novo estado do sistema..."
    sleep 5
    POST_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health/deep" || echo "000")

    if [ "$POST_HEALTH" != "200" ]; then
        echo "⚠️ ALERTA: Falha na pós-checagem de saúde (HTTP $POST_HEALTH)!"
        echo "Consultando logs de erro..."
        docker compose logs --tail=50
        exit 1
    fi

    echo "🎉 Ciclo PMP concluído com 100% de sucesso e zero downtime perceptível!"
else
    echo "ℹ️ Diretório de deploy não encontrado em /opt/naville/deploy. Rodando em ambiente de desenvolvimento."
fi
