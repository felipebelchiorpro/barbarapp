# Naville - Plataforma SaaS de Agendamento & Gestão para Barbearias

Aplicação web moderna, multi-tenant, responsiva (mobile-first) e PWA com gestão financeira, controle de cadeiras, automação WhatsApp via Evolution API e painel Super Admin.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **npm** (ou yarn / pnpm / bun)

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a URL exibida no terminal (normalmente `http://localhost:3000` ou `http://localhost:5173`).

3. **Gerar build de produção:**
   ```bash
   npm run build
   ```

---

## 💈 Funcionalidades Principais

- **Agendamento Completo em 5 Passos:**
  1. Seleção de serviços com cálculo dinâmico de tempo e preço.
  2. Escolha de barbeiro com foto, especialidades e avaliação.
  3. Calendário dinâmico de datas e grade de horários disponíveis com prevenção de choque de horários (anti double-booking).
  4. Dados do cliente (nome, telefone formatado e observações).
  5. Revisão e confirmação instantânea.

- **Painel Administrativo do Barbeiro (`/painel/admin`):**
  - Visão diária dos agendamentos com filtro por barbeiro e status.
  - Bloqueio rápido de horários (almoço, folga, imprevistos).
  - Gestão de status: Concluído, Em andamento, Cancelado, No-show.

- **Integração WhatsApp (Evolution API):**
  - Notificação instantânea ao agendar.
  - Monitor e simulador de webhooks com logs detalhados.

- **Design Dark Mood & Foto Real:**
  - Identidade visual escura e refinada com detalhes em dourado metálico (#D4AF37).
  - Foto oficial do salão com tratamento Dark Luxury.
  - PWA instalável com suporte offline.
