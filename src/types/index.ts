export interface Service {
  id: string;
  name: string;
  category: 'cabelo' | 'barba' | 'combos' | 'tratamento';
  durationMinutes: number;
  price: number;
  description: string;
  popular?: boolean;
  imageUrl?: string;
  active?: boolean;
}

export type BarberAttendanceType = 'agenda' | 'ordem_chegada' | 'ambos';

export interface Barber {
  id: string;
  name: string;
  nickname: string;
  role: string;
  rating: number;
  reviewsCount: number;
  avatarUrl: string;
  specialties: string[];
  bio: string;
  active?: boolean;
  attendanceType?: BarberAttendanceType;       // 'agenda' (apenas hora marcada) | 'ordem_chegada' (apenas fila) | 'ambos'
  acceptsSubscriptionClub?: boolean;           // participa ou não do clube de assinaturas / plano de corte
  serviceIds?: string[];                       // IDs de serviços que este profissional realiza (se vazio/undefined, realiza todos)
}

export type TenantStatus = 'active' | 'blocked' | 'trial';

export interface TenantModulesConfig {
  expenses?: boolean;          // Controle de Gastos & DRE
  clients?: boolean;           // Base de Clientes & CRM
  pdv?: boolean;               // PDV / Caixa do Dia (Fluxo de Caixa)
  whatsapp_auto?: boolean;     // WhatsApp API Automático
  clube_assinaturas?: boolean; // Clube de Assinaturas de Clientes (Recorrência)
}

export type SubscriptionBillingCycle = 'mensal' | 'semestral' | 'anual';
export type SubscriptionStatus = 'ativo' | 'em_atraso' | 'cancelado' | 'periodo_teste';

export type TipoDocumentoFiscal = 'CNPJ' | 'CPF';
export type RegimeTributario = 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Outro';
export type PlanoContratado = 'starter' | 'pro' | 'enterprise' | 'Pro' | 'Executive' | 'Black' | string;

export interface TenantConfig {
  id: string;
  name: string; // Nome Fantasia
  slug: string;
  ownerName: string;
  ownerPhone: string;
  plan: 'starter' | 'pro' | 'enterprise';
  planBasePrice?: number;
  customDiscount?: number;    // Desconto fixo especial de parceiro (R$)
  partnerNote?: string;       // Motivo do desconto / acordo (ex: Parceiro Instagram)
  enabledModules?: TenantModulesConfig;
  max_barbeiros: number;
  maxBarbers?: number; // Compatibilidade com chamadas legado
  valor_adicional_barbeiro: number;
  status: TenantStatus;
  whatsappStatus: WhatsAppConnectionStatus;
  instanceName?: string;
  evolution_instance_name?: string; // Nome da instância no Evolution API
  whatsapp_status?: string;         // 'open' | 'connecting' | 'close' | 'disconnected'
  whatsapp_phone?: string;          // Telefone do WhatsApp conectado
  createdAt: string;
  supportPhone?: string;
  address?: string;                 // Endereço formatado para exibição rápida
  plan_base_price?: number;         // Preço base do plano (compatibilidade)
  ninjaClientId?: string;
  currentInvoiceId?: string;
  nextBillingDate?: string;

  // Módulo 3: Ciclo de vida de faturação e subscrição
  invoice_ninja_client_id?: string;
  plano_ciclo?: SubscriptionBillingCycle;
  status_assinatura?: SubscriptionStatus;
  bloqueio_automatico?: boolean; // Padrão: true (suspende se houver inadimplência)

  // Matriz de Recursos do Parceiro Vitalício & Gateways Isolados
  is_vitalicio?: boolean;                // Isenção permanente de cobrança da mensalidade SaaS da Naville
  limite_profissionais?: number;         // Limite de cadeiras/profissionais permitidos (default: 1)
  recurso_clube_ativo?: boolean;         // Habilita Clube de Assinaturas dos clientes (Mercado Pago do dono)
  recurso_financeiro_avancado?: boolean; // Habilita Fluxo Financeiro / Caixa / DRE
  whatsapp_ativo?: boolean;              // Habilita Motor WhatsApp (Nativo)
  stripe_customer_id?: string;           // ID do cliente no Stripe (faturamento SaaS Naville)
  stripe_subscription_id?: string;       // ID da assinatura no Stripe (faturamento SaaS Naville)

