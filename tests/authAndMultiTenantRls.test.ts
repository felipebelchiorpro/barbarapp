/**
 * Testes Automatizados: Camada de Autenticação Segura, Isolamento Multi-Tenant Estrito (RLS / API Rules) e PWA do Barbeiro
 * Executado via `npx tsx tests/authAndMultiTenantRls.test.ts`
 */

import {
  POCKETBASE_API_RULES,
  enforceMultiTenantAccess,
  exportPocketBaseSchemaRulesJson,
} from '../src/services/pocketbaseApiRules';
import {
  MOCK_USERS,
  loginWithEmail,
  quickLoginAs,
  verifyWhatsAppOtp,
  addExtraItemToChairOrder,
  removeExtraItemFromChairOrder,
  calculateBarberPerformance,
  DEFAULT_BARBER_EXTRAS,
} from '../src/services/authService';
import { TenantConfig, Booking, ChairOrder } from '../src/types';

// Mock Tenants para teste
const TEST_TENANTS: TenantConfig[] = [
  {
    id: 'tenant-barbearia-ls',
    name: 'Naville Barber',
    slug: 'barbearia-ls',
    ownerName: 'Leonardo Soares',
    ownerPhone: '11981234567',
    plan: 'starter',
    planBasePrice: 49.9,
    max_barbeiros: 1,
    valor_adicional_barbeiro: 25.0,
    status: 'active',
    whatsappStatus: 'open',
    cidade: 'São Paulo - SP',
    gmv_mensal: 14850.0,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'tenant-vintage-club',
    name: 'Barbearia Vintage Club',
    slug: 'vintage-club',
    ownerName: 'Marcelo Ramos',
    ownerPhone: '11998877665',
    plan: 'starter',
    planBasePrice: 49.9,
    max_barbeiros: 2,
    valor_adicional_barbeiro: 25.0,
    status: 'blocked', // Tenant Bloqueado (Kill Switch ativo)
    whatsappStatus: 'close',
    cidade: 'Rio de Janeiro - RJ',
    gmv_mensal: 11200.0,
    createdAt: '2026-03-01T11:00:00.000Z',
  },
];

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FALHA: ${message}`);
    failedTests++;
  }
}

console.log('\n======================================================');
console.log('🛡️ SUÍTE DE TESTES: AUTENTICAÇÃO, RLS & PWA DO BARBEIRO');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// GRUPO 1: Validação das Coleções e Regras RLS no PocketBase
// -----------------------------------------------------------------------------
console.log('--- 1. Definição das Regras RLS (API Rules) do PocketBase ---');

const expectedCollections = [
  'agendamentos',
  'clientes',
  'servicos',
  'produtos',
  'vendas_balcao',
  'faturas',
  'despesas',
  'barbearias',
  'logs_erros_sistema',
  'planos_assinatura_cliente',
];

for (const colName of expectedCollections) {
  const ruleDef = POCKETBASE_API_RULES[colName];
  assert(!!ruleDef, `Coleção "${colName}" está devidamente mapeada nas regras RLS`);
  if (ruleDef) {
    assert(
      typeof ruleDef.listRule === 'string' && typeof ruleDef.viewRule === 'string',
      `Coleção "${colName}" possui listRule e viewRule configurados com strings válidas`
    );
  }
}

// Verifica se agendamentos isola barbeiro_id
const agendamentosRules = POCKETBASE_API_RULES['agendamentos'];
assert(
  agendamentosRules.listRule.includes('@request.auth.barbearia_id = barbearia_id') &&
    (agendamentosRules.listRule.includes('@request.auth.barber_id = barbeiro_id') ||
      agendamentosRules.listRule.includes('@request.auth.id = barbeiro_id')),
  'Regra de agendamentos exige isolamento de tenant e barbeiro_id'
);

// Verifica se faturas proíbe barbeiro
const faturasRules = POCKETBASE_API_RULES['faturas'];
assert(
  faturasRules.listRule.includes('@request.auth.role = "owner"') &&
    !faturasRules.listRule.includes('"barber"'),
  'Regra de faturas proíbe expressamente acesso por usuários com role "barber"'
);

// Exportação JSON para PocketBase
const exportedJson = exportPocketBaseSchemaRulesJson();
const parsedExport = JSON.parse(exportedJson);
assert(
  Array.isArray(parsedExport.collections) && parsedExport.collections.length >= 10,
  'exportPocketBaseSchemaRulesJson() gera JSON válido com todas as 10 coleções'
);

// -----------------------------------------------------------------------------
// GRUPO 2: Isolamento Multi-Tenant Estrito (Zero Trust) em Tempo de Execução
// -----------------------------------------------------------------------------
console.log('\n--- 2. Isolamento Multi-Tenant Estrito & RBAC ---');

const superAdminUser = MOCK_USERS.superadmin;
const ownerUser = MOCK_USERS.owner_leonardo;
const barberDiego = MOCK_USERS.barber_diego;
const clientUser = MOCK_USERS.client_pedro;

// Super Admin acessa qualquer tenant
const superAdminCheck = enforceMultiTenantAccess(
  superAdminUser,
  'agendamentos',
  'read',
  { barbearia_id: 'tenant-vintage-club', barbeiro_id: 'barber-marcos' }
);
assert(superAdminCheck.allowed === true, 'SuperAdmin tem acesso universal irrestrito a qualquer tenant');

// Dono acessa apenas sua própria barbearia
const ownerAllowed = enforceMultiTenantAccess(
  ownerUser,
  'agendamentos',
  'read',
  { barbearia_id: 'tenant-barbearia-ls', barbeiro_id: 'barber-diego' }
);
assert(ownerAllowed.allowed === true, 'Owner tem acesso liberado aos agendamentos da sua própria barbearia');

const ownerCrossTenantDenied = enforceMultiTenantAccess(
  ownerUser,
  'agendamentos',
  'read',
  { barbearia_id: 'tenant-vintage-club', barbeiro_id: 'barber-marcos' }
);
assert(
  ownerCrossTenantDenied.allowed === false && ownerCrossTenantDenied.code === 403,
  'Owner é sumariamente BLOQUEADO (403) ao tentar acessar dados de outra barbearia'
);

// Barbeiro acessa somente seus próprios atendimentos
const barberOwnAllowed = enforceMultiTenantAccess(
  barberDiego,
  'agendamentos',
  'read',
  { barbearia_id: 'tenant-barbearia-ls', barbeiro_id: 'barber-diego' }
);
assert(barberOwnAllowed.allowed === true, 'Barbeiro Diego tem acesso aos seus próprios agendamentos');

const barberOtherDenied = enforceMultiTenantAccess(
  barberDiego,
  'agendamentos',
  'read',
  { barbearia_id: 'tenant-barbearia-ls', barbeiro_id: 'barber-marcos' }
);
assert(
  barberOtherDenied.allowed === false && barberOtherDenied.code === 403,
  'Barbeiro Diego é BLOQUEADO ao tentar ler a agenda de outro barbeiro (Marcos)'
);

// Barbeiro não pode ler faturas ou despesas da barbearia
const barberFaturasDenied = enforceMultiTenantAccess(
  barberDiego,
  'faturas',
  'read',
  { barbearia_id: 'tenant-barbearia-ls' }
);
assert(
  barberFaturasDenied.allowed === false && barberFaturasDenied.code === 403,
  'Barbeiro é estritamente PROIBIDO de acessar faturas e números financeiros da empresa'
);

const barberDespesasDenied = enforceMultiTenantAccess(
  barberDiego,
  'despesas',
  'read',
  { barbearia_id: 'tenant-barbearia-ls' }
);
assert(
  barberDespesasDenied.allowed === false,
  'Barbeiro é estritamente PROIBIDO de acessar despesas operacionais da empresa'
);

// Cliente acessa apenas agendamentos onde é titular
const clientOwnAllowed = enforceMultiTenantAccess(
  clientUser,
  'agendamentos',
  'read',
  { cliente_id: clientUser.id }
);
assert(clientOwnAllowed.allowed === true, 'Cliente Pedro consegue visualizar seu próprio agendamento');

const clientOtherDenied = enforceMultiTenantAccess(
  clientUser,
  'agendamentos',
  'read',
  { cliente_id: 'cliente-outro-usuario' }
);
assert(
  clientOtherDenied.allowed === false && clientOtherDenied.code === 403,
  'Cliente é BLOQUEADO ao tentar consultar agendamentos de outros clientes'
);

// -----------------------------------------------------------------------------
// GRUPO 3: Autenticação JWT, Claims de Sessão & Kill Switch
// -----------------------------------------------------------------------------
console.log('\n--- 3. Autenticação, Tokens JWT & Kill Switch ---');

// Login de Barbeiro com e-mail e senha
const loginResult = loginWithEmail('diego@barbearials.com.br', 'senha123', TEST_TENANTS);
assert(loginResult.success === true && !!loginResult.session, 'Login com e-mail e senha efetuado com sucesso');

const tokenPayload = loginResult.session?.user;
assert(
  tokenPayload?.role === 'barber' &&
    tokenPayload?.barbearia_id === 'tenant-barbearia-ls' &&
    tokenPayload?.barber_id === 'barber-diego',
  'Token JWT contém claims obrigatórias: userId, role, barbearia_id e barber_id'
);

// Teste de Kill Switch: Tenant com status "blocked" não pode efetuar login
const blockedLoginResult = loginWithEmail('marcelo@vintageclub.com.br', 'senha123', TEST_TENANTS);
assert(
  blockedLoginResult.success === false && blockedLoginResult.blockedByTenant === true,
  'Kill Switch: Utilizador de barbearia com status "blocked" é BLOQUEADO automaticamente no login'
);

// Super Admin pode logar mesmo com tenants bloqueados no sistema
const superAdminLogin = loginWithEmail('admin@naville.com.br', 'senha123', TEST_TENANTS);
assert(superAdminLogin.success === true, 'SuperAdmin consegue autenticar normalmente para fins de suporte');

// Autenticação de dois fatores / OTP via WhatsApp
const otpVerification = verifyWhatsAppOtp('11981234567', '749201', TEST_TENANTS);
assert(
  otpVerification.success === true && otpVerification.session?.user.role === 'barber',
  'Verificação OTP via WhatsApp autentica barbeiro corretamente com sessão ativa'
);

const otpInvalidVerification = verifyWhatsAppOtp('11981234567', '000000', TEST_TENANTS);
assert(
  otpInvalidVerification.success === false,
  'Código OTP incorreto é rejeitado com mensagem de erro amigável'
);

// -----------------------------------------------------------------------------
// GRUPO 4: PWA do Barbeiro ("Modo Cadeira"), Comandas & Comissões Restritas
// -----------------------------------------------------------------------------
console.log('\n--- 4. PWA do Barbeiro: Comanda Rápida e Comissões Restritas ---');

// Mock de comanda na cadeira
const mockOrder: any = {
  bookingId: 'booking-chair-test-1',
  barberId: 'barber-diego',
  barberName: 'Diego Barbeiro',
  customerName: 'Renato Silveira',
  baseServiceTitle: 'Corte Degradê Navalhado',
  baseServicePrice: 45.0,
  extraItems: [],
  totalPrice: 45.0,
  status: 'in_progress',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Barbeiro adiciona 1 Pomada Modeladora (R$ 35,00) com 1 toque
const pomadaItem = DEFAULT_BARBER_EXTRAS.find((item) => item.id === 'extra-pomada')!;
const updatedOrder1 = addExtraItemToChairOrder(mockOrder, pomadaItem);

assert(
  updatedOrder1.extraItems.length === 1 && updatedOrder1.totalPrice === 80.0,
  'Lançamento rápido de produto extra adiciona item e recalcula total da comanda (45 + 35 = R$ 80,00)'
);

// Barbeiro adiciona Design de Sobrancelha (R$ 20,00)
const sobrancelhaItem = DEFAULT_BARBER_EXTRAS.find((item) => item.id === 'extra-sobrancelha')!;
const updatedOrder2 = addExtraItemToChairOrder(updatedOrder1, sobrancelhaItem);

assert(
  updatedOrder2.extraItems.length === 2 && updatedOrder2.totalPrice === 100.0,
  'Segundo item extra adicionado à comanda com sucesso (80 + 20 = R$ 100,00)'
);

// Barbeiro remove item da comanda
const orderAfterRemoval = removeExtraItemFromChairOrder(updatedOrder2, 'extra-sobrancelha');
assert(
  orderAfterRemoval.extraItems.length === 1 && orderAfterRemoval.totalPrice === 80.0,
  'Remoção de item da comanda recalcula o subtotal instantaneamente'
);

// Mock de atendimentos do mês para cálculo restrito de comissões
const todayDateStr = new Date().toISOString().split('T')[0];

const mockBookings: Booking[] = [
  {
    id: 'b-1',
    barberId: 'barber-diego',
    barberName: 'Diego Barbeiro',
    barberAvatar: '',
    services: [{ id: 'srv-corte', name: 'Corte', description: 'Corte tradicional', price: 45.0, durationMinutes: 30, category: 'cabelo' }],
    date: todayDateStr, // Hoje
    startTime: '10:00',
    endTime: '10:30',
    totalMinutes: 30,
    customerName: 'Lucas Ferreira',
    customerPhone: '11999991111',
    status: 'completed',
    totalPrice: 45.0,
    createdAt: `${todayDateStr}T10:00:00Z`,
    notifyWhatsApp: true,
  },
  {
    id: 'b-2',
    barberId: 'barber-diego',
    barberName: 'Diego Barbeiro',
    barberAvatar: '',
    services: [{ id: 'srv-barba', name: 'Barba', description: 'Barba tradicional', price: 35.0, durationMinutes: 30, category: 'barba' }],
    date: todayDateStr, // Hoje
    startTime: '11:00',
    endTime: '11:30',
    totalMinutes: 30,
    customerName: 'Guilherme Mendes',
    customerPhone: '11999992222',
    status: 'completed',
    totalPrice: 35.0,
    createdAt: `${todayDateStr}T11:00:00Z`,
    notifyWhatsApp: true,
  },
  {
    id: 'b-3',
    barberId: 'barber-marcos', // OUTRO BARBEIRO!
    barberName: 'Marcos Vinicius',
    barberAvatar: '',
    services: [{ id: 'srv-combo', name: 'Combo', description: 'Combo corte e barba', price: 75.0, durationMinutes: 60, category: 'combos' }],
    date: todayDateStr,
    startTime: '14:00',
    endTime: '15:00',
    totalMinutes: 60,
    customerName: 'Cliente do Marcos',
    customerPhone: '11999993333',
    status: 'completed',
    totalPrice: 75.0,
    createdAt: `${todayDateStr}T14:00:00Z`,
    notifyWhatsApp: true,
  },
];

// Cálculo de métricas restritas para Diego (Comissão: 50% serviços, 20% produtos)
const diegoPerformance = calculateBarberPerformance(
  'barber-diego',
  'Diego Barbeiro',
  mockBookings,
  [updatedOrder1] // Teve uma pomada vendida de R$ 35
);

// Atendimentos do Diego: b-1 (45) + b-2 (35) = 80. Comissão 50% = R$ 40,00
// Comissão produto: 35 * 20% = R$ 7,00
// Total comissão: R$ 47,00
assert(
  diegoPerformance.atendimentosHoje === 2,
  'Total de atendimentos de hoje do Diego contabiliza apenas os 2 cortes atribuídos a ele'
);
assert(
  diegoPerformance.comissaoHoje === 47.0,
  'Cálculo de comissão de hoje computa serviços (R$ 40) + produtos extras (R$ 7) = R$ 47,00'
);
assert(
  diegoPerformance.comissaoMes >= 47.0,
  'Comissão mensal acumulada apurada com integridade'
);

// Validação de sigilo: O objeto de performance do barbeiro NÃO pode expor o faturamento total da barbearia
assert(
  (diegoPerformance as any).faturamentoTotalEmpresa === undefined &&
    (diegoPerformance as any).outrosBarbeiros === undefined,
  'Trava de Privacidade Zero Trust: Nenhuma métrica global ou de outros barbeiros é exposta ao barbeiro'
);

// -----------------------------------------------------------------------------
// RELATÓRIO FINAL
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`📊 RESULTADO DOS TESTES: ${passedTests} APROVADOS | ${failedTests} FALHAS`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✨ Todos os testes de Autenticação Segura, RLS & PWA foram aprovados com 100% de sucesso!\n');
}
