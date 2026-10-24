/**
 * Subscription Validator & Club Multi-Tenant Business Logic Engine
 * Full-Stack Software Architect & Senior Multi-Tenant Engineer (Naville SaaS)
 *
 * Implementa as regras de negócio dos Níveis 1, 2 e 3 do Clube de Assinaturas:
 * - Nível 1: Gestão Manual (Ativação manual, renovação +30d e expiração automática)
 * - Nível 2: Travamento de Feature & Upgrade (Plano Pro / Gateway Mercado Pago)
 * - Nível 3: Integração no Fluxo de Agendamento e Comanda Balcão (100% OFF e cota)
 */

import {
  PlanoAssinatura,
  AssinaturaCliente,
  CustomerProfile,
  Service,
  TenantConfig,
  Barber,
} from '../types';

/**
 * Adiciona N dias a uma data no formato YYYY-MM-DD
 */
export function addDaysToDate(dateStr: string, days = 30): string {
  const parts = dateStr.split('-');
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtém a data de hoje no formato YYYY-MM-DD (fuso horário local)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * NÍVEL 1: Ativação Manual de Assinatura (disponível para todos os planos SaaS)
 * - Define início hoje e vencimento hoje + 30 dias
 * - Define modalidade 'manual', status 'ativo' e zera cortes utilizados
 */
export function createManualSubscription(params: {
  barbearia_id: string;
  cliente_id: string;
  plano_id: string;
  startDate?: string;
  clientName?: string;
  clientPhone?: string;
  planName?: string;
  planPrice?: number;
}): AssinaturaCliente {
  const startDate = params.startDate || getTodayDateString();
  const dueDate = addDaysToDate(startDate, 30);

  return {
    id: `sub-manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    barbearia_id: params.barbearia_id,
    cliente_id: params.cliente_id,
    plano_id: params.plano_id,
    modalidade: 'manual',
    status: 'ativo',
    data_inicio: startDate,
    data_vencimento: dueDate,
    cortes_utilizados_mes: 0,
    cliente_nome: params.clientName,
    cliente_telefone: params.clientPhone,
    plano_nome: params.planName,
    plano_valor: params.planPrice,
  };
}

/**
 * NÍVEL 1: Verificação de Vencimento
 * Se data_vencimento < hoje, considera a assinatura vencida.
 */
export function isSubscriptionExpired(dueDate: string, referenceDate?: string): boolean {
  const today = referenceDate || getTodayDateString();
  return dueDate < today;
}

/**
 * NÍVEL 1: Renovação Manual (+30 dias)
 * Estende o vencimento por +30 dias a partir de hoje (ou da data atual se ainda não venceu)
 * e zera o contador de cortes utilizados no mês.
 */
export function renewSubscription(
  subscription: AssinaturaCliente,
  days = 30,
  referenceDate?: string
): AssinaturaCliente {
  const today = referenceDate || getTodayDateString();
  // Se ainda estiver válida, adiciona 30 dias a partir da data de vencimento atual;
  // Se já venceu, adiciona 30 dias a partir de hoje.
  const baseDate = subscription.data_vencimento > today ? subscription.data_vencimento : today;
  const newDueDate = addDaysToDate(baseDate, days);

  return {
    ...subscription,
    status: 'ativo',
    data_vencimento: newDueDate,
    cortes_utilizados_mes: 0,
  };
}

/**
 * NÍVEL 1: Rotina em lote para varrer e sincronizar status de assinaturas vencidas
 */
export function syncExpiredSubscriptions(
  subscriptions: AssinaturaCliente[],
  referenceDate?: string
): { updatedSubscriptions: AssinaturaCliente[]; expiredCount: number } {
  const today = referenceDate || getTodayDateString();
  let expiredCount = 0;

  const updatedSubscriptions = subscriptions.map((sub) => {
    if (sub.status === 'ativo' && isSubscriptionExpired(sub.data_vencimento, today)) {
      expiredCount++;
      return {
        ...sub,
        status: 'vencido' as const,
      };
    }
    return sub;
  });

  return { updatedSubscriptions, expiredCount };
}

/**
 * NÍVEL 2: Travamento de Feature & Upgrade (Plano Pro / Recorrência Automática)
 * Verifica se a barbearia tem permissão para usar recorrência automática via Gateway / Mercado Pago.
 * Apenas barbearias no plano 'pro' ou 'enterprise' têm acesso liberado.
 */
export function canTenantUseGatewayRecurrence(
  tenantPlan?: string | null
): { allowed: boolean; message?: string } {
  if (!tenantPlan) {
    return {
      allowed: false,
      message: 'Recurso Pro: Automatize cobranças no cartão de crédito via Mercado Pago.',
    };
  }

  const normalized = tenantPlan.toLowerCase();
  const isProOrEnterprise =
    normalized === 'pro' ||
    normalized === 'enterprise' ||
    normalized === 'executive' ||
    normalized === 'black';

  if (!isProOrEnterprise) {
    return {
      allowed: false,
      message: 'Recurso Pro: Automatize cobranças no cartão de crédito via Mercado Pago.',
    };
  }

  return { allowed: true };
}

/**
 * NÍVEL 3: Validador de Agendamento e Comanda de Serviço
 *
 * Avalia se o cliente possui assinatura ativa e não vencida,
 * e se o serviço solicitado tem cobertura total (100% de desconto) pelo plano.
 */
export interface SubscriptionValidationResult {
  isSubscriber: boolean;
  isActive: boolean;
  isExpired: boolean;
  isCovered: boolean;
  discountPercent: 100 | 0;
  effectivePrice: number;
  reason: string;
  quotaLimit: number | 'ilimitado';
  quotaUsed: number;
  quotaRemaining: number | 'ilimitado';
  shouldIncrementQuota: boolean;
}

export function validateServiceForSubscriber(params: {
  subscription?: AssinaturaCliente | null;
  customer?: CustomerProfile | null;
  plan?: PlanoAssinatura | null;
  service: Service | { id: string; name: string; price: number; category?: string };
  barber?: Barber | null;
  currentDate?: string;
}): SubscriptionValidationResult {
  const { subscription, customer, plan, service, barber } = params;
  const today = params.currentDate || getTodayDateString();

  // 1. Determina status e vencimento tanto pelo objeto de assinatura quanto pelo perfil do cliente
  const effectiveStatus = subscription?.status || (customer?.status_assinatura as string) || 'sem_plano';
  const effectiveDueDate = subscription?.data_vencimento || customer?.data_renovacao || customer?.data_vencimento;
  const cutsUsed = subscription?.cortes_utilizados_mes ?? customer?.cortes_utilizados_mes ?? 0;

  // Sem assinatura registrada
  if (!plan || effectiveStatus === 'sem_plano' || !effectiveDueDate) {
    return {
      isSubscriber: false,
      isActive: false,
      isExpired: false,
      isCovered: false,
      discountPercent: 0,
      effectivePrice: service.price,
      reason: 'Cliente avulso (sem plano ativo do clube)',
      quotaLimit: 'ilimitado',
      quotaUsed: 0,
      quotaRemaining: 'ilimitado',
      shouldIncrementQuota: false,
    };
  }

  // 1.1. Verificação se o barbeiro aceita Clube de Assinaturas (opção de exclusão por profissional)
  if (barber && barber.acceptsSubscriptionClub === false) {
    return {
      isSubscriber: true,
      isActive: true,
      isExpired: false,
      isCovered: false,
      discountPercent: 0,
      effectivePrice: service.price,
      reason: `O profissional ${barber.nickname || barber.name} atende exclusivamente como serviço avulso (não participa do Clube VIP)`,
      quotaLimit: plan.limite_cortes_mes === 0 ? 'ilimitado' : plan.limite_cortes_mes,
      quotaUsed: cutsUsed,
      quotaRemaining: plan.limite_cortes_mes === 0 ? 'ilimitado' : Math.max(0, plan.limite_cortes_mes - cutsUsed),
      shouldIncrementQuota: false,
    };
  }

  // 1.2. Verificação se o plano restringe barbeiros permitidos específicos
  if (
    barber &&
    plan.barbeiros_permitidos &&
    plan.barbeiros_permitidos.length > 0 &&
    !plan.barbeiros_permitidos.includes(barber.id)
  ) {
    return {
      isSubscriber: true,
      isActive: true,
      isExpired: false,
      isCovered: false,
      discountPercent: 0,
      effectivePrice: service.price,
      reason: `O profissional ${barber.nickname || barber.name} não faz parte dos profissionais autorizados neste plano`,
      quotaLimit: plan.limite_cortes_mes === 0 ? 'ilimitado' : plan.limite_cortes_mes,
      quotaUsed: cutsUsed,
      quotaRemaining: plan.limite_cortes_mes === 0 ? 'ilimitado' : Math.max(0, plan.limite_cortes_mes - cutsUsed),
      shouldIncrementQuota: false,
    };
  }

  // 2. Verificação de status e vencimento da assinatura
  const isExpired = isSubscriptionExpired(effectiveDueDate, today) || effectiveStatus === 'vencido' || effectiveStatus === 'atrasado';
  const isCancelled = effectiveStatus === 'cancelado';

  if (isCancelled) {
    return {
      isSubscriber: true,
      isActive: false,
      isExpired: false,
      isCovered: false,
      discountPercent: 0,
      effectivePrice: service.price,
      reason: 'Plano do cliente cancelado',
      quotaLimit: plan.limite_cortes_mes === 0 ? 'ilimitado' : plan.limite_cortes_mes,
      quotaUsed: cutsUsed,
      quotaRemaining: 0,
      shouldIncrementQuota: false,
    };
  }

  if (isExpired) {
    return {
      isSubscriber: true,
      isActive: false,
      isExpired: true,
      isCovered: false,
      discountPercent: 0,
      effectivePrice: service.price,
      reason: `Assinatura vencida em ${effectiveDueDate} — regularize ou renove +30 dias`,
      quotaLimit: plan.limite_cortes_mes === 0 ? 'ilimitado' : plan.limite_cortes_mes,
      quotaUsed: cutsUsed,
      quotaRemaining: 0,
      shouldIncrementQuota: false,
    };
  }

  // 3. Verificação de cobertura do serviço
  const serviceNameLower = service.name.toLowerCase();
  const isBeardService = serviceNameLower.includes('barba');
  const isHairService =
    serviceNameLower.includes('corte') ||
    serviceNameLower.includes('cabelo') ||
    serviceNameLower.includes('pezinho') ||
    serviceNameLower.includes('acabamento');

  // Cobertura explícita por ID de serviço no plano
  let hasServiceCoverage = false;
  if (plan.servicos_inclusos && Array.isArray(plan.servicos_inclusos)) {
    hasServiceCoverage = plan.servicos_inclusos.includes(service.id);
  }

  // Se o plano permite barba explicitamente e o serviço é de barba
  if (!hasServiceCoverage && isBeardService && plan.permite_barba) {
    hasServiceCoverage = true;
  }

  // Se o plano cobre corte e o serviço é corte padrão
  if (!hasServiceCoverage && isHairService && (!plan.servicos_inclusos || plan.servicos_inclusos.length === 0)) {
    hasServiceCoverage = true;
  }

  if (!hasServiceCoverage) {
    return {
      isSubscriber: true,
      isActive: true,
      isExpired: false,
      isCovered: false,
      discountPercent: 0,
      effectivePrice: service.price,
      reason: `Serviço "${service.name}" não está incluso na cobertura do plano ${plan.nome}`,
      quotaLimit: plan.limite_cortes_mes === 0 ? 'ilimitado' : plan.limite_cortes_mes,
      quotaUsed: cutsUsed,
      quotaRemaining: plan.limite_cortes_mes === 0 ? 'ilimitado' : Math.max(0, plan.limite_cortes_mes - cutsUsed),
      shouldIncrementQuota: false,
    };
  }

  // 4. Verificação de limite / cota mensal de cortes (0 = ilimitado)
  const isUnlimited = plan.limite_cortes_mes === 0 || plan.limite_cortes_mes === null || plan.limite_cortes_mes === undefined;
  const quotaLimit = isUnlimited ? 'ilimitado' : plan.limite_cortes_mes;
  const quotaRemaining = isUnlimited ? 'ilimitado' : Math.max(0, plan.limite_cortes_mes - cutsUsed);

  if (!isUnlimited && cutsUsed >= plan.limite_cortes_mes) {
    return {
      isSubscriber: true,
      isActive: true,
      isExpired: false,
      isCovered: false,
      discountPercent: 0,
      effectivePrice: service.price,
      reason: `Cota mensal esgotada (${cutsUsed}/${plan.limite_cortes_mes} cortes já utilizados neste ciclo)`,
      quotaLimit,
      quotaUsed: cutsUsed,
      quotaRemaining: 0,
      shouldIncrementQuota: false,
    };
  }

  // 5. Cobertura Aprovada com 100% de desconto!
  return {
    isSubscriber: true,
    isActive: true,
    isExpired: false,
    isCovered: true,
    discountPercent: 100,
    effectivePrice: 0,
    reason: `Benefício VIP: Coberto 100% pelo ${plan.nome}`,
    quotaLimit,
    quotaUsed: cutsUsed,
    quotaRemaining: isUnlimited ? 'ilimitado' : Math.max(0, plan.limite_cortes_mes - cutsUsed - 1),
    shouldIncrementQuota: true,
  };
}

/**
 * Incrementa a contagem de cortes consumidos pelo mensalista
 */
export function incrementSubscriptionUsage(
  subscription: AssinaturaCliente
): AssinaturaCliente {
  return {
    ...subscription,
    cortes_utilizados_mes: (subscription.cortes_utilizados_mes || 0) + 1,
  };
}
