/**
 * Testes Automatizados de Integridade: Motor de Validação de Slots Contíguos & Alternativas Inteligentes
 * Executado via `npx tsx tests/contiguousSlots.test.ts`
 */

import { checkContiguousSlots, findIntelligentAlternatives, hasIntervalOverlap } from '../src/utils/doubleBooking';
import { Barber, Booking, TimeBlock, Service } from '../src/types';

console.log('🧪 Iniciando Bateria de Testes de Integridade do Motor de Slots Contíguos...\n');

// 1. MOCK DE PROFISSIONAIS
const mockBarbers: Barber[] = [
  {
    id: 'barber-leo',
    name: 'Leonardo Silva',
    nickname: 'Léo',
    role: 'Master Barber',
    specialties: ['Degradê Navalhado', 'Barba Terapia'],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    rating: 4.9,
    reviewsCount: 142,
    bio: 'Master barber com mais de 10 anos de experiência.',
    active: true,
  },
  {
    id: 'barber-marcos',
    name: 'Marcos Oliveira',
    nickname: 'Marcos',
    role: 'Especialista em Barba',
    specialties: ['Barba Alinhada', 'Pigmentação'],
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    rating: 4.8,
    reviewsCount: 98,
    bio: 'Especialista em visagismo e barba lenhador.',
    active: true,
  },
];

// 2. MOCK DE SERVIÇOS
const mockServices: Service[] = [
  {
    id: 'corte-cabelo',
    name: 'Corte Tradicional / Degradê',
    description: 'Corte completo na tesoura ou máquina.',
    price: 45,
    durationMinutes: 30,
    category: 'cabelo',
    active: true,
  },
  {
    id: 'barba-terapia',
    name: 'Barba Terapia com Toalha Quente',
    description: 'Modelagem completa com toalha quente e navalha.',
    price: 35,
    durationMinutes: 30,
    category: 'barba',
    active: true,
  },
];

const testDate = '2026-10-20';

// 3. MOCK DE AGENDAMENTOS PARA O LÉO
// O Léo tem agendamento às 10:00 (30m) e às 11:00 (30m).
// Portanto, o horário das 10:30 às 11:00 tem 30 MINUTOS LIVRES (isolados).
// Um corte simples de 30m pode ser agendado às 10:30.
// Um combo de 60m (Corte + Barba) NÃO PODE ser agendado às 10:30!
const mockBookings: Booking[] = [
  {
    id: 'b-1',
    customerName: 'Carlos Eduardo',
    customerPhone: '11999990001',
    barberId: 'barber-leo',
    barberName: 'Leonardo Silva',
    barberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    notifyWhatsApp: true,
    date: testDate,
    startTime: '10:00',
    endTime: '10:30',
    totalMinutes: 30,
    services: [mockServices[0]],
    totalPrice: 45,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'b-2',
    customerName: 'Rafael Gomes',
    customerPhone: '11999990002',
    barberId: 'barber-leo',
    barberName: 'Leonardo Silva',
    barberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    notifyWhatsApp: true,
    date: testDate,
    startTime: '11:00',
    endTime: '11:30',
    totalMinutes: 30,
    services: [mockServices[0]],
    totalPrice: 45,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  },
];

// O Léo também tem intervalo de almoço das 12:30 às 13:30
const mockBlocks: TimeBlock[] = [
  {
    id: 'block-lunch',
    barberId: 'barber-leo',
    date: testDate,
    startTime: '12:30',
    endTime: '13:30',
    reason: 'Intervalo de Almoço',
    createdAt: new Date().toISOString(),
  },
];

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

// ==========================================
// TESTE 1: Validação de Slot Isolado (30m vs 60m)
// ==========================================
console.log('--- TESTE 1: Detecção de Slot Isolado ---');
const resultCombo60 = checkContiguousSlots(
  'barber-leo',
  testDate,
  60, // Combo de 60 minutos
  mockBarbers,
  mockBookings,
  mockBlocks,
  {
    slotIntervalMinutes: 30,
    bufferMinutes: 0,
    selectedServices: mockServices,
  }
);

const slot1030Combo = resultCombo60.slots.find((s) => s.time === '10:30');
assert(
  slot1030Combo !== undefined && slot1030Combo.available === false,
  'Combo de 60m NÃO deve estar disponível às 10:30 (pois 11:00 já está ocupado)'
);
assert(
  slot1030Combo !== undefined && slot1030Combo.isIsolated === true,
  'Slot das 10:30 deve ser marcado como isIsolated=true (livre por 30m, insuficiente para 60m)'
);
assert(
  slot1030Combo !== undefined && slot1030Combo.freeDurationMinutes === 30,
  'freeDurationMinutes para 10:30 deve ser exatamente 30 minutos'
);

// ==========================================
// TESTE 2: Não quebrar fluxo de 1 serviço (30 min)
// ==========================================
console.log('\n--- TESTE 2: Fluxo Simples de 1 Serviço (30 min) ---');
const resultSingle30 = checkContiguousSlots(
  'barber-leo',
  testDate,
  30, // Serviço individual de 30 minutos
  mockBarbers,
  mockBookings,
  mockBlocks,
  {
    slotIntervalMinutes: 30,
    bufferMinutes: 0,
    selectedServices: [mockServices[0]],
  }
);

const slot1030Single = resultSingle30.slots.find((s) => s.time === '10:30');
assert(
  slot1030Single !== undefined && slot1030Single.available === true,
  'Serviço simples de 30m DEVE estar disponível às 10:30'
);
assert(
  slot1030Single !== undefined && slot1030Single.isIsolated === false,
  'Serviço simples não deve marcar slot como isolado'
);

