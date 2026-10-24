import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  createManualSubscription,
  isSubscriptionExpired,
  renewSubscription,
  syncExpiredSubscriptions,
  canTenantUseGatewayRecurrence,
  validateServiceForSubscriber,
  incrementSubscriptionUsage,
  addDaysToDate,
  getTodayDateString,
} from '../src/services/subscriptionValidator';
import {
  PlanoAssinatura,
  AssinaturaCliente,
  CustomerProfile,
  Service,
} from '../src/types';
import { enforceMultiTenantAccess } from '../src/services/pocketbaseApiRules';

console.log('======================================================');
console.log('🏛️ SUÍTE: CLUBE DE ASSINATURAS & MULTI-TENANT POCKETBASE');
console.log('======================================================\n');

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// =========================================================================
// BLOCO 1: Modelagem PocketBase & Migração 006
// =========================================================================
console.log('📌 Bloco 1: Modelagem PocketBase & Migração 006');

const migrationPath = path.resolve(
  process.cwd(),
  'pocketbase/pb_migrations/1710000006_club_subscriptions_schema.js'
);

test('Arquivo de migração 1710000006_club_subscriptions_schema.js existe no repositório', () => {
  assert.strictEqual(fs.existsSync(migrationPath), true);
});

test('Migração define a coleção planos_assinatura com os campos estritos exigidos', () => {
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert.strictEqual(content.includes("name: 'planos_assinatura'"), true);
  assert.strictEqual(content.includes("name: 'barbearia_id'"), true);
  assert.strictEqual(content.includes("name: 'nome'"), true);
  assert.strictEqual(content.includes("name: 'valor_mensal'"), true);
  assert.strictEqual(content.includes("name: 'limite_cortes_mes'"), true);
  assert.strictEqual(content.includes("name: 'permite_barba'"), true);
  assert.strictEqual(content.includes("name: 'ativo'"), true);
  assert.strictEqual(content.includes("name: 'link_mercado_pago'"), true);
});

test('Migração define a coleção assinaturas_clientes com os campos estritos exigidos', () => {
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert.strictEqual(content.includes("name: 'assinaturas_clientes'"), true);
  assert.strictEqual(content.includes("name: 'cliente_id'"), true);
  assert.strictEqual(content.includes("name: 'plano_id'"), true);
  assert.strictEqual(content.includes("name: 'modalidade'"), true);
  assert.strictEqual(content.includes("values: ['manual', 'recorrente_gateway']"), true);
  assert.strictEqual(content.includes("name: 'status'"), true);
  assert.strictEqual(content.includes("values: ['ativo', 'vencido', 'cancelado']"), true);
  assert.strictEqual(content.includes("name: 'data_inicio'"), true);
  assert.strictEqual(content.includes("name: 'data_vencimento'"), true);
  assert.strictEqual(content.includes("name: 'cortes_utilizados_mes'"), true);
  assert.strictEqual(content.includes("name: 'gateway_subscription_id'"), true);
});

test('Aplica regras estritas de isolamento multi-tenant (@request.auth.barbearia_id = barbearia_id)', () => {
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert.strictEqual(content.includes('@request.auth.barbearia_id = barbearia_id'), true);
  assert.strictEqual(content.includes('@request.auth.role = "superadmin"'), true);
});

test('Implementa rollback reversível (função DOWN) para planos e assinaturas', () => {
  const content = fs.readFileSync(migrationPath, 'utf-8');
  assert.strictEqual(content.includes("const collections = ['assinaturas_clientes', 'planos_assinatura']"), true);
  assert.strictEqual(content.includes('app.delete(col)'), true);
});

test('Validador RLS bloqueia acesso cruzado entre barbearias em planos_assinatura', () => {
  const userA = {
    id: 'user-barbearia-a',
    email: 'dono@barbearia-a.com',
    name: 'Dono A',
    role: 'owner' as const,
    barbearia_id: 'tenant-a',
    status: 'active' as const,
    createdAt: '2026-01-01',
  };

  const planTenantB = {
    id: 'plan-1',
    barbearia_id: 'tenant-b',
    nome: 'Plano B',
  };

  const result = enforceMultiTenantAccess(userA, 'planos_assinatura', 'view', planTenantB);
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.code, 403);
});

