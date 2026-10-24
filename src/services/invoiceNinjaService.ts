import {
  Invoice,
  InvoiceNinjaConfig,
  InvoiceNinjaWebhookEvent,
  InvoiceNinjaWebhookLog,
  InvoiceStatus,
  SubscriptionPlan,
  TenantConfig,
} from '../types';

/**
 * Payments & Billing Service (Invoice Ninja Integration & Webhooks)
 * Architecture aligned with agency-payments-billing-engineer:
 * - Idempotent event processing
 * - Safe state machine transitions
 * - Durable audit logging of webhook deliveries
 * - Automated Kill Switch triggering on past-due/payment events
 */

/**
 * Calculate total monthly cost for a tenant based on plan and seats
 */
export function calculateTenantMonthlyTotal(
  tenant: TenantConfig,
  plans: SubscriptionPlan[]
): {
  basePrice: number;
  includedSeats: number;
  extraSeats: number;
  extraSeatPrice: number;
  extraSeatsCost: number;
  totalMonthly: number;
  planName: string;
} {
  const plan = plans.find((p) => p.id === tenant.plan) || plans[0];
  const basePrice = tenant.planBasePrice ?? plan.basePrice;
  const includedSeats = plan.includedSeats;
  const extraSeats = Math.max(0, (tenant.max_barbeiros || 1) - includedSeats);
  const extraSeatPrice = tenant.valor_adicional_barbeiro || plan.extraSeatPrice || 25.0;
  const extraSeatsCost = extraSeats * extraSeatPrice;
  const totalMonthly = basePrice + extraSeatsCost;

  return {
    basePrice,
    includedSeats,
    extraSeats,
    extraSeatPrice,
    extraSeatsCost,
    totalMonthly,
    planName: plan.name,
  };
}

/**
 * Generate a simulated PIX Copy-and-Paste string adhering to BR Code specifications
 */
export function generatePixCopyPaste(invoice: Invoice): string {
  const formattedAmount = invoice.amount.toFixed(2);
  const cleanId = invoice.invoiceNumber.replace(/[^A-Za-z0-9]/g, '');
  return `00020126580014br.gov.bcb.pix0136f8e71c6d-92a4-4a25-b04f-123456789abc520400005303986540${formattedAmount.length < 10 ? '0' + formattedAmount.length : formattedAmount.length}${formattedAmount}5802BR5915NAVILLE_SAAS_BR6009SAO_PAULO62070503${cleanId}6304`;
}

/**
 * Validação de segurança do cabeçalho do webhook (X-Api-Secret, X-Ninja-Token ou Authorization Bearer)
 */
export function validateInvoiceNinjaWebhookSecret(
  providedSecret: string | undefined | null,
  expectedSecret: string
): boolean {
  if (!expectedSecret || expectedSecret.trim() === '') return true;
  if (!providedSecret) return false;

  const cleanProvided = providedSecret.replace(/^Bearer\s+/i, '').trim();
  const cleanExpected = expectedSecret.trim();
  return cleanProvided === cleanExpected;
}

/**
 * Calcula a data de renovação com base no ciclo de subscrição
 */
export function calculateNextRenewalDate(
  cycle: 'mensal' | 'semestral' | 'anual' = 'mensal',
  fromDate?: Date | string
): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  if (isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + 1);
    return fallback.toISOString().split('T')[0];
  }

  if (cycle === 'semestral') {
    base.setMonth(base.getMonth() + 6);
  } else if (cycle === 'anual') {
    base.setFullYear(base.getFullYear() + 1);
  } else {
    // mensal (padrão)
    base.setMonth(base.getMonth() + 1);
  }
  return base.toISOString().split('T')[0];
}

/**
 * Mensagem formatada de confirmação de pagamento para WhatsApp (Evolution API)
 */
export function createPaymentConfirmationWhatsAppMessage(
  tenant: TenantConfig,
  invoiceNumber: string,
  amount: number,
  nextDueDate: string
): string {
  return (
    `✅ *Pagamento Confirmado — Naville SaaS*\n\n` +
    `Olá, *${tenant.ownerName}*! Recebemos com sucesso o pagamento da fatura da sua barbearia *${tenant.name}*.\n\n` +
    `📄 *Fatura:* ${invoiceNumber}\n` +
    `💰 *Valor Pago:* R$ ${amount.toFixed(2)}\n` +
    `📅 *Próximo Vencimento:* ${nextDueDate}\n` +
    `⚡ *Status do Sistema:* 100% Ativo & Desbloqueado\n\n` +
    `Sua agenda pública e o painel administrativo estão operando normalmente. Boas vendas e excelentes cortes! 💈`
  );
}

export interface WebhookProcessResult {
  log: InvoiceNinjaWebhookLog;
  updatedTenants: TenantConfig[];
  updatedInvoices: Invoice[];
  actionTaken: string;
  isDuplicate: boolean;
  notificationMessage?: string;
}

/**
 * Process an incoming Invoice Ninja webhook idempotently
 */
