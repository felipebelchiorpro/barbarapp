import {
  Barber,
  Booking,
  EvolutionApiConfig,
  Service,
  TimeBlock,
  TenantConfig,
  SubscriptionPlan,
  Invoice,
  HistoricoFatura,
  InvoiceNinjaConfig,
  InvoiceNinjaWebhookLog,
  Expense,
  ExpenseCategory,
  CustomerProfile,
  CashTransaction,
  Product,
  ClientSubscriptionPlan,
  ServiceCategoryConfig,
} from '../types';
import heroImg from '../assets/images/barbearia_ls_hero_dark.jpg';
import barberDiegoImg from '../assets/images/barber_diego_1790281229207.jpg';
import barberMarcusImg from '../assets/images/barber_marcus_1790281241644.jpg';
import barberLucasImg from '../assets/images/barber_lucas_1790281253017.jpg';

export const HERO_IMAGE = heroImg;

export const DEFAULT_SERVICE_CATEGORIES: ServiceCategoryConfig[] = [
  { id: 'cabelo', name: 'Corte & Cabelo', description: 'Cortes masculinos, degrade, infantil e acabamentos' },
  { id: 'barba', name: 'Barba & Terapia', description: 'Barba alinhada, barba terapia, toalha quente' },
  { id: 'club', name: 'Barber Club', description: 'Planos mensais, fidelidade e pacotes recorrentes do clube' },
  { id: 'combos', name: 'Combos & Pacotes', description: 'Combinações de corte + barba com desconto especial' },
  { id: 'tratamento', name: 'Tratamentos & Química', description: 'Selagem, platinado, hidratação profunda e estética' },
];

export const DEFAULT_PRODUCT_CATEGORIES = [
  { id: 'pomadas', label: 'Pomadas & Ceras' },
  { id: 'barba', label: 'Óleos & Balm de Barba' },
  { id: 'cuidados', label: 'Shampoos & Cuidados' },
  { id: 'bebidas', label: 'Bebidas & Bar' },
  { id: 'insumos', label: 'Insumos & Descartáveis' },
  { id: 'outro', label: 'Outros' },
];

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'corte-cabelo',
    name: 'Cabelo',
    category: 'cabelo',
    durationMinutes: 30,
    price: 40.0,
    description: 'Corte completo com lavagem e finalização. Valor único para qualquer preferência.',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=300&q=80',
    active: true,
  },
  {
    id: 'barba',
    name: 'Barba',
    category: 'barba',
    durationMinutes: 30,
    price: 35.0,
    description: 'Alinhamento completo da barba com toalha quente, hidratação e acabamento na navalha.',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80',
    active: true,
  },
  {
    id: 'cabelo-e-barba',
    name: 'Cabelo + Barba',
    category: 'combos',
    durationMinutes: 60,
    price: 70.0,
    description: 'Combo completo de cabelo (30 min) e barba (30 min). Reserva 1 hora na grade do barbeiro.',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=300&q=80',
    active: true,
  },
  {
    id: 'pezinho-acabamento',
    name: 'Pezinho / Acabamento',
    category: 'cabelo',
    durationMinutes: 15,
    price: 20.0,
    description: 'Manutenção do contorno do cabelo, costeletas e nuca na navalha.',
    imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=300&q=80',
    active: true,
  },
  {
    id: 'sobrancelha',
    name: 'Sobrancelha',
    category: 'tratamento',
    durationMinutes: 15,
    price: 15.0,
    description: 'Limpeza e alinhamento simétrico dos fios.',
    imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=300&q=80',
    active: true,
  },
];