test('Validador RLS bloqueia barbeiro de criar ou alterar planos de assinatura', () => {
  const barberUser = {
    id: 'barber-1',
    email: 'barber@barbearia-a.com',
    name: 'Barbeiro 1',
    role: 'barber' as const,
    barbearia_id: 'tenant-a',
    status: 'active' as const,
    createdAt: '2026-01-01',
  };

  const planTenantA = {
    id: 'plan-1',
    barbearia_id: 'tenant-a',
    nome: 'Plano A',
  };

  const result = enforceMultiTenantAccess(barberUser, 'planos_assinatura', 'create', planTenantA);
  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.code, 403);
});

// =========================================================================
// BLOCO 2: Nível 1 - Gestão Manual & Expiração Automática
// =========================================================================
console.log('\n📌 Bloco 2: Nível 1 - Gestão Manual & Expiração Automática');

test('Ativa assinatura manual com vigência exata de +30 dias, modalidade=manual e cota zerada', () => {
  const sub = createManualSubscription({
    barbearia_id: 'tenant-ls',
    cliente_id: 'cust-10',
    plano_id: 'plan-bronze',
    startDate: '2026-10-23',
  });

  assert.strictEqual(sub.barbearia_id, 'tenant-ls');
  assert.strictEqual(sub.cliente_id, 'cust-10');
  assert.strictEqual(sub.plano_id, 'plan-bronze');
  assert.strictEqual(sub.modalidade, 'manual');
  assert.strictEqual(sub.status, 'ativo');
  assert.strictEqual(sub.data_inicio, '2026-10-23');
  assert.strictEqual(sub.data_vencimento, '2026-11-22'); // +30 dias
  assert.strictEqual(sub.cortes_utilizados_mes, 0);
});

test('Identifica se data de vencimento < hoje como vencido', () => {
  const today = '2026-10-23';
  assert.strictEqual(isSubscriptionExpired('2026-10-22', today), true);
  assert.strictEqual(isSubscriptionExpired('2026-10-23', today), false); // Vence hoje = ainda válido
  assert.strictEqual(isSubscriptionExpired('2026-10-24', today), false);
});

test('Botão Renovar +30 dias estende vencimento e restaura cota zerada', () => {
  const expiredSub: AssinaturaCliente = {
    id: 'sub-1',
    barbearia_id: 'tenant-ls',
    cliente_id: 'cust-1',
    plano_id: 'plan-1',
    modalidade: 'manual',
    status: 'vencido',
    data_inicio: '2026-09-01',
    data_vencimento: '2026-10-01',
    cortes_utilizados_mes: 4,
  };

  const renewed = renewSubscription(expiredSub, 30, '2026-10-23');
  assert.strictEqual(renewed.status, 'ativo');
  assert.strictEqual(renewed.data_vencimento, '2026-11-22'); // Hoje + 30 dias
  assert.strictEqual(renewed.cortes_utilizados_mes, 0);
});

test('Varredura em lote (syncExpiredSubscriptions) atualiza assinaturas expiradas para vencido', () => {
  const subs: AssinaturaCliente[] = [
    {
      id: 'sub-active',
      barbearia_id: 'tenant-ls',
      cliente_id: 'c1',
      plano_id: 'p1',
      modalidade: 'manual',
      status: 'ativo',
      data_inicio: '2026-10-01',
      data_vencimento: '2026-10-31',
      cortes_utilizados_mes: 2,
    },
    {
      id: 'sub-past-due',
      barbearia_id: 'tenant-ls',
      cliente_id: 'c2',
      plano_id: 'p1',
      modalidade: 'manual',
      status: 'ativo',
      data_inicio: '2026-09-01',
      data_vencimento: '2026-10-01',
      cortes_utilizados_mes: 3,
    },
  ];

  const { updatedSubscriptions, expiredCount } = syncExpiredSubscriptions(subs, '2026-10-23');
  assert.strictEqual(expiredCount, 1);
  assert.strictEqual(updatedSubscriptions[0].status, 'ativo');
  assert.strictEqual(updatedSubscriptions[1].status, 'vencido');
});

