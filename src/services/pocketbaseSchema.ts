/**
 * PocketBase Database Architecture & Schema Manager
 * Configurado pelo Database Optimizer & Backend Architect (Agency Agents)
 */

import { pb } from './pocketbase';
import { buildSafeEqualityFilter } from '../utils/pocketbaseFilterHelper';
import {
  TenantConfig,
  CustomerProfile,
  CashTransaction,
  Expense,
  Booking,
  HistoricoFatura,
  Invoice,
  ClientSubscriptionPlan,
  SystemErrorLog,
} from '../types';

/**
 * Definição formal das coleções do PocketBase para o SaaS de Barbearias
 */
export const POCKETBASE_COLLECTIONS = {
  TENANTS: 'tenants',
  BARBEARIAS: 'barbearias',
  HISTORICO_FATURAS: 'historico_faturas',
  CUSTOMERS: 'customers',
  CASH_TRANSACTIONS: 'cash_transactions',
  EXPENSES: 'expenses',
  BOOKINGS: 'bookings',
  SERVICES: 'services',
  BARBERS: 'barbers',
  PLANOS_ASSINATURA_CLIENTE: 'planos_assinatura_cliente',
  LOGS_ERROS_SISTEMA: 'logs_erros_sistema',
};

export interface PocketBaseSyncResult {
  collection: string;
  recordId: string;
  status: 'synced' | 'local_fallback' | 'error';
  timestamp: string;
  error?: string;
}

/**
 * Sincroniza os dados de um Tenant (Barbearia) com o PocketBase
 */