  // Configurações da Agenda & Regras de Slots Contíguos
  tempo_padrao_slot?: number; // Intervalo da grade em minutos (padrão: 30)
  tempo_respiro_entre_cortes?: number; // Buffer de esterilização/limpeza em minutos (0, 5, 10, 15)
  permitir_encaixe_manual?: boolean; // Permite encaixe manual no PDV / painel interno
  horario_abertura?: string; // Padrão: '09:00'
  horario_fechamento?: string; // Padrão: '20:00'
  cidade?: string; // Ex: 'São Paulo - SP', 'Curitiba - PR'
  gmv_mensal?: number; // Volume mensal transacionado na ponta final

  // ==========================================================================
  // Formulário Completo de Cadastro de Estabelecimento (Dados Fiscais & NFS-e)
  // NOTA: Apenas 'name' / 'nome_fantasia' é obrigatório. Todos os demais são opcionais.
  // ==========================================================================

  // A. Dados de Identificação & Fiscais
  nome_fantasia?: string; // Sinônimo padronizado de name
  razao_social?: string;
  tipo_documento?: TipoDocumentoFiscal;
  documento?: string; // CNPJ ou CPF sem formatação
  inscricao_municipal?: string; // Fundamental para NFS-e
  inscricao_estadual?: string; // Se houver comércio de cosméticos
  regime_tributario?: RegimeTributario;

  // B. Endereço Completo do Estabelecimento
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  estado_uf?: string; // Ex: 'SP', 'RJ', 'MG'

  // C. Contato & Responsável Financeiro (Cobrança & Notas)
  nome_responsavel?: string; // Mapeado para ownerName
  cpf_responsavel?: string;
  email_financeiro?: string;
  whatsapp_financeiro?: string; // Mapeado para ownerPhone

  // D. Configuração do Contrato / SaaS
  plano_contratado?: PlanoContratado;
  ciclo_pagamento?: SubscriptionBillingCycle;
  valor_mensalidade_acordado?: number;
  max_barbeiros_inclusos?: number;

  // E. Personalização Visual & Vitrine Pública
  logoUrl?: string;
  capaPrincipalUrl?: string;
  galeriaFotos?: string[];
  descricao_espaco?: string;
  googleMapsUrl?: string;
  instagramUrl?: string;
  horarios_funcionamento?: DayOperatingHours[];
  plano_saas?: 'basico' | 'pro' | 'vitalicio';
  is_public?: boolean;
}

export interface DayOperatingHours {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  dayLabel: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasLunchBreak: boolean;
  lunchStart: string;
  lunchEnd: string;
}

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  barberId: string;
  barberName: string;
  barberAvatar: string;
  services: Service[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  totalMinutes: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
  notifyWhatsApp: boolean;
  reminderStatus?: 'scheduled' | 'sent' | 'cancelled';
  webhookDispatched?: boolean;
}

export interface TimeBlock {
  id: string;
  barberId: string; // 'all' or specific barber id
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  reason: string;
  createdAt: string;
}

export interface ContiguousSlotOption {
  time: string; // "10:30"
  endTime: string; // "11:30"
  available: boolean;
  reason?: string;
  availableBarberIds: string[];
  slotsCount: number; // e.g. 2 slots
  isIsolated: boolean; // Livre para 1 serviço de 30m, mas insuficiente para o combo completo
  freeDurationMinutes: number; // Quanto tempo contíguo realmente está livre
}

export interface IntelligentAlternatives {
  hasAlternatives: boolean;
  singleServiceOption?: {
    service: Service;
    availableSlotsCount: number;
    sampleTimes: string[];
  };
  otherBarberOption?: {
    barber: Barber;
    firstAvailableTime: string;
    totalAvailableSlots: number;
  };
  nextAvailableDateOption?: {
    dateStr: string;
    formattedDate: string; // Ex: "Terça-feira (20/10)"
    firstAvailableTime: string;
    barberName: string;
  };
}