export function processInvoiceNinjaWebhook(params: {
  eventType: InvoiceNinjaWebhookEvent;
  tenantId?: string;
  clientId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  dueDate?: string;
  tenants: TenantConfig[];
  invoices: Invoice[];
  existingLogs: InvoiceNinjaWebhookLog[];
  config: InvoiceNinjaConfig;
  forcedIdempotencyKey?: string;
}): WebhookProcessResult {
  const {
    eventType,
    tenantId,
    clientId,
    invoiceId,
    invoiceNumber: paramInvoiceNumber,
    amount,
    dueDate: paramDueDate,
    tenants,
    invoices,
    existingLogs,
    config,
    forcedIdempotencyKey,
  } = params;

  // 1. Localizar tenant: por tenantId, clientId (Invoice Ninja) ou via fatura existente
  const targetInvoice = invoices.find(
    (inv) =>
      (invoiceId && (inv.id === invoiceId || inv.ninjaInvoiceId === invoiceId || inv.fatura_id === invoiceId)) ||
      (paramInvoiceNumber && (inv.invoiceNumber === paramInvoiceNumber || inv.fatura_numero === paramInvoiceNumber))
  );

  const matchedTenant = tenants.find(
    (t) =>
      (tenantId && t.id === tenantId) ||
      (clientId && (t.invoice_ninja_client_id === clientId || t.ninjaClientId === clientId)) ||
      (targetInvoice && t.id === targetInvoice.tenantId)
  );

  const resolvedTenantId = matchedTenant?.id || tenantId || 'tenant-desconhecido';
  const tenantName = matchedTenant?.name || 'Barbearia Desconhecida';
  const resolvedInvoiceNumber =
    paramInvoiceNumber ||
    targetInvoice?.invoiceNumber ||
    `INV-${Date.now().toString().slice(-5)}`;
  const finalAmount = amount ?? targetInvoice?.amount ?? (matchedTenant?.planBasePrice || 49.9);

  // 2. Chave de Idempotência Scoped
  const idempotencyKey =
    forcedIdempotencyKey ||
    `ninja-evt-${resolvedTenantId}-${resolvedInvoiceNumber}-${eventType}-${new Date().toISOString().slice(0, 10)}`;

  // Verificar se evento idêntico já foi aplicado
  const isDuplicate = existingLogs.some(
    (log) => log.idempotencyKey === idempotencyKey && log.status === 'applied'
  );

  if (isDuplicate) {
    const dupLog: InvoiceNinjaWebhookLog = {
      id: `wh-ninja-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      eventType,
      tenantId: resolvedTenantId,
      tenantName,
      invoiceNumber: resolvedInvoiceNumber,
      amount: finalAmount,
      idempotencyKey,
      status: 'ignored_duplicate',
      actionTaken: `Ignorado: Evento idempotente duplicado já processado anteriormente (${idempotencyKey}).`,
      payload: {
        event: eventType,
        tenant_id: resolvedTenantId,
        invoice_number: resolvedInvoiceNumber,
        amount: finalAmount,
        note: 'Idempotency guard prevented double state transition',
      },
    };

    return {
      log: dupLog,
      updatedTenants: tenants,
      updatedInvoices: invoices,
      actionTaken: dupLog.actionTaken,
      isDuplicate: true,
    };
  }

  let actionTaken = '';
  let updatedTenants = [...tenants];
  let updatedInvoices = [...invoices];
  let notificationMessage: string | undefined;

  // 3. EVENTO: Fatura Criada ou Enviada (invoice.created / invoice.sent)
  if (eventType === 'invoice.created' || eventType === 'invoice.sent') {
    const invoiceDueDate = paramDueDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Atualiza próximo vencimento do tenant
    updatedTenants = tenants.map((t) => {
      if (t.id === resolvedTenantId) {
        return {
          ...t,
          data_proximo_vencimento: invoiceDueDate,
          nextBillingDate: invoiceDueDate,
        };
      }
      return t;
    });

    // Se fatura não existir na lista, adiciona como pendente
    if (!targetInvoice) {
      const newInvoice: Invoice = {
        id: invoiceId || `inv-${Date.now()}`,
        tenantId: resolvedTenantId,
        tenantName,
        ninjaInvoiceId: invoiceId,
        invoiceNumber: resolvedInvoiceNumber,
        amount: finalAmount,
        status: 'pending',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: invoiceDueDate,
        items: [
          {
            description: `Assinatura ${matchedTenant?.plan ? matchedTenant.plan.toUpperCase() : 'SaaS'} - Ciclo ${matchedTenant?.plano_ciclo || 'mensal'}`,
            quantity: 1,
            unitPrice: finalAmount,
            total: finalAmount,
          },
        ],
        paymentLink: `https://invoicing.naville.app/client/invoice/${resolvedInvoiceNumber}`,
        barbearia_id: resolvedTenantId,
        fatura_id: invoiceId || `inv-${Date.now()}`,
        fatura_numero: resolvedInvoiceNumber,
        valor: finalAmount,
        data_emissao: new Date().toISOString(),
        data_vencimento: invoiceDueDate,
        link_pagamento: `https://invoicing.naville.app/client/invoice/${resolvedInvoiceNumber}`,
      };
      updatedInvoices = [newInvoice, ...invoices];
    }

    actionTaken = `Fatura ${resolvedInvoiceNumber} registrada/enviada para '${tenantName}'. Vencimento em ${invoiceDueDate}.`;
  }

  // 4. EVENTO: Pagamento Efetuado com Sucesso (payment.created ou invoice.paid)
  else if (eventType === 'invoice.paid' || eventType === 'payment.created') {
    const currentCycle = matchedTenant?.plano_ciclo || 'mensal';
    const nextDate = calculateNextRenewalDate(currentCycle);

    // Reativa o tenant, desativa Kill Switch e atualiza ciclo de subscrição
    updatedTenants = tenants.map((t) => {
      if (t.id === resolvedTenantId) {
        return {
          ...t,
          status: 'active',
          status_assinatura: 'ativo',
          data_proximo_vencimento: nextDate,
          nextBillingDate: nextDate,
        };
      }
      return t;
    });

    // Marca a fatura como paga
    const paidTimestamp = new Date().toISOString();
    if (targetInvoice) {
      updatedInvoices = invoices.map((inv) => {
        if (inv.id === targetInvoice.id) {
          return {
            ...inv,
            status: 'paid' as InvoiceStatus,
            paidAt: paidTimestamp,
            pago_em: paidTimestamp,
          };
        }
        return inv;
      });
    }

    // Gerar mensagem de WhatsApp para notificação via Evolution API
    if (matchedTenant) {
      notificationMessage = createPaymentConfirmationWhatsAppMessage(
        matchedTenant,
        resolvedInvoiceNumber,
        finalAmount,
        nextDate
      );
    }

    actionTaken = `Fatura paga confirmada (R$ ${finalAmount.toFixed(2)}). Tenant '${tenantName}' reativado (Kill Switch desativado). Próxima renovação: ${nextDate}.`;
  }

  // 5. EVENTO: Incumprimento / Atraso (invoice.overdue / invoice.past_due / payment_failed)
  else if (
    eventType === 'invoice.overdue' ||
    eventType === 'invoice.past_due' ||
    eventType === 'invoice.payment_failed' ||
    eventType === 'subscription.cancelled'
  ) {
    const shouldAutoBlock = config.autoBlockOnOverdue && (matchedTenant?.bloqueio_automatico !== false);

    if (shouldAutoBlock) {
      updatedTenants = tenants.map((t) => {
        if (t.id === resolvedTenantId) {
          return {
            ...t,
            status: 'blocked',
            status_assinatura: 'em_atraso',
          };
        }
        return t;
      });
      actionTaken = `Inadimplência confirmada (carência excedida). Kill Switch ATIVADO para '${tenantName}'. Acesso público e painel suspensos amigavelmente.`;
    } else {
      updatedTenants = tenants.map((t) => {
        if (t.id === resolvedTenantId) {
          return {
            ...t,
            status_assinatura: 'em_atraso',
          };
        }
        return t;
      });
      actionTaken = `Inadimplência registrada para '${tenantName}'. Assinatura marcada como 'em_atraso' (dentro da tolerância ou bloqueio automático desligado).`;
    }

    // Marca a fatura como vencida
    if (targetInvoice) {
      updatedInvoices = invoices.map((inv) => {
        if (inv.id === targetInvoice.id) {
          return {
            ...inv,
            status: (eventType === 'subscription.cancelled' ? 'cancelled' : 'overdue') as InvoiceStatus,
          };
        }
        return inv;
      });
    }
  }

  // 6. EVENTO: Subscrição Renovada
  else if (eventType === 'subscription.renewed') {
    const nextDate = calculateNextRenewalDate(matchedTenant?.plano_ciclo || 'mensal');
    updatedTenants = tenants.map((t) => {
      if (t.id === resolvedTenantId) {
        return {
          ...t,
          status: 'active',
          status_assinatura: 'ativo',
          data_proximo_vencimento: nextDate,
          nextBillingDate: nextDate,
        };
      }
      return t;
    });
    actionTaken = `Assinatura de '${tenantName}' renovada até ${nextDate}.`;
  }

  // Criar Log de Auditoria
  const newLog: InvoiceNinjaWebhookLog = {
    id: `wh-ninja-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    eventType,
    tenantId: resolvedTenantId,
    tenantName,
    invoiceNumber: resolvedInvoiceNumber,
    amount: finalAmount,
    idempotencyKey,
    status: 'applied',
    actionTaken,
    payload: {
      event: eventType,
      tenant_id: resolvedTenantId,
      tenant_name: tenantName,
      client_id: clientId || matchedTenant?.invoice_ninja_client_id,
      invoice_id: targetInvoice?.id,
      invoice_number: resolvedInvoiceNumber,
      amount: finalAmount,
      currency: 'BRL',
      received_at: new Date().toISOString(),
      source: 'Invoice Ninja Webhook Dispatcher v2',
      notification_sent: !!notificationMessage,
    },
  };

  return {
    log: newLog,
    updatedTenants,
    updatedInvoices,
    actionTaken,
    isDuplicate: false,
    notificationMessage,
  };
}