export const INITIAL_BARBERS: Barber[] = [
  {
    id: 'barber-leonardo',
    name: 'Leonardo Soares',
    nickname: 'Leonardo',
    role: 'Master Barber / Proprietário',
    rating: 4.98,
    reviewsCount: 384,
    avatarUrl: barberDiegoImg,
    specialties: ['Corte de Cabelo', 'Barba Completa', 'Acabamento', 'Navalha Tradicional'],
    bio: 'Mais de 10 anos de experiência. Especialista em corte masculino, barba alinhada na navalha e acabamento de alta precisão.',
    active: true,
    attendanceType: 'ambos', // Atende por Agenda e Ordem de Chegada
    acceptsSubscriptionClub: true, // Aceita Clube VIP
    serviceIds: ['corte-cabelo', 'barba', 'cabelo-e-barba', 'pezinho-acabamento', 'sobrancelha'],
    canAccessAdmin: true, // Master / Proprietário tem acesso ao painel do dono
  },
  {
    id: 'barber-diego',
    name: 'Diego Silva',
    nickname: 'Diego',
    role: 'Barbeiro Especialista',
    rating: 4.95,
    reviewsCount: 215,
    avatarUrl: barberLucasImg,
    specialties: ['Corte Clássico', 'Barba Terapia', 'Degradê'],
    bio: 'Especialista em degradê e visagismo clássico. Atendimento com pontualidade britânica.',
    active: true,
    attendanceType: 'agenda', // Apenas por Agenda (horário marcado)
    acceptsSubscriptionClub: true, // Aceita Clube VIP
    serviceIds: ['corte-cabelo', 'barba', 'cabelo-e-barba', 'pezinho-acabamento'], // Não realiza sobrancelha
    canAccessAdmin: false, // Barbeiro padrão: acesso restrito apenas à cadeira (/barbeiro)
  },
  {
    id: 'barber-marcus',
    name: 'Marcus Vinicius',
    nickname: 'Marcus',
    role: 'Barbeiro Walk-in / Fila',
    rating: 4.90,
    reviewsCount: 142,
    avatarUrl: barberMarcusImg,
    specialties: ['Corte Moderno', 'Fade', 'Navalhado'],
    bio: 'Cortes rápidos e modernos com foco em fluxo dinâmico e agilidade.',
    active: true,
    attendanceType: 'ordem_chegada', // Apenas por Ordem de Chegada (fila presencial)
    acceptsSubscriptionClub: false, // NÃO participa do Clube VIP (atendimento apenas avulso)
    serviceIds: ['corte-cabelo', 'pezinho-acabamento'], // Corta apenas cabelo
    canAccessAdmin: false, // Apenas cadeira
  },
];

export const INITIAL_TENANTS: TenantConfig[] = [];

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  id: 'tenant-barbearia-ls',
  is_vitalicio: true,
  limite_profissionais: 3,
  recurso_clube_ativo: true,
  recurso_financeiro_avancado: true,
  whatsapp_ativo: true,
  name: 'Naville Barber',
  slug: 'naville-barber',
  logoUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=300',
  ownerName: 'Proprietário',
  ownerPhone: '19999005677',
  plan: 'pro',
  planBasePrice: 89.9,
  max_barbeiros: 3,
  valor_adicional_barbeiro: 25.0,
  status: 'active',
  whatsappStatus: 'open',
  instanceName: 'barbearia',
  enabledModules: {
    expenses: true,
    clients: true,
    pdv: true,
    whatsapp_auto: true,
    clube_assinaturas: true,
  },
  createdAt: new Date().toISOString(),
  supportPhone: '5519999005677',
  plano_ciclo: 'mensal',
  status_assinatura: 'ativo',
  bloqueio_automatico: true,
  tempo_padrao_slot: 30,
  tempo_respiro_entre_cortes: 0,
  permitir_encaixe_manual: false,
  cidade: 'São Paulo - SP',
  gmv_mensal: 0,
};

// Helper to get today's date in YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_BLOCKS: TimeBlock[] = [];

export const DEFAULT_EVOLUTION_CONFIG: EvolutionApiConfig = {
  baseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EVOLUTION_API_URL) || '',
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EVOLUTION_API_KEY) || '',
  instanceName: 'barbearia',
  autoSendEnabled: true,
  reminderHoursBefore: 2,
};

// ==========================================
// Módulo 3: Planos, Faturas e Invoice Ninja
// ==========================================

export const SAAS_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter Solo',
    description: 'Perfeito para barbearias autônomas ou barbearias iniciando com 1 profissional.',
    basePrice: 49.9,
    includedSeats: 1,
    extraSeatPrice: 25.0,
    features: [
      '1 Barbeiro Incluso na Assinatura',
      'Agendamento Online 24/7 sem atrito',
      'WhatsApp Evolution API com Lembretes',
      'Painel de Gestão e Bloqueio de Horários',
      'Vagas extras: +R$ 25,00/mês cada',
      'Suporte via Chamado',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Barbearia',
    description: 'Para barbearias em expansão que contam com equipe de 2 a 3 profissionais.',
    basePrice: 89.9,
    includedSeats: 3,
    extraSeatPrice: 25.0,
    features: [
      'Até 3 Barbeiros Inclusos na Assinatura',
      'Agendamento Online sem atrito para clientes',
      'WhatsApp Evolution API com Disparo Automático',
      'Métricas de Desempenho e Relatórios',
      'Vagas extras: +R$ 25,00/mês cada',
      'Suporte Prioritário',
    ],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Elite Barbershop',
    description: 'Para barbearias de alto volume, redes ou grandes equipes de barbeiros.',
    basePrice: 149.9,
    includedSeats: 6,
    extraSeatPrice: 20.0,
    features: [
      'Até 6 Barbeiros Inclusos na Assinatura',
      'Tudo dos planos anteriores',
      'Vagas adicionais com desconto (+R$ 20,00/mês)',
      'Multi-unidades ou cadeiras sob demanda',
      'Subdomínio dedicado e personalização completa',
      'Suporte VIP via WhatsApp 24/7',
    ],
  },
];