export interface ContiguousSlotsResult {
  date: string;
  durationMinutes: number;
  effectiveDurationMinutes: number;
  slots: ContiguousSlotOption[];
  availableCount: number;
  isolatedCount: number;
  hasContiguousSlot: boolean;
  alternatives: IntelligentAlternatives;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  eventType: 'booking.created' | 'booking.reminder' | 'booking.status_changed' | 'test.ping';
  bookingId?: string;
  customerName: string;
  customerPhone: string;
  payload: Record<string, unknown>;
  status: 'delivered' | 'simulated' | 'error';
  endpoint: string;
  responseMessage: string;
}

export type WhatsAppConnectionStatus = 'open' | 'connecting' | 'close';

export interface EvolutionApiConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  autoSendEnabled: boolean;
  reminderHoursBefore: number;
}

export type WhatsAppTemplateEventType = 'confirmacao_agendamento' | 'lembrete_2h' | 'reativacao_cliente';

export interface WhatsAppMessageTemplate {
  id?: string;
  barbearia_id: string;
  tipo_evento: WhatsAppTemplateEventType;
  conteudo: string;
  delay_segundos: number;
  simular_digitando: boolean;
  ativo: boolean;
  created?: string;
  updated?: string;
}

export interface WhatsAppDispatchAuditLog {
  id: string;
  barbearia_id: string;
  agendamento_id?: string;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_evento: WhatsAppTemplateEventType | 'teste';
  mensagem: string;
  status: 'enviado' | 'falha' | 'simulando_digitando';
  delay_aplicado: number;
  simulou_digitando: boolean;
  evolution_response?: unknown;
  created?: string;
}

// ==========================================
// Módulo 3: Invoice Ninja & Assinaturas Types
// ==========================================

export type SubscriptionPlanId = 'starter' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  basePrice: number;
  includedSeats: number;
  extraSeatPrice: number;
  features: string[];
  recommended?: boolean;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  ninjaInvoiceId?: string;
  invoiceNumber: string;
  amount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  items: InvoiceItem[];
  paymentMethod?: 'pix' | 'credit_card' | 'bank_slip';
  paymentLink?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;

  // Compatibilidade com estrutura historico_faturas
  barbearia_id?: string;
  fatura_id?: string;
  fatura_numero?: string;
  valor?: number;
  data_emissao?: string;
  data_vencimento?: string;
  link_pagamento?: string;
  pago_em?: string | null;
}

export interface HistoricoFatura {
  id: string;
  barbearia_id: string;
  fatura_id: string;
  fatura_numero: string;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  status: 'pendente' | 'paga' | 'vencida' | 'cancelada';
  link_pagamento?: string;
  pix_copia_cola?: string;
  pago_em?: string | null;
}

export interface InvoiceNinjaConfig {
  baseUrl: string;
  apiToken: string;
  webhookSecret: string;
  isSandbox: boolean;
  autoBlockOnOverdue: boolean;
  gracePeriodDays: number;
}

export type InvoiceNinjaWebhookEvent =
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'payment.created'
  | 'invoice.overdue'
  | 'invoice.past_due'
  | 'invoice.payment_failed'
  | 'subscription.renewed'
  | 'subscription.cancelled';

export interface InvoiceNinjaWebhookLog {
  id: string;
  timestamp: string;
  eventType: InvoiceNinjaWebhookEvent;
  tenantId: string;
  tenantName: string;
  invoiceNumber: string;
  amount: number;
  idempotencyKey: string;
  status: 'applied' | 'ignored_duplicate' | 'error';
  actionTaken: string;
  payload: Record<string, unknown>;
}

// ==========================================
// Módulo de Controle de Gastos & Fluxo de Caixa
// ==========================================

export type ExpenseCategory =
  | 'produtos'
  | 'descartaveis'
  | 'custos_fixos'
  | 'manutencao'
  | 'marketing'
  | 'copa_cortesia'
  | 'taxas_software'
  | 'outros';

