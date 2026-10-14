export interface Service {
  id: string;
  name: string;
  category: 'cabelo' | 'barba' | 'combos' | 'tratamento';
  durationMinutes: number;
  price: number;
  description: string;
  popular?: boolean;
}

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
}

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
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

export interface EvolutionApiConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  autoSendEnabled: boolean;
  reminderHoursBefore: number;
}
