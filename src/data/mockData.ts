import { Barber, Booking, EvolutionApiConfig, Service, TimeBlock } from '../types';
import heroImg from '../assets/images/barbearia_ls_hero_dark.jpg';
import barberDiegoImg from '../assets/images/barber_diego_1790281229207.jpg';
import barberMarcusImg from '../assets/images/barber_marcus_1790281241644.jpg';
import barberLucasImg from '../assets/images/barber_lucas_1790281253017.jpg';

export const HERO_IMAGE = heroImg;

export const INITIAL_SERVICES: Service[] = [
  {
    id: 'corte-cabelo',
    name: 'Cabelo',
    category: 'cabelo',
    durationMinutes: 30,
    price: 40.0,
    description: 'Corte completo com lavagem e finalização. Valor único para qualquer preferência.',
    popular: true,
  },
  {
    id: 'barba',
    name: 'Barba',
    category: 'barba',
    durationMinutes: 30,
    price: 35.0,
    description: 'Alinhamento completo da barba com toalha quente, hidratação e acabamento na navalha.',
    popular: true,
  },
  {
    id: 'cabelo-e-barba',
    name: 'Cabelo + Barba',
    category: 'combos',
    durationMinutes: 60,
    price: 70.0,
    description: 'Combo completo de cabelo (30 min) e barba (30 min). Reserva 1 hora na grade do barbeiro.',
    popular: true,
  },
  {
    id: 'pezinho-acabamento',
    name: 'Pezinho / Acabamento',
    category: 'cabelo',
    durationMinutes: 15,
    price: 20.0,
    description: 'Manutenção do contorno do cabelo, costeletas e nuca na navalha.',
  },
  {
    id: 'sobrancelha',
    name: 'Sobrancelha',
    category: 'tratamento',
    durationMinutes: 15,
    price: 15.0,
    description: 'Limpeza e alinhamento simétrico dos fios.',
  },
];

export const INITIAL_BARBERS: Barber[] = [
  {
    id: 'barber-leonardo',
    name: 'Leonardo Soares',
    nickname: 'Leonardo',
    role: 'Barbeiro Profissional',
    rating: 4.98,
    reviewsCount: 384,
    avatarUrl: barberDiegoImg,
    specialties: ['Corte de Cabelo', 'Barba Completa', 'Acabamento', 'Navalha Tradicional'],
    bio: 'Mais de 10 anos de experiência. Especialista em corte masculino, barba alinhada na navalha e acabamento de alta precisão.',
  },
];

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

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b-101',
    customerName: 'Rodrigo Almeida',
    customerPhone: '(11) 98123-4567',
    customerNotes: 'Prefere toalha bem quente.',
    barberId: 'barber-leonardo',
    barberName: 'Leonardo Soares',
    barberAvatar: barberDiegoImg,
    services: [INITIAL_SERVICES[1]], // Barba (30m)
    date: getTodayDateString(),
    startTime: '10:00',
    endTime: '10:30',
    totalMinutes: 30,
    totalPrice: 35.0,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    notifyWhatsApp: true,
    reminderStatus: 'scheduled',
    webhookDispatched: true,
  },
  {
    id: 'b-102',
    customerName: 'Gustavo Mendonça',
    customerPhone: '(11) 97654-3210',
    customerNotes: 'Horário de almoço.',
    barberId: 'barber-leonardo',
    barberName: 'Leonardo Soares',
    barberAvatar: barberDiegoImg,
    services: [INITIAL_SERVICES[0]], // Cabelo (30m)
    date: getTodayDateString(),
    startTime: '11:00',
    endTime: '11:30',
    totalMinutes: 30,
    totalPrice: 40.0,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    notifyWhatsApp: true,
    reminderStatus: 'scheduled',
    webhookDispatched: true,
  },
  {
    id: 'b-103',
    customerName: 'Felipe Belchior',
    customerPhone: '(11) 99345-6789',
    customerNotes: 'Cliente assíduo.',
    barberId: 'barber-leonardo',
    barberName: 'Leonardo Soares',
    barberAvatar: barberDiegoImg,
    services: [INITIAL_SERVICES[2]], // Cabelo + Barba (60 min / 1 hora)
    date: getTodayDateString(),
    startTime: '14:30',
    endTime: '15:30',
    totalMinutes: 60,
    totalPrice: 70.0,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    notifyWhatsApp: true,
    reminderStatus: 'scheduled',
    webhookDispatched: true,
  },
  {
    id: 'b-104',
    customerName: 'Bruno Carvalho',
    customerPhone: '(11) 98777-2211',
    barberId: 'barber-leonardo',
    barberName: 'Leonardo Soares',
    barberAvatar: barberDiegoImg,
    services: [INITIAL_SERVICES[0], INITIAL_SERVICES[3]], // Cabelo (30m) + Pezinho (15m) = 45m
    date: getTodayDateString(),
    startTime: '16:00',
    endTime: '16:45',
    totalMinutes: 45,
    totalPrice: 60.0,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    notifyWhatsApp: true,
    reminderStatus: 'scheduled',
    webhookDispatched: true,
  },
];

export const INITIAL_BLOCKS: TimeBlock[] = [
  {
    id: 'blk-1',
    barberId: 'barber-leonardo',
    date: getTodayDateString(),
    startTime: '12:30',
    endTime: '13:30',
    reason: 'Intervalo de Almoço',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_EVOLUTION_CONFIG: EvolutionApiConfig = {
  baseUrl: 'https://evolution-api.exemplo.com',
  apiKey: 'B6D711FCDE4D4FD59365441E08497CBD',
  instanceName: 'barbearia_ls',
  autoSendEnabled: true,
  reminderHoursBefore: 2,
};