export type ExpenseStatus = 'paid' | 'pending' | 'overdue';

export type ExpensePaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'cash';

export interface Expense {
  id: string;
  tenantId: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: string;          // Formato YYYY-MM-DD
  paidAt?: string | null;   // Timestamp ou null
  status: ExpenseStatus;
  paymentMethod: ExpensePaymentMethod;
  isRecurring: boolean;     // Repete todo mês
  supplier?: string;        // Nome do fornecedor / favorecido
  notes?: string;
  createdAt: string;
}

// ==========================================
// Módulo de Base de Clientes & CRM
// ==========================================
export interface CustomerProfile {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  notes?: string;
  totalBookings: number;
  totalSpent: number;
  total_visitas?: number;   // Alias PT-BR
  total_gasto?: number;     // Alias PT-BR (LTV)
  lastVisitDate?: string;
  ultima_visita?: string;   // Alias PT-BR
  favoriteBarberId?: string;
  favoriteBarberName?: string;
  createdAt: string;
  // Módulo de Clube de Assinaturas de Clientes
  plano_assinatura_id?: string | null;
  status_assinatura?: ClientSubscriptionStatus;
  data_inicio_plano?: string;
  data_renovacao?: string;
  data_vencimento?: string;
  forma_cobranca?: ClientBillingMethod;
  modalidade_assinatura?: AssinaturaModalidade;
  cortes_utilizados_mes?: number;
}

// ==========================================
// Módulo de Clube de Assinaturas de Clientes (PocketBase Schema: planos_assinatura & assinaturas_clientes)
// ==========================================
export type ClientSubscriptionStatus = 'ativo' | 'atrasado' | 'vencido' | 'cancelado' | 'sem_plano';
export type ClientBillingMethod = 'pix_mensal' | 'cartao' | 'dinheiro_balcao';

export type AssinaturaModalidade = 'manual' | 'recorrente_gateway';
export type AssinaturaStatus = 'ativo' | 'vencido' | 'cancelado';

export interface PlanoAssinatura {
  id: string;
  barbearia_id: string;            // Relation -> barbearias
  nome: string;                    // Nome do plano (ex: "Clube do Corte Bronze")
  valor_mensal: number;            // Valor mensal em R$
  limite_cortes_mes: number;       // 0 para ilimitado, ou cota fixa (ex: 4)
  permite_barba: boolean;          // default false
  ativo: boolean;                  // default true
  link_mercado_pago?: string;      // URL direta do plano criado no Mercado Pago
  // Campos auxiliares de interface / compatibilidade
  descricao?: string;
  servicos_inclusos?: string[];
  dias_permitidos?: number[];
  barbeiros_permitidos?: string[]; // IDs de barbeiros que atendem pelo plano (se vazio, todos que aceitam clube)
  preco_mensal?: number;           // Alias para valor_mensal
  createdAt?: string;
}

export interface AssinaturaCliente {
  id: string;
  barbearia_id: string;            // Relation -> barbearias
  cliente_id: string;              // Relation -> clientes
  plano_id: string;                // Relation -> planos_assinatura
  modalidade: AssinaturaModalidade;// 'manual' ou 'recorrente_gateway'
  status: AssinaturaStatus;        // 'ativo', 'vencido', 'cancelado'
  data_inicio: string;             // YYYY-MM-DD
  data_vencimento: string;         // YYYY-MM-DD
  cortes_utilizados_mes: number;   // default 0
  gateway_subscription_id?: string;// Identificador da assinatura no Mercado Pago
  // Metadados auxiliares para renderização rápida
  cliente_nome?: string;
  cliente_telefone?: string;
  plano_nome?: string;
  plano_valor?: number;
}

export interface ClientSubscriptionPlan extends PlanoAssinatura {
  // Alias de compatibilidade com interfaces anteriores
  descricao: string;
  preco_mensal: number;
  valor_mensal: number;
  servicos_inclusos: string[];
  dias_permitidos: number[];
  limite_cortes_mes: number; // 0 = ilimitado, ou cota fixa
  permite_barba: boolean;
  link_mercado_pago?: string;
}

