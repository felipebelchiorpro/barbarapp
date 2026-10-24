# 📋 Plano de Recuperação de Desastres (Disaster Recovery Plan)
**Naville SaaS — Plataforma de Gestão & Agendamento para Barbearias**  
**Responsável:** Agente SRE, Monitoramento & Resiliência Operacional  
**Data da Última Revisão:** Outubro / 2026  
**Requisito de Conformidade:** [20] Plano de Recuperação de Desastres (RTO < 30min, RPO < 24h)

---

## 🎯 1. Objetivos de Continuidade Operacional

| Métrica | Meta Acordada (SLA) | Resultado Prático no Naville SaaS |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **< 24 horas** | Snapshot diário do SQLite (WAL) e Storage sincronizado às 03:00 UTC para o Cloudflare R2 |
| **RTO (Recovery Time Objective)** | **< 30 minutos** | Procedimento automatizado via script `restore-disaster-recovery.sh` executado em menos de **3 a 5 minutos** |

---

## 🏗️ 2. Topologia de Dados e Armazenamento

1. **Banco de Dados Relacional & Multi-Tenant:** PocketBase (`pocketbase/pb_data/data.db` e `data.db-wal`).
2. **Armazenamento de Mídia:** Fotos de perfil, comprovantes e assets salvos em `pocketbase/pb_data/storage/`.
3. **Gateway WhatsApp:** Sessões e instâncias persistidas nos volumes `naville_evo_instances` e `naville_evo_store`.
4. **Repositório Off-Site de Backup:** Bucket privado criptografado no **Cloudflare R2** (`naville-backups-production`), imune a falhas físicas na VPS primária.

---

## 🚨 3. Procedimento Operacional Padrão (Passo a Passo)

Em caso de falha catastrófica da VPS (destruição do hardware, sequestro por ransomware ou corrupção irreversível do disco):

### Passo 1: Provisionar Nova VPS Ubuntu 24.04 LTS
- Provisionar uma instância em qualquer provedor (Hetzner, DigitalOcean, AWS ou Contabo).
- Configuração recomendada: 2 vCPUs, 4 GB RAM, 50 GB SSD NVMe.

### Passo 2: Instalação das Ferramentas Básicas (1 minuto)
```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin rclone curl sqlite3
```

### Passo 3: Clonar o Repositório do Projeto e Restaurar o `.env` (2 minutos)
```bash
git clone https://github.com/empresa/barber-app.git /opt/naville
cd /opt/naville
cp deploy/.env.production.example /opt/naville/.env
# Inserir as chaves de produção mantidas no cofre seguro (ex: 1Password / Bitwarden)
chmod 600 /opt/naville/.env
```

### Passo 4: Executar o Script de Restauração Automatizada (2 minutos)
```bash
chmod +x scripts/restore-disaster-recovery.sh
sudo ./scripts/restore-disaster-recovery.sh latest
```
O script executará automaticamente:
1. Download do snapshot mais recente do Cloudflare R2.
2. Descompactação do banco de dados SQLite e Storage.
3. Verificação de integridade com `PRAGMA integrity_check;`.
4. Subida dos containers Docker (Caddy com TLS 1.3, PocketBase, Evolution API e Backend).
5. Execução do health check `/api/health/deep`.

### Passo 5: Apontamento de DNS
- Caso o IP da VPS tenha mudado, atualizar os registros A dos domínios no Cloudflare:
  - `api.naville.app` -> `<Novo_IP_VPS>`
  - `whatsapp.naville.app` -> `<Novo_IP_VPS>`
- O Caddy emitirá os certificados SSL TLS 1.3 automaticamente em menos de 10 segundos.

---

## 🧪 4. Cronograma de Simulações e Testes (Drills)
- **Frequência:** Simulação de restauração a cada 90 dias em ambiente de staging isolado.
- **Critério de Sucesso:** Nenhum dado de agendamento ou tenant perdido, testes de RLS aprovados e RTO inferior a 15 minutos.
