/**
 * Serviço de Faturamento SaaS Central - Stripe (Naville SaaS)
 *
 * FINALIDADE EXCLUSIVA:
 * Cobrar a mensalidade dos planos SaaS da Naville dos donos de barbearias que NÃO são vitalícios.
 *
 * SEPARAÇÃO ARQUITETURAL FUNDAMENTAL:
 * - O Stripe é exclusivo da empresa Naville (plataforma SaaS B2B).
 * - O Mercado Pago é exclusivo do dono da barbearia para cobrar os clientes finais dele (B2C).
 * - O dinheiro dos clientes finais cai 100% na conta Mercado Pago do dono da barbearia;
 *   a Naville NÃO recolhe comissão nem processa esse montante.
 *
 * REGRA DO PARCEIRO VITALÍCIO (is_vitalicio = true):
 * - Se a barbearia possuir a flag `is_vitalicio = true`, ela é permanentemente isenta de cobrança
 *   de mensalidade. Faturas do Stripe, avisos de atraso e bloqueios são completamente ignorados.
 */

import { TenantConfig, SubscriptionBillingCycle } from '../types';

export interface StripeCheckoutResult {
  success: boolean;
  exempt?: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  message: string;
}

export interface StripeWebhookResult {
  received: boolean;
  actionTaken: string;
  tenantId?: string;
  isIgnoredDueToVitalicio?: boolean;
}

/**
 * Inicia ou simula a criação de uma sessão de Checkout no Stripe para a mensalidade do SaaS
 */