export const DEFAULT_INVOICE_NINJA_CONFIG: InvoiceNinjaConfig = {
  baseUrl: 'https://invoicing.naville.app',
  apiToken: 'ninjatkn_live_8f3a9e2c4b1d6f0a5e7b',
  webhookSecret: 'whsec_9b2d8e4f1a7c3e5a',
  isSandbox: false,
  autoBlockOnOverdue: true,
  gracePeriodDays: 2,
};

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_HISTORICO_FATURAS: HistoricoFatura[] = INITIAL_INVOICES.map((inv) => ({
  id: inv.id,
  barbearia_id: inv.tenantId || "",
  fatura_id: inv.ninjaInvoiceId || inv.id,
  fatura_numero: inv.invoiceNumber,
  valor: inv.amount,
  data_emissao: inv.issueDate,
  data_vencimento: inv.dueDate,
  status: inv.status === 'paid' ? 'paga' : inv.status === 'overdue' ? 'vencida' : inv.status === 'cancelled' ? 'cancelada' : 'pendente',
  link_pagamento: inv.paymentLink,
  pix_copia_cola: inv.pixCopyPaste,
  pago_em: inv.paidAt || null,
}));

export const INITIAL_NINJA_WEBHOOK_LOGS: InvoiceNinjaWebhookLog[] = [];

// ==========================================
// Módulo de Controle de Gastos & Despesas
// ==========================================