// ==========================================
// Módulo de Produtos & Vendas de Balcão
// ==========================================
export interface Product {
  id: string;
  tenantId: string;
  name: string;
  category: 'pomadas' | 'barba' | 'bebidas' | 'cuidados' | 'outro';
  price: number;
  costPrice?: number;
  stockQuantity: number;
  minStock?: number;
  unit?: string;
  active: boolean;
}

export interface ComandaServiceItem {
  id: string;
  name: string;
  price: number;
}

export interface ComandaProductItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ComandaTransactionData {
  barbearia_id: string;
  cliente_id: string | null;
  customerName?: string;
  customerPhone?: string;
  barbeiro_id: string;
  barberName?: string;
  servicos: ComandaServiceItem[];
  produtos: ComandaProductItem[];
  valor_total: number;
  forma_pagamento: CashPaymentMethod;
  data_hora: string;
}

// ==========================================
// Módulo PDV & Fluxo de Caixa do Dia
// ==========================================
export type CashTransactionType = 'in' | 'out';
export type CashPaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash';
export type CashTransactionCategory =
  | 'servico_corte'
  | 'produto_venda'
  | 'sangria_retirada'
  | 'suprimento_troco'
  | 'outro';

export interface CashTransaction {
  id: string;
  tenantId: string;
  description: string;
  type: CashTransactionType;
  amount: number;
  paymentMethod: CashPaymentMethod;
  category: CashTransactionCategory;
  barberId?: string;
  barberName?: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  bookingId?: string;
  timestamp: string;
  // Campos detalhados para Fechamento de Comanda Completo
  barbearia_id?: string;
  cliente_id?: string | null;
  barbeiro_id?: string;
  servicos?: ComandaServiceItem[];
  produtos?: ComandaProductItem[];
  valor_total?: number;
  forma_pagamento?: CashPaymentMethod;
  data_hora?: string;
}

// ==========================================
// Módulo de BI & Telemetria do Super Admin
// ==========================================
export type SaaSTelemetryPeriod = 'hoje' | '30d' | 'mes' | 'ano' | 'vitalicio';

export interface SaaSBiMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Run Rate (MRR * 12)
  churnRate: number; // % cancelados / total
  gmvTotal: number; // Gross Merchandise Value (volume bruto de cortes + vendas nas barbearias)
  activeTenantsCount: number;
  trialTenantsCount: number;
  blockedTenantsCount: number;
  totalTenantsCount: number;
  totalBarberSeats: number;
  expansionRevenue: number; // Receita de vagas extras além da base (R$ 25/mês)
  evolutionMessagesCount: number; // Total de mensagens disparadas via Evolution API
  growthHistory: {
    month: string;
    mrr: number;
    novos: number;
    cancelados: number;
  }[];
  planDistribution: {
    plan: string;
    label: string;
    count: number;
    revenue: number;
    percentage: number;
    color: string;
  }[];
  cycleDistribution: {
    cycle: string;
    label: string;
    count: number;
    percentage: number;
  }[];
}

export interface TenantHealthRecord {
  is_vitalicio?: boolean;
  tenantId: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerPhone: string;
  city: string;
  plan: 'starter' | 'pro' | 'enterprise';
  cycle: 'mensal' | 'semestral' | 'anual';
  barbersCount: number;
  maxBarbers: number;
  gmvMonthly: number;
  mrrContribution: number;
  billingStatus: 'ativo' | 'em_atraso' | 'cancelado' | 'periodo_teste';
  status: 'active' | 'blocked' | 'trial';
  evolutionMessagesCount: number;
  healthScore: 'excellent' | 'good' | 'warning' | 'danger';
  daysOverdue?: number;
  unresolvedErrorsCount?: number;
  last24hErrorsCount?: number;
}