// =========================================================================
// BLOCO 3: Nível 2 - Travamento Pro / Recorrência Mercado Pago
// =========================================================================
console.log('\n📌 Bloco 3: Nível 2 - Travamento Pro / Recorrência Mercado Pago');

test('Bloqueia integração Mercado Pago para barbearias no plano starter', () => {
  const checkStarter = canTenantUseGatewayRecurrence('starter');
  assert.strictEqual(checkStarter.allowed, false);
  assert.strictEqual(checkStarter.message?.includes('Recurso Pro: Automatize cobranças no cartão de crédito via Mercado Pago'), true);
});

test('Permite integração Mercado Pago para barbearias no plano pro ou enterprise', () => {
  assert.strictEqual(canTenantUseGatewayRecurrence('pro').allowed, true);
  assert.strictEqual(canTenantUseGatewayRecurrence('enterprise').allowed, true);
  assert.strictEqual(canTenantUseGatewayRecurrence('Black').allowed, true);
});

// =========================================================================
// BLOCO 4: Nível 3 - Validador de Agendamento e Comanda de Serviço
// =========================================================================
console.log('\n📌 Bloco 4: Nível 3 - Validador de Agendamento e Comanda de Serviço');

const mockPlan: PlanoAssinatura = {
  id: 'plan-corte-bronze',
  barbearia_id: 'tenant-ls',
  nome: 'Clube do Corte Bronze',
  valor_mensal: 69.9,
  limite_cortes_mes: 4,
  permite_barba: false,
  ativo: true,
  servicos_inclusos: ['srv-corte', 'srv-acabamento'],
};

const mockServiceCorte: Service = {
  id: 'srv-corte',
  name: 'Corte Tradicional',
  price: 45.0,
  durationMinutes: 30,
  active: true,
  category: 'cabelo',
  description: 'Corte tradicional com tesoura e máquina',
};

const mockServiceBarba: Service = {
  id: 'srv-barba',
  name: 'Barba Terapia',
  price: 35.0,
  durationMinutes: 30,
  active: true,
  category: 'barba',
  description: 'Tratamento com toalha quente e navalha',
};

test('Aplica 100% de desconto (R$ 0,00) na comanda para serviço incluso dentro da cota', () => {
  const mockCustomer: CustomerProfile = {
    id: 'cust-1',
    tenantId: 'tenant-ls',
    name: 'Lucas Silva',
    phone: '11981234567',
    totalBookings: 5,
    totalSpent: 200,
    createdAt: '2026-01-01',
    plano_assinatura_id: 'plan-corte-bronze',
    status_assinatura: 'ativo',
    data_renovacao: '2026-11-20',
    cortes_utilizados_mes: 2, // 2 de 4 utilizados
  };

  const result = validateServiceForSubscriber({
    customer: mockCustomer,
    plan: mockPlan,
    service: mockServiceCorte,
    currentDate: '2026-10-23',
  });

  assert.strictEqual(result.isCovered, true);
  assert.strictEqual(result.discountPercent, 100);
  assert.strictEqual(result.effectivePrice, 0);
  assert.strictEqual(result.shouldIncrementQuota, true);
});

test('Cobra valor integral se a assinatura estiver vencida', () => {
  const mockCustomerExpired: CustomerProfile = {
    id: 'cust-2',
    tenantId: 'tenant-ls',
    name: 'Marcos Vinicius',
    phone: '11977778888',
    totalBookings: 2,
    totalSpent: 80,
    createdAt: '2026-01-01',
    plano_assinatura_id: 'plan-corte-bronze',
    status_assinatura: 'ativo',
    data_renovacao: '2026-10-10', // Venceu dia 10!
    cortes_utilizados_mes: 1,
  };

  const result = validateServiceForSubscriber({
    customer: mockCustomerExpired,
    plan: mockPlan,
    service: mockServiceCorte,
    currentDate: '2026-10-23',
  });

  assert.strictEqual(result.isCovered, false);
  assert.strictEqual(result.effectivePrice, 45.0);
  assert.strictEqual(result.isExpired, true);
  assert.strictEqual(result.reason?.includes('Assinatura vencida'), true);
});