export async function syncTenantToPocketBase(
  tenant: TenantConfig
): Promise<PocketBaseSyncResult> {
  try {
    const data = {
      tenant_id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      owner_name: tenant.ownerName,
      owner_phone: tenant.ownerPhone,
      plan: tenant.plan,
      plan_base_price: tenant.planBasePrice || 49.9,
      custom_discount: tenant.customDiscount || 0,
      partner_note: tenant.partnerNote || '',
      enabled_modules: JSON.stringify(tenant.enabledModules || {}),
      max_barbeiros: tenant.max_barbeiros,
      valor_adicional_barbeiro: tenant.valor_adicional_barbeiro,
      status: tenant.status,
      whatsapp_status: tenant.whatsappStatus,
      // Módulo 3: Campos de Ciclo de Subscrição e Faturação
      invoice_ninja_client_id: tenant.invoice_ninja_client_id || tenant.ninjaClientId || '',
      plano_ciclo: tenant.plano_ciclo || 'mensal',
      status_assinatura: tenant.status_assinatura || (tenant.status === 'blocked' ? 'em_atraso' : tenant.status === 'trial' ? 'periodo_teste' : 'ativo'),
      data_proximo_vencimento: tenant.data_proximo_vencimento || tenant.nextBillingDate || '',
      bloqueio_automatico: tenant.bloqueio_automatico !== undefined ? tenant.bloqueio_automatico : true,
      // Dados Fiscais, PJ/PF, Endereço e Faturamento (NFS-e / Invoice Ninja)
      nome_fantasia: tenant.nome_fantasia || tenant.name,
      razao_social: tenant.razao_social || '',
      tipo_documento: tenant.tipo_documento || 'CNPJ',
      documento: tenant.documento || '',
      inscricao_municipal: tenant.inscricao_municipal || '',
      inscricao_estadual: tenant.inscricao_estadual || '',
      regime_tributario: tenant.regime_tributario || 'Simples Nacional',
      cep: tenant.cep || '',
      logradouro: tenant.logradouro || '',
      numero: tenant.numero || '',
      complemento: tenant.complemento || '',
      bairro: tenant.bairro || '',
      cidade: tenant.cidade || '',
      estado_uf: tenant.estado_uf || '',
      nome_responsavel: tenant.nome_responsavel || tenant.ownerName || '',
      cpf_responsavel: tenant.cpf_responsavel || '',
      email_financeiro: tenant.email_financeiro || '',
      whatsapp_financeiro: tenant.whatsapp_financeiro || tenant.ownerPhone || '',
      plano_contratado: tenant.plano_contratado || tenant.plan || 'pro',
      ciclo_pagamento: tenant.ciclo_pagamento || tenant.plano_ciclo || 'mensal',
      valor_mensalidade_acordado: tenant.valor_mensalidade_acordado ?? tenant.planBasePrice ?? 49.9,
      max_barbeiros_inclusos: tenant.max_barbeiros_inclusos ?? tenant.max_barbeiros ?? 3,
      updated_at: new Date().toISOString(),
    };

    // Tenta atualizar registro existente ou criar novo
    try {
      const existing = await pb
        .collection(POCKETBASE_COLLECTIONS.TENANTS)
        .getFirstListItem(buildSafeEqualityFilter('tenant_id', tenant.id));
      await pb.collection(POCKETBASE_COLLECTIONS.TENANTS).update(existing.id, data);
    } catch {
      await pb.collection(POCKETBASE_COLLECTIONS.TENANTS).create(data);
    }

    return {
      collection: POCKETBASE_COLLECTIONS.TENANTS,
      recordId: tenant.id,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Fallback silencioso para garantir resiliência offline
    return {
      collection: POCKETBASE_COLLECTIONS.TENANTS,
      recordId: tenant.id,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

/**
 * Sincroniza uma Fatura na coleção historico_faturas do PocketBase
 */
export async function syncHistoricoFaturaToPocketBase(
  fatura: HistoricoFatura | Invoice
): Promise<PocketBaseSyncResult> {
  const faturaId = 'fatura_id' in fatura && fatura.fatura_id ? fatura.fatura_id : ('ninjaInvoiceId' in fatura ? fatura.ninjaInvoiceId || fatura.id : fatura.id);
  const barbeariaId = 'barbearia_id' in fatura && fatura.barbearia_id ? fatura.barbearia_id : ('tenantId' in fatura ? fatura.tenantId : '');
  const faturaNumero = 'fatura_numero' in fatura && fatura.fatura_numero ? fatura.fatura_numero : ('invoiceNumber' in fatura ? fatura.invoiceNumber : '');
  const valor = 'valor' in fatura && fatura.valor !== undefined ? fatura.valor : ('amount' in fatura ? fatura.amount : 0);
  const dataEmissao = 'data_emissao' in fatura && fatura.data_emissao ? fatura.data_emissao : ('issueDate' in fatura ? fatura.issueDate : new Date().toISOString());
  const dataVencimento = 'data_vencimento' in fatura && fatura.data_vencimento ? fatura.data_vencimento : ('dueDate' in fatura ? fatura.dueDate : new Date().toISOString());
  const linkPagamento = 'link_pagamento' in fatura && fatura.link_pagamento ? fatura.link_pagamento : ('paymentLink' in fatura ? fatura.paymentLink || '' : '');
  const pagoEm = 'pago_em' in fatura ? fatura.pago_em : ('paidAt' in fatura ? fatura.paidAt || null : null);

  let statusFatura: 'pendente' | 'paga' | 'vencida' | 'cancelada' = 'pendente';
  if (fatura.status === 'paid' || fatura.status === 'paga') statusFatura = 'paga';
  else if (fatura.status === 'overdue' || fatura.status === 'vencida') statusFatura = 'vencida';
  else if (fatura.status === 'cancelled' || fatura.status === 'cancelada') statusFatura = 'cancelada';

  try {
    const data = {
      fatura_id: faturaId,
      barbearia_id: barbeariaId,
      fatura_numero: faturaNumero,
      valor,
      data_emissao: dataEmissao,
      data_vencimento: dataVencimento,
      status: statusFatura,
      link_pagamento: linkPagamento,
      pago_em: pagoEm,
      updated_at: new Date().toISOString(),
    };

    try {
      const existing = await pb
        .collection(POCKETBASE_COLLECTIONS.HISTORICO_FATURAS)
        .getFirstListItem(buildSafeEqualityFilter('fatura_id', faturaId));
      await pb.collection(POCKETBASE_COLLECTIONS.HISTORICO_FATURAS).update(existing.id, data);
    } catch {
      await pb.collection(POCKETBASE_COLLECTIONS.HISTORICO_FATURAS).create(data);
    }

    return {
      collection: POCKETBASE_COLLECTIONS.HISTORICO_FATURAS,
      recordId: faturaId,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      collection: POCKETBASE_COLLECTIONS.HISTORICO_FATURAS,
      recordId: faturaId,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

/**
 * Sincroniza um Cliente (CRM) com o PocketBase
 */
export async function syncCustomerToPocketBase(
  customer: CustomerProfile
): Promise<PocketBaseSyncResult> {
  try {
    const data = {
      customer_id: customer.id,
      tenant_id: customer.tenantId,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes || '',
      total_bookings: customer.totalBookings,
      total_spent: customer.totalSpent,
      total_visitas: customer.total_visitas ?? customer.totalBookings,
      total_gasto: customer.total_gasto ?? customer.totalSpent,
      last_visit_date: customer.lastVisitDate || '',
      ultima_visita: customer.ultima_visita || customer.lastVisitDate || '',
      favorite_barber_name: customer.favoriteBarberName || '',
      // Campos do Clube de Assinaturas
      plano_assinatura_id: customer.plano_assinatura_id || null,
      status_assinatura: customer.status_assinatura || 'sem_plano',
      data_inicio_plano: customer.data_inicio_plano || '',
      data_renovacao: customer.data_renovacao || '',
      forma_cobranca: customer.forma_cobranca || 'pix_mensal',
      cortes_utilizados_mes: customer.cortes_utilizados_mes || 0,
      updated_at: new Date().toISOString(),
    };

    try {
      const existing = await pb
        .collection(POCKETBASE_COLLECTIONS.CUSTOMERS)
        .getFirstListItem(buildSafeEqualityFilter('customer_id', customer.id));
      await pb.collection(POCKETBASE_COLLECTIONS.CUSTOMERS).update(existing.id, data);
    } catch {
      await pb.collection(POCKETBASE_COLLECTIONS.CUSTOMERS).create(data);
    }

    return {
      collection: POCKETBASE_COLLECTIONS.CUSTOMERS,
      recordId: customer.id,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      collection: POCKETBASE_COLLECTIONS.CUSTOMERS,
      recordId: customer.id,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

/**
 * Sincroniza um Plano do Clube de Assinaturas com o PocketBase
 */
export async function syncClientSubscriptionPlanToPocketBase(
  plan: ClientSubscriptionPlan
): Promise<PocketBaseSyncResult> {
  try {
    const data = {
      plan_id: plan.id,
      barbearia_id: plan.barbearia_id,
      nome: plan.nome,
      descricao: plan.descricao,
      preco_mensal: plan.preco_mensal,
      servicos_inclusos: JSON.stringify(plan.servicos_inclusos || []),
      dias_permitidos: JSON.stringify(plan.dias_permitidos || []),
      limite_cortes_mes: plan.limite_cortes_mes,
      ativo: plan.ativo,
      updated_at: new Date().toISOString(),
    };

    try {
      const existing = await pb
        .collection(POCKETBASE_COLLECTIONS.PLANOS_ASSINATURA_CLIENTE)
        .getFirstListItem(buildSafeEqualityFilter('plan_id', plan.id));
      await pb.collection(POCKETBASE_COLLECTIONS.PLANOS_ASSINATURA_CLIENTE).update(existing.id, data);
    } catch {
      await pb.collection(POCKETBASE_COLLECTIONS.PLANOS_ASSINATURA_CLIENTE).create(data);
    }

    return {
      collection: POCKETBASE_COLLECTIONS.PLANOS_ASSINATURA_CLIENTE,
      recordId: plan.id,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      collection: POCKETBASE_COLLECTIONS.PLANOS_ASSINATURA_CLIENTE,
      recordId: plan.id,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

/**
 * Sincroniza uma Transação do PDV / Caixa do Dia com o PocketBase
 */
export async function syncCashTransactionToPocketBase(
  tx: CashTransaction
): Promise<PocketBaseSyncResult> {
  try {
    const data = {
      tx_id: tx.id,
      tenant_id: tx.tenantId,
      barbearia_id: tx.barbearia_id || tx.tenantId,
      cliente_id: tx.cliente_id || tx.customerId || null,
      barbeiro_id: tx.barbeiro_id || tx.barberId || '',
      description: tx.description,
      type: tx.type,
      amount: tx.amount,
      valor_total: tx.valor_total || tx.amount,
      payment_method: tx.paymentMethod,
      forma_pagamento: tx.forma_pagamento || tx.paymentMethod,
      category: tx.category,
      customer_name: tx.customerName || '',
      barber_name: tx.barberName || '',
      servicos: JSON.stringify(tx.servicos || []),
      produtos: JSON.stringify(tx.produtos || []),
      timestamp: tx.timestamp,
      data_hora: tx.data_hora || tx.timestamp,
    };

    await pb.collection(POCKETBASE_COLLECTIONS.CASH_TRANSACTIONS).create(data);

    return {
      collection: POCKETBASE_COLLECTIONS.CASH_TRANSACTIONS,
      recordId: tx.id,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      collection: POCKETBASE_COLLECTIONS.CASH_TRANSACTIONS,
      recordId: tx.id,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

/**
 * Sincroniza uma Despesa com o PocketBase
 */
export async function syncExpenseToPocketBase(
  expense: Expense
): Promise<PocketBaseSyncResult> {
  try {
    const data = {
      expense_id: expense.id,
      tenant_id: expense.tenantId,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      due_date: expense.dueDate,
      paid_at: expense.paidAt || '',
      status: expense.status,
      payment_method: expense.paymentMethod,
      is_recurring: expense.isRecurring,
      supplier: expense.supplier || '',
      notes: expense.notes || '',
    };

    try {
      const existing = await pb
        .collection(POCKETBASE_COLLECTIONS.EXPENSES)
        .getFirstListItem(buildSafeEqualityFilter('expense_id', expense.id));
      await pb.collection(POCKETBASE_COLLECTIONS.EXPENSES).update(existing.id, data);
    } catch {
      await pb.collection(POCKETBASE_COLLECTIONS.EXPENSES).create(data);
    }

    return {
      collection: POCKETBASE_COLLECTIONS.EXPENSES,
      recordId: expense.id,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      collection: POCKETBASE_COLLECTIONS.EXPENSES,
      recordId: expense.id,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

/**
 * Sincroniza um Log de Erro do Sistema na coleção logs_erros_sistema do PocketBase
 * Acesso exclusivo para Super Admin
 */
export async function syncSystemErrorLogToPocketBase(
  errorLog: SystemErrorLog
): Promise<PocketBaseSyncResult> {
  try {
    const data = {
      log_id: errorLog.id,
      barbearia_id: errorLog.barbearia_id || null,
      barbearia_nome: errorLog.barbearia_nome || '',
      nivel: errorLog.nivel,
      modulo: errorLog.modulo,
      mensagem_erro: errorLog.mensagem_erro,
      detalhes_tecnicos: typeof errorLog.detalhes_tecnicos === 'string'
        ? errorLog.detalhes_tecnicos
        : JSON.stringify(errorLog.detalhes_tecnicos || {}),
      usuario_id: errorLog.usuario_id || null,
      resolvido: errorLog.resolvido,
      data_hora: errorLog.data_hora,
      resolvido_em: errorLog.resolvido_em || null,
      resolvido_por: errorLog.resolvido_por || null,
      notas_suporte: errorLog.notas_suporte || '',
    };

    try {
      const existing = await pb
        .collection(POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA)
        .getFirstListItem(buildSafeEqualityFilter('log_id', errorLog.id));
      await pb.collection(POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA).update(existing.id, data);
    } catch {
      await pb.collection(POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA).create(data);
    }

    return {
      collection: POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA,
      recordId: errorLog.id,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Fallback silencioso não-bloqueante
    return {
      collection: POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA,
      recordId: errorLog.id,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

/**
 * Atualiza o status de resolução de um log de erro no PocketBase
 */
export async function updateSystemErrorLogResolutionInPocketBase(
  logId: string,
  resolvido: boolean,
  resolvidoPor?: string,
  resolvidoEm?: string
): Promise<PocketBaseSyncResult> {
  try {
    const data = {
      resolvido,
      resolvido_em: resolvido ? (resolvidoEm || new Date().toISOString()) : null,
      resolvido_por: resolvido ? (resolvidoPor || 'superadmin') : null,
      updated_at: new Date().toISOString(),
    };

    const existing = await pb
      .collection(POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA)
      .getFirstListItem(buildSafeEqualityFilter('log_id', logId));
    await pb.collection(POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA).update(existing.id, data);

    return {
      collection: POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA,
      recordId: logId,
      status: 'synced',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      collection: POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA,
      recordId: logId,
      status: 'local_fallback',
      timestamp: new Date().toISOString(),
      error: String(err),
    };
  }
}

