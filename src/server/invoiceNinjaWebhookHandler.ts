import { IncomingMessage, ServerResponse } from 'http';
import {
  processInvoiceNinjaWebhook,
  validateInvoiceNinjaWebhookSecret,
} from '../services/invoiceNinjaService';
import {
  InvoiceNinjaWebhookEvent,
  TenantConfig,
  Invoice,
  InvoiceNinjaWebhookLog,
  InvoiceNinjaConfig,
} from '../types';
import {
  SERVER_INITIAL_TENANTS,
  SERVER_INITIAL_INVOICES,
  SERVER_INITIAL_LOGS,
  SERVER_DEFAULT_INVOICE_NINJA_CONFIG,
} from './mockServerData';

// Storage in-memory para o backend server com inicialização dos dados
let serverTenants: TenantConfig[] = [...SERVER_INITIAL_TENANTS];
let serverInvoices: Invoice[] = [...SERVER_INITIAL_INVOICES];
let serverLogs: InvoiceNinjaWebhookLog[] = [...SERVER_INITIAL_LOGS];
let serverConfig: InvoiceNinjaConfig = { ...SERVER_DEFAULT_INVOICE_NINJA_CONFIG };

export function getServerState() {
  return {
    tenants: serverTenants,
    invoices: serverInvoices,
    logs: serverLogs,
    config: serverConfig,
  };
}

export function setServerState(updates: {
  tenants?: TenantConfig[];
  invoices?: Invoice[];
  logs?: InvoiceNinjaWebhookLog[];
  config?: InvoiceNinjaConfig;
}) {
  if (updates.tenants) serverTenants = updates.tenants;
  if (updates.invoices) serverInvoices = updates.invoices;
  if (updates.logs) serverLogs = updates.logs;
  if (updates.config) serverConfig = updates.config;
}

/**
 * Core handler para o webhook do Invoice Ninja: POST /api/webhooks/invoice-ninja
 * Compatível com Express, Connect, e middlewares nativos de Node.js / Vite
 */
export async function handleInvoiceNinjaWebhookRequest(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
): Promise<void> {
  // Garantir Content-Type JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        service: 'Naville Invoice Ninja Webhook Gateway',
        status: 'online',
        endpoint: '/api/webhooks/invoice-ninja',
        supportedEvents: [
          'invoice.created',
          'invoice.sent',
          'invoice.paid',
          'payment.created',
          'invoice.overdue',
          'invoice.past_due',
        ],
        security: {
          authHeadersAccepted: [
            'X-Api-Secret',
            'X-Ninja-Token',
            'X-Ninja-Signature',
            'Authorization: Bearer <secret>',
          ],
          secretConfigured: Boolean(serverConfig.webhookSecret),
        },
        stats: {
          tenantsCount: serverTenants.length,
          invoicesCount: serverInvoices.length,
          logsCount: serverLogs.length,
        },
      })
    );
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST or GET.' }));
    return;
  }

  // 1. Validação de Segurança
  const secretHeader =
    (req.headers['x-api-secret'] as string) ||
    (req.headers['x-ninja-token'] as string) ||
    (req.headers['x-ninja-signature'] as string) ||
    (req.headers['authorization'] as string);

  const isValidSecret = validateInvoiceNinjaWebhookSecret(
    secretHeader,
    serverConfig.webhookSecret
  );

  if (!isValidSecret) {
    res.statusCode = 401;
    res.end(
      JSON.stringify({
        error: 'Unauthorized: Webhook secret or signature is invalid or missing.',
        hint: 'Envie o token no cabeçalho X-Api-Secret ou X-Ninja-Token correspondente à chave configurada.',
      })
    );
    return;
  }

  // 2. Leitura do corpo da requisição (Buffer stream se body não estiver pré-processado)
  let bodyData: any = req.body;
  if (!bodyData) {
    try {
      bodyData = await new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
          raw += chunk;
        });
        req.on('end', () => {
          if (!raw) return resolve({});
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error('Invalid JSON payload'));
          }
        });
        req.on('error', (err) => reject(err));
      });
    } catch (err: any) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Bad Request', message: err.message }));
      return;
    }
  }

  // Normalização do payload Invoice Ninja v5
  // Invoice Ninja pode enviar evento como 'event', 'event_type' ou 'notification_type'
  const rawEvent = (bodyData.event || bodyData.event_type || bodyData.notification_type || 'invoice.paid').toLowerCase();
  
  // Normalizar para os tipos suportados
  let eventType: InvoiceNinjaWebhookEvent = 'invoice.paid';
  if (rawEvent.includes('created')) eventType = 'invoice.created';
  else if (rawEvent.includes('sent')) eventType = 'invoice.sent';
  else if (rawEvent.includes('overdue') || rawEvent.includes('past_due')) eventType = 'invoice.overdue';
  else if (rawEvent.includes('cancelled')) eventType = 'subscription.cancelled';
  else if (rawEvent.includes('renewed')) eventType = 'subscription.renewed';
  else if (rawEvent.includes('payment_failed')) eventType = 'invoice.payment_failed';
  else if (rawEvent.includes('payment') || rawEvent.includes('paid')) eventType = 'invoice.paid';

  const tenantId = bodyData.tenant_id || bodyData.custom_value1;
  const clientId = bodyData.client_id || bodyData.customer_id;
  const invoiceId = bodyData.invoice_id || bodyData.id;
  const invoiceNumber = bodyData.invoice_number || bodyData.number;
  const amount = bodyData.amount ? parseFloat(bodyData.amount) : undefined;
  const dueDate = bodyData.due_date;
  const forcedIdempotencyKey = (req.headers['x-ninja-event-id'] as string) || (req.headers['idempotency-key'] as string) || bodyData.idempotency_key;

  // 3. Processamento Idempotente com State Machine
  const result = processInvoiceNinjaWebhook({
    eventType,
    tenantId,
    clientId,
    invoiceId,
    invoiceNumber,
    amount,
    dueDate,
    tenants: serverTenants,
    invoices: serverInvoices,
    existingLogs: serverLogs,
    config: serverConfig,
    forcedIdempotencyKey,
  });

  // Atualizar estado do servidor
  serverTenants = result.updatedTenants;
  serverInvoices = result.updatedInvoices;
  serverLogs = [result.log, ...serverLogs];

  // 4. Retornar resposta HTTP padronizada
  if (result.isDuplicate) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        status: 'ignored_duplicate',
        message: result.actionTaken,
        idempotencyKey: result.log.idempotencyKey,
        logId: result.log.id,
      })
    );
    return;
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      success: true,
      eventType,
      actionTaken: result.actionTaken,
      log: result.log,
      whatsappNotification: result.notificationMessage || null,
      tenant: serverTenants.find((t) => t.id === result.log.tenantId),
    })
  );
}