test('Cobra valor normal se o limite de cortes do ciclo foi atingido', () => {
  const mockCustomerLimitReached: CustomerProfile = {
    id: 'cust-3',
    tenantId: 'tenant-ls',
    name: 'Carlos Alberto',
    phone: '11966665555',
    totalBookings: 10,
    totalSpent: 500,
    createdAt: '2026-01-01',
    plano_assinatura_id: 'plan-corte-bronze',
    status_assinatura: 'ativo',
    data_renovacao: '2026-11-20',
    cortes_utilizados_mes: 4, // 4 de 4 utilizados!
  };

  const result = validateServiceForSubscriber({
    customer: mockCustomerLimitReached,
    plan: mockPlan,
    service: mockServiceCorte,
    currentDate: '2026-10-23',
  });

  assert.strictEqual(result.isCovered, false);
  assert.strictEqual(result.effectivePrice, 45.0);
  assert.strictEqual(result.reason?.includes('Cota mensal esgotada'), true);
});

test('Cobre barba apenas se permite_barba for true no plano', () => {
  const mockCustomer: CustomerProfile = {
    id: 'cust-1',
    tenantId: 'tenant-ls',
    name: 'Lucas Silva',
    phone: '11981234567',
    totalBookings: 5,
    totalSpent: 200,
    createdAt: '2026-01-01',
    plano_assinatura_id: 'plan-corte-bronze',
    status_assinatura: 'ativo',
    data_renovacao: '2026-11-20',
    cortes_utilizados_mes: 1,
  };

  // No plano bronze sem barba:
  const resWithoutBeard = validateServiceForSubscriber({
    customer: mockCustomer,
    plan: mockPlan,
    service: mockServiceBarba,
    currentDate: '2026-10-23',
  });
  assert.strictEqual(resWithoutBeard.isCovered, false);
  assert.strictEqual(resWithoutBeard.effectivePrice, 35.0);

  // No plano VIP com barba liberada:
  const planWithBeard: PlanoAssinatura = {
    ...mockPlan,
    permite_barba: true,
  };
  const resWithBeard = validateServiceForSubscriber({
    customer: mockCustomer,
    plan: planWithBeard,
    service: mockServiceBarba,
    currentDate: '2026-10-23',
  });
  assert.strictEqual(resWithBeard.isCovered, true);
  assert.strictEqual(resWithBeard.effectivePrice, 0);
});

test('Plano com limite 0 permite cortes ilimitados', () => {
  const planUnlimited: PlanoAssinatura = {
    ...mockPlan,
    limite_cortes_mes: 0, // 0 = ilimitado
  };

  const customerManyCuts: CustomerProfile = {
    id: 'cust-vip',
    tenantId: 'tenant-ls',
    name: 'VIP Heavy User',
    phone: '11999999999',
    totalBookings: 20,
    totalSpent: 1000,
    createdAt: '2026-01-01',
    plano_assinatura_id: planUnlimited.id,
    status_assinatura: 'ativo',
    data_renovacao: '2026-11-20',
    cortes_utilizados_mes: 12, // Já fez 12 cortes
  };

  const result = validateServiceForSubscriber({
    customer: customerManyCuts,
    plan: planUnlimited,
    service: mockServiceCorte,
    currentDate: '2026-10-23',
  });

  assert.strictEqual(result.isCovered, true);
  assert.strictEqual(result.effectivePrice, 0);
  assert.strictEqual(result.quotaLimit, 'ilimitado');
});

test('Incrementa cota do mensalista ao concluir atendimento', () => {
  const sub: AssinaturaCliente = {
    id: 'sub-1',
    barbearia_id: 'tenant-ls',
    cliente_id: 'cust-1',
    plano_id: 'p1',
    modalidade: 'manual',
    status: 'ativo',
    data_inicio: '2026-10-01',
    data_vencimento: '2026-10-31',
    cortes_utilizados_mes: 2,
  };

  const updated = incrementSubscriptionUsage(sub);
  assert.strictEqual(updated.cortes_utilizados_mes, 3);
});