// ==========================================
// TESTE 3: Bloqueio de Intervalo de Almoço
// ==========================================
console.log('\n--- TESTE 3: Respeito a Bloqueios (Almoço 12:30 - 13:30) ---');
const slot1200Combo = resultCombo60.slots.find((s) => s.time === '12:00');
assert(
  slot1200Combo !== undefined && slot1200Combo.available === false,
  'Combo de 60m às 12:00 deve ser bloqueado porque terminaria às 13:00, invadindo o almoço (12:30)'
);

const slot1230Single = resultSingle30.slots.find((s) => s.time === '12:30');
assert(
  slot1230Single !== undefined && slot1230Single.available === false,
  'Slot das 12:30 deve estar rigorosamente indisponível devido ao bloqueio de almoço'
);

// ==========================================
// TESTE 4: Encerramento do Expediente (20:00)
// ==========================================
console.log('\n--- TESTE 4: Horário de Fechamento da Barbearia ---');
const slot1930Combo = resultCombo60.slots.find((s) => s.time === '19:30');
assert(
  slot1930Combo !== undefined && slot1930Combo.available === false,
  'Combo de 60m às 19:30 deve ser bloqueado porque terminaria às 20:30 (após encerramento)'
);

const slot1930Single = resultSingle30.slots.find((s) => s.time === '19:30');
assert(
  slot1930Single !== undefined && slot1930Single.available === true,
  'Serviço simples de 30m às 19:30 deve ser permitido (termina exatamente às 20:00)'
);

// ==========================================
// TESTE 5: Tempo de Respiro / Buffer (Ex: 10 min)
// ==========================================
console.log('\n--- TESTE 5: Tempo de Respiro entre Cortes (tempo_respiro_entre_cortes) ---');
const resultWithBuffer = checkContiguousSlots(
  'barber-leo',
  testDate,
  30,
  mockBarbers,
  mockBookings,
  mockBlocks,
  {
    slotIntervalMinutes: 30,
    bufferMinutes: 10, // 10 min de respiro
    selectedServices: [mockServices[0]],
  }
);
// At 10:30, 30 min service + 10 min buffer = 40 min needed.
// Rafael starts at 11:00 (only 30 min available from 10:30).
// With 10 min buffer, 10:30 should NOT be available!
const slot1030WithBuffer = resultWithBuffer.slots.find((s) => s.time === '10:30');
assert(
  slot1030WithBuffer !== undefined && slot1030WithBuffer.available === false,
  'Com 10m de respiro, slot de 30m colado ao próximo agendamento (11:00) deve ser bloqueado'
);

// ==========================================
// TESTE 6: Alternativas Inteligentes quando sem Janela Contígua
// ==========================================
console.log('\n--- TESTE 6: Geração de Alternativas Inteligentes ---');
// Criamos um cenário onde o Léo está 100% ocupado ou com slots isolados no dia
const fullLeoBookings: Booking[] = [];
// Preenche todos os slots de 1h do Léo deixando apenas 30m solto às 10:30
const times = ['09:00', '09:30', '10:00', '11:00', '11:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];
times.forEach((t, i) => {
  fullLeoBookings.push({
    id: `full-${i}`,
    customerName: `Cliente ${i}`,
    customerPhone: '11999990000',
    barberId: 'barber-leo',
    barberName: 'Leonardo Silva',
    barberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    notifyWhatsApp: true,
    date: testDate,
    startTime: t,
    endTime: t === '19:00' ? '20:00' : t,
    totalMinutes: 30,
    services: [mockServices[0]],
    totalPrice: 45,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  });
});

const alternativesResult = findIntelligentAlternatives(
  'barber-leo',
  testDate,
  60,
  mockBarbers,
  fullLeoBookings,
  mockBlocks,
  {
    slotIntervalMinutes: 30,
    selectedServices: mockServices,
  }
);

assert(alternativesResult.hasAlternatives === true, 'Deve gerar alternativas inteligentes');
assert(
  alternativesResult.singleServiceOption !== undefined &&
    alternativesResult.singleServiceOption.service.id === 'corte-cabelo',
  'Opção 1: Deve sugerir agendar apenas o serviço principal (Corte Tradicional)'
);
assert(
  alternativesResult.otherBarberOption !== undefined &&
    alternativesResult.otherBarberOption.barber.id === 'barber-marcos',
  'Opção 2: Deve sugerir o outro profissional da casa (Marcos) que tem janela livre hoje'
);
assert(
  alternativesResult.nextAvailableDateOption !== undefined,
  'Opção 3: Deve sugerir a próxima data disponível para ambos'
);

// ==========================================
// TESTE 7: Integridade Matemática de Intervalos
// ==========================================
console.log('\n--- TESTE 7: Integridade de Intervalos (hasIntervalOverlap) ---');
assert(hasIntervalOverlap('10:00', 30, '10:15', 30) === true, 'Sobreposição parcial deve colidir');
assert(hasIntervalOverlap('10:00', 30, '10:30', 30) === false, 'Slots contíguos perfeitos [10:00-10:30] e [10:30-11:00] NÃO colidem');
assert(hasIntervalOverlap('10:00', 60, '10:30', 30) === true, 'Janela de 60m colide com agendamento interno às 10:30');

console.log('\n==========================================');
console.log(`📊 RESULTADO FINAL: ${testsPassed} passaram | ${testsFailed} falharam`);
console.log('==========================================\n');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 Todos os testes de integridade passaram com 100% de sucesso!');
}