// ==========================================
// Módulo de Webhooks de Sincronização de CRM & Vendas
// ==========================================
export type CrmWebhookEventType =
  | 'saas.lead.cadastro_iniciado'
  | 'saas.barbearia.ativada'
  | 'saas.upsell.vaga_adicionada'
  | 'saas.cobranca.em_atraso'
  | 'saas.cobranca.cancelada_ou_bloqueada';

export interface CrmWebhookConfig {
  url: string;
  secretKey: string;
  enabled: boolean;
  activeEvents: CrmWebhookEventType[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrmWebhookLog {
  id: string;
  event: CrmWebhookEventType;
  url: string;
  timestamp: string;
  statusCode: number;
  statusText: string;
  durationMs: number;
  payload: any;
  signature: string;
  success: boolean;
  responseSummary?: string;
}

// ==========================================
// Módulo de Logs de Erros do Sistema & Telemetria Técnica
// ==========================================
export type SystemErrorLevel = 'critico' | 'aviso' | 'erro_api';

export type SystemErrorModule =
  | 'evolution_api'
  | 'agendamento'
  | 'pdv_checkout'
  | 'faturacao'
  | 'autenticacao'
  | 'sistema_geral';

export interface SystemErrorEnvironment {
  userAgent: string;
  url: string;
  path?: string;
  dispositivo?: string;
  screenSize?: string;
  appVersion?: string;
}

export interface SystemErrorTechnicalDetails {
  stackTrace?: string;
  endpoint?: string;
  httpStatus?: number;
  requestPayload?: any;
  responseBody?: any;
  componentStack?: string;
  errorName?: string;
  ambiente?: SystemErrorEnvironment;
  [key: string]: any;
}

export interface SystemErrorLog {
  id: string;
  barbearia_id: string | null;
  barbearia_nome?: string;
  nivel: SystemErrorLevel;
  modulo: SystemErrorModule;
  mensagem_erro: string;
  detalhes_tecnicos: SystemErrorTechnicalDetails | string;
  usuario_id?: string | null;
  resolvido: boolean;
  data_hora: string;
  resolvido_em?: string;
  resolvido_por?: string;
  notas_suporte?: string;
}

// ==========================================
// Módulo de Autenticação, RBAC & Isolamento Multi-Tenant (RLS)
// ==========================================
export type UserRole = 'superadmin' | 'owner' | 'manager' | 'barber' | 'client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  barbearia_id: string;
  barber_id?: string; // Se role === 'barber', ID correspondente na lista de barbeiros
  phone?: string;
  avatarUrl?: string;
  status: 'active' | 'blocked' | 'pending';
  createdAt: string;
  twoFactorEnabled?: boolean;
  commissionRate?: number; // Ex: 0.50 (50% de comissão sobre os serviços)
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  tenant: TenantConfig;
  expiresAt: number;
}

export interface PocketBaseCollectionRuleDefinition {
  collection: string;
  description: string;
  listRule: string;
  viewRule: string;
  createRule: string;
  updateRule: string;
  deleteRule: string;
}

// ==========================================
// Módulo PWA do Barbeiro ("Modo Cadeira")
// ==========================================
export interface BarberExtraItem {
  id: string;
  name: string;
  type: 'service' | 'product';
  price: number;
  icon?: string;
  category: string;
  durationMinutes?: number;
}

export interface ChairOrderItem {
  id: string;
  name: string;
  type: 'service' | 'product';
  price: number;
  quantity: number;
  addedAt: string;
}

export interface ChairOrder {
  bookingId: string;
  customerName: string;
  barberId: string;
  tenantId: string;
  basePrice: number;
  items: ChairOrderItem[];
  additionalTotal: number;
  totalWithExtras: number;
  notes?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
}

export interface BarberPerformanceSummary {
  barberId: string;
  barberName: string;
  commissionRate: number;
  todayServicesCount: number;
  todayGrossRevenue: number;
  todayCommission: number;
  monthServicesCount: number;
  monthGrossRevenue: number;
  monthCommission: number;
  recentCompletions: {
    bookingId: string;
    customerName: string;
    serviceName: string;
    price: number;
    commission: number;
    time: string;
  }[];
}