// =========================================================================
// BLOCO 5: Regras de Barbeiros (Clube VIP vs Avulso & Capacidade)
// =========================================================================
console.log('\n📌 Bloco 5: Barbeiros no Clube VIP e Modalidades');

const mockCustomerActive: CustomerProfile = {
  id: 'cust-1',
  tenantId: 'tenant-ls',
  name: 'Lucas Silva',
  phone: '11981234567',
  totalBookings: 5,
  totalSpent: 200,
  createdAt: '2026-01-01',
  plano_assinatura_id: 'plan-corte-bronze',
  status_assinatura: 'ativo',
  data_renovacao: '2026-11-20',
  cortes_utilizados_mes: 1,
};

test('Bloqueia 100% OFF quando mensalista agenda com barbeiro que não participa do Clube (acceptsSubscriptionClub: false)', () => {
  const barberExcluido = {
    id: 'b-marcus',
    name: 'Marcus Vinicius',
    nickname: 'Marcus',
    role: 'Barbeiro Tradicional',
    rating: 4.8,
    reviewsCount: 42,
    avatarUrl: '',
    specialties: ['Corte Tradicional'],
    bio: '',
    acceptsSubscriptionClub: false,
    attendanceType: 'ordem_chegada' as const,
  };

  const res = validateServiceForSubscriber({
    customer: mockCustomerActive,
    plan: mockPlan,
    service: mockServiceCorte,
    barber: barberExcluido,
    currentDate: '2026-10-23',
  });

  assert.strictEqual(res.isCovered, false);
  assert.strictEqual(res.effectivePrice, mockServiceCorte.price);
  assert.strictEqual(res.discountPercent, 0);
  assert.strictEqual(res.reason?.includes('atende exclusivamente como serviço avulso'), true);
});

test('Aplica 100% OFF quando mensalista agenda com barbeiro que participa do Clube VIP (acceptsSubscriptionClub: true)', () => {
  const barberIncluso = {
    id: 'b-leonardo',
    name: 'Leonardo Soares',
    nickname: 'Leonardo',
    role: 'Master Barber',
    rating: 5.0,
    reviewsCount: 120,
    avatarUrl: '',
    specialties: ['Corte', 'Barba'],
    bio: '',
    acceptsSubscriptionClub: true,
    attendanceType: 'ambos' as const,
  };

  const res = validateServiceForSubscriber({
    customer: mockCustomerActive,
    plan: mockPlan,
    service: mockServiceCorte,
    barber: barberIncluso,
    currentDate: '2026-10-23',
  });

  assert.strictEqual(res.isCovered, true);
  assert.strictEqual(res.effectivePrice, 0);
  assert.strictEqual(res.discountPercent, 100);
});

test('Bloqueia 100% OFF se o plano de assinatura restringir barbeiros_permitidos e o barbeiro não estiver na lista', () => {
  const planRestrito: PlanoAssinatura = {
    ...mockPlan,
    barbeiros_permitidos: ['b-diego'],
  };

  const barberOutro = {
    id: 'b-leonardo',
    name: 'Leonardo Soares',
    nickname: 'Leonardo',
    role: 'Master Barber',
    rating: 5.0,
    reviewsCount: 120,
    avatarUrl: '',
    specialties: ['Corte'],
    bio: '',
    acceptsSubscriptionClub: true,
  };

  const res = validateServiceForSubscriber({
    customer: mockCustomerActive,
    plan: planRestrito,
    service: mockServiceCorte,
    barber: barberOutro,
    currentDate: '2026-10-23',
  });

  assert.strictEqual(res.isCovered, false);
  assert.strictEqual(res.reason?.includes('não faz parte dos profissionais autorizados'), true);
});

console.log('\n======================================================');
console.log(`🎉 TODOS OS ${passed} TESTES DO CLUBE DE ASSINATURAS PASSARAM!`);
console.log('======================================================\n');
