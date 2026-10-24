# 🛡️ Programa de Gestão de Patches (PMP - Patch Management Program)
**Naville SaaS — Plataforma de Gestão & Agendamento para Barbearias**  
**Responsável:** Agente DevSecOps & SRE  
**Data da Última Revisão:** Outubro / 2026  
**Requisito de Conformidade:** [18] PMP (Patch Management Program)

---

## 🎯 1. Objetivo
Garantir que todas as camadas de software (Sistema Operacional Ubuntu da VPS, containers Docker, runtime Node.js, binário do PocketBase e bibliotecas do ecossistema) recebam correções de segurança de forma ágil, testada e sem impacto de indisponibilidade para os barbeiros e clientes.

---

## 🔄 2. Níveis de Severidade e SLAs de Aplicação de Patches

| Nível de Criticidade | Critério CVSS | Janela de Aplicação (SLA) | Procedimento |
| :--- | :--- | :--- | :--- |
| **Crítico (P0)** | CVSS >= 9.0 ou RCE ativa | **Em até 24 horas** | Aplicação emergencial fora do horário de pico (23h-05h) com notificação preventiva |
| **Alto (P1)** | CVSS 7.0 - 8.9 | **Em até 7 dias** | Aplicação na janela semanal de manutenção |
| **Médio (P2)** | CVSS 4.0 - 6.9 | **Em até 30 dias** | Integrado ao ciclo regular de release mensal |
| **Baixo (P3)** | CVSS < 4.0 | **Em até 90 dias** | Revisão trimestral de dependências |

---

## ⚙️ 3. Camadas Auditadas e Rotina Automatizada

### 1. Sistema Operacional (Ubuntu 24.04 LTS)
- Pacote `unattended-upgrades` ativo para atualização diária automática de pacotes do repositório `security.ubuntu.com`.
- Notificações de reinicialização pendente reportadas para o canal de SRE.

### 2. Containers Docker
- Imagens base travadas em versões LTS estáveis (ex: `caddy:2.8.4-alpine`, `node:22-alpine`).
- Verificação quinzenal com `docker compose pull` para capturar patches de segurança upstream.

### 3. Dependências de Código (NPM)
- Execução do script `npm audit` em todo pull request via pipeline de CI.
- Dependências sem vulnerabilidades conhecidas (0 vulnerabilidades ativas).

### 4. Execução do Script PMP
Para executar o ciclo completo de manutenção com pré e pós validação de saúde:
```bash
sudo /opt/naville/scripts/pmp-patch-management.sh
```
Se qualquer falha for detectada na pós-checagem, o script aciona alerta imediato e exibe os logs para intervenção rápida.
