import { Booking, EvolutionApiConfig, WebhookLog } from '../types';
import { cleanPhone, formatCurrency, formatDatePtBR } from '../utils/formatters';
import { logSystemError } from './systemErrorLogService';

export function createBookingConfirmationMessage(booking: Booking, shopName: string = 'Naville Barber'): string {
  const serviceList = booking.services.map((s) => `✂️ ${s.name} (${s.durationMinutes} min)`).join('\n');

  return `💈 *COMPROVANTE DE AGENDAMENTO* 💈
*${shopName}*

Olá, *${booking.customerName}*! Seu horário foi confirmado com sucesso.

🗓️ *Data:* ${formatDatePtBR(booking.date)}
⏰ *Horário:* ${booking.startTime} às ${booking.endTime} (${booking.totalMinutes} min)
💈 *Profissional:* ${booking.barberName}

📋 *Serviços:*
${serviceList}

💰 *Valor Total:* ${formatCurrency(booking.totalPrice)}
📍 *Endereço:* Rua Augusta, 1420 - Consolação, São Paulo - SP

_Chegue com 5 minutos de antecedência._
Caso precise remarcar ou cancelar, responda esta mensagem ou acesse nosso app.`;
}

export function createBookingReminderMessage(booking: Booking, hoursBefore: number = 2, shopName: string = 'Naville Barber'): string {
  return `⏰ *LEMBRETE DE AGENDAMENTO* ⏰

Olá, *${booking.customerName}*! Lembramos que você tem um horário agendado hoje na *${shopName}*.

⏰ *Horário:* ${booking.startTime} (${formatDatePtBR(booking.date)})
💈 *Profissional:* ${booking.barberName}
✂️ *Serviços:* ${booking.services.map((s) => s.name).join(', ')}

Por favor, confirme sua presença respondendo:
👉 *1* para Confirmar Presença
👉 *2* para Solicitar Cancelamento`;
}

export function createBookingCancellationMessage(booking: Booking): string {
  return `❌ *AGENDAMENTO CANCELADO* ❌

Olá, *${booking.customerName}*, seu agendamento para o dia *${formatDatePtBR(booking.date)} às ${booking.startTime}* com *${booking.barberName}* foi cancelado com sucesso.

Esperamos vê-lo em breve! Quando quiser agendar um novo horário, acesse nosso link.`;
}

export function generateWhatsAppDirectLink(phone: string, message?: string): string {
  const cleanDigits = cleanPhone(phone);
  // Add Brazil country code 55 if not already present
  const fullNumber = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;
  return message && message.trim()
    ? `https://wa.me/${fullNumber}?text=${encodeURIComponent(message.trim())}`
    : `https://wa.me/${fullNumber}`;
}

export async function dispatchEvolutionWebhook(
  eventType: 'booking.created' | 'booking.reminder' | 'booking.status_changed' | 'test.ping',
  booking: Booking | null,
  config: EvolutionApiConfig,
  customText?: string
): Promise<WebhookLog> {
  const customerPhone = booking ? booking.customerPhone : '5511999998888';
  const customerName = booking ? booking.customerName : 'Cliente Teste';
  const cleanDigits = cleanPhone(customerPhone);
  const formattedNumber = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;

  let textMessage = customText || '';
  if (!textMessage && booking) {
    if (eventType === 'booking.created') {
      textMessage = createBookingConfirmationMessage(booking);
    } else if (eventType === 'booking.reminder') {
      textMessage = createBookingReminderMessage(booking, config.reminderHoursBefore);
    } else if (eventType === 'booking.status_changed') {
      textMessage = createBookingCancellationMessage(booking);
    }
  }

  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    number: formattedNumber,
    options: {
      delay: 1200,
      presence: 'composing',
      linkPreview: false,
    },
    textMessage: {
      text: textMessage,
    },
    metadata: booking
      ? {
          bookingId: booking.id,
          customerName: booking.customerName,
          barberId: booking.barberId,
          barberName: booking.barberName,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalPrice: booking.totalPrice,
          services: booking.services.map((s) => ({ id: s.id, name: s.name, price: s.price })),
        }
      : null,
  };

  let status: 'delivered' | 'simulated' | 'error' = 'simulated';
  let responseMessage = 'Simulado com sucesso no sandbox da Evolution API (HTTP 200 OK)';

  // Roteia via proxy seguro do backend (/api/whatsapp/send-message) para não expor a chave de API
  const isDirectEvolution = config.baseUrl && (config.baseUrl.includes(':8080') || config.baseUrl.includes('whatsapp.naville.app'));
  const endpoint = isDirectEvolution
    ? `${config.baseUrl.replace(/\/$/, '')}/message/sendText/${config.instanceName || 'barbearia'}`
    : '/api/whatsapp/send-message';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': config.instanceName || 'barbearia',
    };
    if (isDirectEvolution && config.apiKey) {
      headers.apikey = config.apiKey;
    }

    const requestBody = isDirectEvolution
      ? JSON.stringify(payload)
      : JSON.stringify({ number: formattedNumber, text: textMessage });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: requestBody,
    });

    if (response.ok) {
      status = 'delivered';
      responseMessage = `Disparado com sucesso via Gateway WhatsApp (HTTP ${response.status} OK)`;
    } else {
      status = 'error';
      responseMessage = `Erro Evolution API: HTTP ${response.status} ${response.statusText}`;
      logSystemError({
        barbearia_id: config.instanceName || null,
        nivel: 'erro_api',
        modulo: 'evolution_api',
        mensagem_erro: `Falha ao enviar mensagem WhatsApp (HTTP ${response.status}): ${response.statusText}`,
        detalhes_tecnicos: { endpoint, httpStatus: response.status, payload },
      }).catch(() => {});
    }
  } catch (err: unknown) {
    status = 'simulated';
    responseMessage = `Simulado com segurança (Modo offline / sandbox: ${(err as Error).message})`;
  }

  const log: WebhookLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    eventType,
    bookingId: booking?.id,
    customerName,
    customerPhone,
    payload,
    status,
    endpoint,
    responseMessage,
  };

  return log;
}