export interface ExpenseCategoryMeta {
  id: ExpenseCategory;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const EXPENSE_CATEGORIES_META: Record<ExpenseCategory, ExpenseCategoryMeta> = {
  produtos: {
    id: 'produtos',
    label: 'Produtos & Cosméticos',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Pomadas, óleos de barba, shampoos e finalizadores',
  },
  descartaveis: {
    id: 'descartaveis',
    label: 'Lâminas & Descartáveis',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    description: 'Lâminas descartáveis, golas higiênicas, luvas e toalhas',
  },
  custos_fixos: {
    id: 'custos_fixos',
    label: 'Custos Fixos (Imóvel/Contas)',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'Aluguel do ponto, conta de luz, água, internet e IPTU',
  },
  manutencao: {
    id: 'manutencao',
    label: 'Manutenção & Equipamentos',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    description: 'Afiação de navalhas, troca de peças de máquinas e cadeiras',
  },
  marketing: {
    id: 'marketing',
    label: 'Marketing & Divulgação',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: 'Anúncios no Instagram/Google, cartões e faixas',
  },
  copa_cortesia: {
    id: 'copa_cortesia',
    label: 'Copa & Cortesia do Cliente',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    description: 'Café em grãos, água mineral, bebidas e petiscos',
  },
  taxas_software: {
    id: 'taxas_software',
    label: 'Software & Taxas',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    description: 'Assinatura do SaaS Naville e taxas de maquininha',
  },
  outros: {
    id: 'outros',
    label: 'Outras Despesas',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-800',
    borderColor: 'border-zinc-700',
    description: 'Despesas diversas e eventuais da barbearia',
  },
};

export const INITIAL_EXPENSES: Expense[] = [];

// ==========================================
// Base de Clientes (CRM) - Dados Iniciais
// ==========================================
// ==========================================
// Módulo de Clube de Assinaturas de Clientes - Planos Iniciais
// ==========================================
export const INITIAL_CLIENT_SUBSCRIPTION_PLANS: ClientSubscriptionPlan[] = [
  {
    id: 'plan-light',
    barbearia_id: 'tenant-barbearia-ls',
    nome: 'Plano Light (Seg a Qua)',
    descricao: 'Cortes no início da semana com economia garantida. Válido exclusivamente de Segunda a Quarta.',
    preco_mensal: 59.9,
    valor_mensal: 59.9,
    servicos_inclusos: ['corte-cabelo', 'pezinho-acabamento'],
    dias_permitidos: [1, 2, 3], // Seg, Ter, Qua
    limite_cortes_mes: 4,
    permite_barba: false,
    ativo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-black-vip',
    barbearia_id: 'tenant-barbearia-ls',
    nome: 'Plano Black VIP - Ilimitado',
    descricao: 'Atendimento prioritário de Segunda a Sábado com Cabelo e Barba inclusos. Sem limite de cortes!',
    preco_mensal: 119.9,
    valor_mensal: 119.9,
    servicos_inclusos: ['corte-cabelo', 'barba', 'cabelo-e-barba', 'pezinho-acabamento', 'sobrancelha'],
    dias_permitidos: [1, 2, 3, 4, 5, 6], // Seg a Sab
    limite_cortes_mes: 0, // 0 = Ilimitado
    permite_barba: true,
    ativo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'plan-barba-club',
    barbearia_id: 'tenant-barbearia-ls',
    nome: 'Clube da Barba na Toalha Quente',
    descricao: 'Alinhamento completo e hidratação de barba sempre alinhada na navalha (Segunda a Sexta).',
    preco_mensal: 69.9,
    valor_mensal: 69.9,
    servicos_inclusos: ['barba'],
    dias_permitidos: [1, 2, 3, 4, 5], // Seg a Sex
    limite_cortes_mes: 0, // 0 = Ilimitado
    permite_barba: true,
    ativo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_CUSTOMERS: CustomerProfile[] = [];

// ==========================================
// PDV & Caixa do Dia - Transações Iniciais
// ==========================================
export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [];

// ==========================================
// Produtos para Venda de Balcão & PDV
// ==========================================
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-pomada-matte',
    tenantId: 'tenant-barbearia-ls',
    name: 'Pomada Modeladora Efeito Matte 150g',
    category: 'pomadas',
    price: 35.0,
    costPrice: 16.0,
    stockQuantity: 18,
    minStock: 5,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-pomada-brilho',
    tenantId: 'tenant-barbearia-ls',
    name: 'Pomada Efeito Brilho / Pomade Wax 120g',
    category: 'pomadas',
    price: 38.0,
    costPrice: 17.5,
    stockQuantity: 12,
    minStock: 4,
    unit: 'un',
    active: true,
  },
  {
    id: 'prod-oleo-barba',
    tenantId: 'tenant-barbearia-ls',
    name: 'Óleo Hidratante para Barba 30ml',
    category: 'barba',
    price: 42.0,
    costPrice: 19.0,
    stockQuantity: 10,
    minStock: 3,
    unit: 'frasco',
    active: true,
  },
  {
    id: 'prod-balm-barba',
    tenantId: 'tenant-barbearia-ls',
    name: 'Balm Modelador & Pós-Barba 100g',
    category: 'barba',
    price: 36.0,
    costPrice: 16.5,
    stockQuantity: 14,
    minStock: 4,
    unit: 'pote',
    active: true,
  },
  {
    id: 'prod-shampoo-anticaspa',
    tenantId: 'tenant-barbearia-ls',
    name: 'Shampoo Anticaspa Fortalecedor 250ml',
    category: 'cuidados',
    price: 32.0,
    costPrice: 14.0,
    stockQuantity: 8,
    minStock: 3,
    unit: 'frasco',
    active: true,
  },
  {
    id: 'prod-cerveja-ipa',
    tenantId: 'tenant-barbearia-ls',
    name: 'Cerveja Artesanal IPA 355ml (Gelada)',
    category: 'bebidas',
    price: 15.0,
    costPrice: 7.5,
    stockQuantity: 24,
    minStock: 6,
    unit: 'long neck',
    active: true,
  },
  {
    id: 'prod-redbull',
    tenantId: 'tenant-barbearia-ls',
    name: 'Energético Red Bull 250ml',
    category: 'bebidas',
    price: 14.0,
    costPrice: 8.0,
    stockQuantity: 16,
    minStock: 5,
    unit: 'lata',
    active: true,
  },
  {
    id: 'prod-refrigerante',
    tenantId: 'tenant-barbearia-ls',
    name: 'Refrigerante / Suco Lata 350ml',
    category: 'bebidas',
    price: 7.0,
    costPrice: 3.5,
    stockQuantity: 30,
    minStock: 10,
    unit: 'lata',
    active: true,
  },
  {
    id: 'prod-agua',
    tenantId: 'tenant-barbearia-ls',
    name: 'Água Mineral com / sem Gás 500ml',
    category: 'bebidas',
    price: 5.0,
    costPrice: 1.8,
    stockQuantity: 40,
    minStock: 12,
    unit: 'garrafa',
    active: true,
  },
];