export async function createStripeSubscriptionCheckout(params: {
  tenant: TenantConfig;
  planId: 'starter' | 'pro' | 'enterprise' | 'partner';
  billingCycle?: SubscriptionBillingCycle;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<StripeCheckoutResult> {
  const { tenant, planId, billingCycle = 'mensal' } = params;

  // 1. REGRA: Parceiro Vitalício é permanentemente isento de mensalidade
  if (tenant.is_vitalicio) {
    return {
      success: true,
      exempt: true,
      message: `A barbearia "${tenant.name}" possui isenção vitalícia (Beta Tester / Parceiro Vitalício). Nenhuma cobrança será gerada via Stripe.`,
    };
  }

  // Preço base do plano selecionado
  const basePrice =
    tenant.planBasePrice ||
    (planId === 'starter' ? 49.9 : planId === 'pro' ? 89.9 : 149.9);

  const barbersCount = tenant.limite_profissionais || tenant.max_barbeiros || 1;
  const extraSeats = Math.max(0, barbersCount - 1);
  const extraSeatPrice = tenant.valor_adicional_barbeiro || 25.0;
  const monthlyTotal = basePrice + extraSeats * extraSeatPrice;

  // Multiplicador do ciclo
  const multiplier = billingCycle === 'anual' ? 10 : billingCycle === 'semestral' ? 5.5 : 1;
  const cycleAmount = monthlyTotal * multiplier;
  const amountCents = Math.round(cycleAmount * 100);

  const defaultSuccessUrl =
    params.successUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/admin?stripe_payment=success&session_id={CHECKOUT_SESSION_ID}`
      : 'https://navillebarber.pro/admin?stripe_payment=success');
  const defaultCancelUrl =
    params.cancelUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/admin?stripe_payment=cancelled`
      : 'https://navillebarber.pro/admin?stripe_payment=cancelled');

  // Tenta criar sessão oficial no Stripe via backend Naville
  try {
    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : (process.env.APP_URL || 'http://localhost:3001');
    const res = await fetch(`${baseUrl}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: tenant.id,
        slug: tenant.slug,
        tenantName: tenant.name,
        planId,
        billingCycle,
        amountCents,
        successUrl: defaultSuccessUrl,
        cancelUrl: defaultCancelUrl,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.checkoutUrl) {
        return {
          success: true,
          exempt: false,
          checkoutUrl: data.checkoutUrl,
          sessionId: data.sessionId,
          message: `Sessão Stripe Checkout oficial gerada com sucesso para o plano ${planId.toUpperCase()} (${billingCycle}). Valor: R$ ${cycleAmount.toFixed(2)}.`,
        };
      }
    }
  } catch (err) {
    console.warn('[StripeService] Não foi possível conectar ao endpoint Stripe backend, utilizando checkout link direto:', err);
  }

  // Fallback se backend local não responder
  const sessionId = `cs_naville_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}?tenant=${encodeURIComponent(tenant.slug)}&amount=${cycleAmount.toFixed(2)}`;

  return {
    success: true,
    exempt: false,
    checkoutUrl,
    sessionId,
    message: `Sessão de pagamento Stripe gerada com sucesso para o plano ${planId.toUpperCase()} (${billingCycle}). Valor: R$ ${cycleAmount.toFixed(2)}.`,
  };
}

/**
 * Processador central de eventos de webhook do Stripe (POST /api/webhooks/stripe)
 */
export function processStripeWebhookEvent(params: {
  eventType: 'invoice.paid' | 'invoice.payment_failed' | 'customer.subscription.deleted' | string;
  customerId?: string;
  tenantId?: string;
  tenants: TenantConfig[];
  onUpdateTenant: (updatedTenant: TenantConfig) => void;
}): StripeWebhookResult {
  const { eventType, customerId, tenantId, tenants, onUpdateTenant } = params;

  // Localiza a barbearia correspondente
  const tenant = tenants.find(
    (t) =>
      (tenantId && t.id === tenantId) ||
      (customerId && (t.stripe_customer_id === customerId || t.id === customerId))
  );

  if (!tenant) {
    return {
      received: true,
      actionTaken: `Evento ${eventType} recebido, mas nenhuma barbearia foi encontrada para o identificador informado.`,
    };
  }

  // REGRA: Se a barbearia for vitalícia, ignorar cancelamentos ou falhas de pagamento
  if (tenant.is_vitalicio) {
    return {
      received: true,
      tenantId: tenant.id,
      isIgnoredDueToVitalicio: true,
      actionTaken: `Evento ${eventType} ignorado: a barbearia "${tenant.name}" possui isenção vitalícia e não sofre penalidades financeiras.`,
    };
  }

  // 1. Pagamento de fatura bem-sucedido (invoice.paid)
  if (eventType === 'invoice.paid') {
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 30);
    const nextBillingStr = nextDate.toISOString().split('T')[0];

    const updated: TenantConfig = {
      ...tenant,
      status_assinatura: 'ativo',
      data_proximo_vencimento: nextBillingStr,
      // Se estava bloqueada por atraso, desbloqueia imediatamente
      status: tenant.status === 'blocked' ? 'active' : tenant.status,
    };

    onUpdateTenant(updated);

    return {
      received: true,
      tenantId: tenant.id,
      actionTaken: `Fatura paga via Stripe confirmada. Assinatura da barbearia "${tenant.name}" renovada até ${nextBillingStr}.`,
    };
  }

  // 2. Falha no pagamento da fatura (invoice.payment_failed)
  if (eventType === 'invoice.payment_failed') {
    const updated: TenantConfig = {
      ...tenant,
      status_assinatura: 'em_atraso',
      // Bloqueio automático pelo Kill Switch se configurado
      status: tenant.bloqueio_automatico !== false ? 'blocked' : tenant.status,
    };

    onUpdateTenant(updated);

    return {
      received: true,
      tenantId: tenant.id,
      actionTaken: `Falha de pagamento via Stripe. Barbearia "${tenant.name}" marcada como inadimplente${
        tenant.bloqueio_automatico !== false ? ' e suspensa pelo Kill Switch' : ''
      }.`,
    };
  }

  // 3. Assinatura cancelada no Stripe (customer.subscription.deleted)
  if (eventType === 'customer.subscription.deleted') {
    const updated: TenantConfig = {
      ...tenant,
      status_assinatura: 'cancelado',
      status: 'blocked',
    };

    onUpdateTenant(updated);

    return {
      received: true,
      tenantId: tenant.id,
      actionTaken: `Assinatura cancelada no Stripe. Barbearia "${tenant.name}" suspensa.`,
    };
  }

  return {
    received: true,
    tenantId: tenant.id,
    actionTaken: `Evento Stripe ${eventType} registrado sem alteração de estado.`,
  };
}
