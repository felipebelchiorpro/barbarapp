/**
 * PocketBase Strict Multi-Tenant API Rules & RLS Specification
 * Criado por Application Security Engineer & Database Optimizer (Agency Agents)
 * 
 * Regra Inviolável de Isolamento Zero Trust:
 * 1. Super Admin: Acesso irrestrito a todas as barbearias (@request.auth.role = "superadmin").
 * 2. Owner (Dono da Barbearia): Acesso estrito e exclusivo aos registros da sua própria barbearia (@request.auth.barbearia_id = barbearia_id).
 * 3. Barber (Profissional): Acesso estrito à sua própria barbearia e somente aos atendimentos atribuídos a ele. Bloqueado de faturas e despesas globais.
 * 4. Client (Cliente): Acesso estrito aos próprios agendamentos (@request.auth.id = cliente_id).
 */

import { AuthUser, PocketBaseCollectionRuleDefinition } from '../types';

/**
 * Matriz formal das API Rules do PocketBase
 */
export const POCKETBASE_API_RULES: Record<string, PocketBaseCollectionRuleDefinition> = {
  bookings: {
    collection: 'agendamentos',
    description: 'Agendamentos de clientes com barbeiros',
    // SuperAdmin pode tudo; Owner/Manager vê tudo da sua barbearia; Barbeiro vê apenas seus agendamentos da barbearia; Cliente vê apenas os seus
    listRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager")) || (@request.auth.role = "barber" && @request.auth.barbearia_id = barbearia_id && @request.auth.barber_id = barbeiro_id) || (@request.auth.role = "client" && @request.auth.id = cliente_id)`,
    viewRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager")) || (@request.auth.role = "barber" && @request.auth.barbearia_id = barbearia_id && @request.auth.barber_id = barbeiro_id) || (@request.auth.role = "client" && @request.auth.id = cliente_id)`,
    createRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager")) || (@request.auth.role = "barber" && @request.auth.barbearia_id = barbearia_id && @request.auth.barber_id = barbeiro_id) || (@request.auth.role = "client") || (@request.auth.id = "" && barbearia_id.status = "active" && barbeiro_id.barbearia_id = barbearia_id && barbeiro_id.ativo = true)`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager")) || (@request.auth.role = "barber" && @request.auth.barbearia_id = barbearia_id && @request.auth.barber_id = barbeiro_id && @request.data.valor_total:isset = false)`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))`,
  },
  customers: {
    collection: 'clientes',
    description: 'Cadastro de clientes da barbearia (LTV, histórico)',
    listRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || @request.auth.role = "barber"))`,
    viewRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || @request.auth.role = "barber")) || (@request.auth.role = "client" && @request.auth.id = id)`,
    createRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || @request.auth.role = "barber")) || (@request.auth.id = "" && barbearia_id.status = "active")`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager")) || (@request.auth.role = "client" && @request.auth.id = id)`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")`,
  },
  services: {
    collection: 'servicos',
    description: 'Serviços e catálogo de preços da barbearia',
    listRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)`,
    viewRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)`,
    createRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")`,
  },
  products: {
    collection: 'produtos',
    description: 'Produtos de revenda e consumo na cadeira (Pomadas, óleos, bebidas)',
    listRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || @request.auth.role = "barber"))`,
    viewRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || @request.auth.role = "barber"))`,
    createRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")`,
  },
  cash_transactions: {
    collection: 'vendas_balcao',
    description: 'Movimentações de fechamento de comanda e PDV',
    listRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager")) || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "barber" && @request.auth.barber_id = barbeiro_id)`,
    viewRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager")) || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "barber" && @request.auth.barber_id = barbeiro_id)`,
    createRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || @request.auth.role = "barber"))`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")`,
  },
  invoices: {
    collection: 'faturas',
    description: 'Faturas e histórico de mensalidades SaaS (Invoice Ninja). Totalmente blindado de barbeiros e gerentes.',
    listRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    viewRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    createRule: `@request.auth.role = "superadmin"`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    deleteRule: `@request.auth.role = "superadmin"`,
  },
  expenses: {
    collection: 'despesas',
    description: 'Despesas e saídas financeiras da barbearia. Barbeiros NÃO possuem acesso.',
    listRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    viewRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    createRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
  },
  barbearias: {
    collection: 'barbearias',
    description: 'Dados cadastrais da barbearia (Configurações, slug, limites)',
    listRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = id || (@request.auth.id = "" && status = "active")`,
    viewRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = id || (@request.auth.id = "" && status = "active")`,
    createRule: `@request.auth.role = "superadmin"`,
    updateRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = id && @request.data.plan:isset = false && @request.data.plan_base_price:isset = false && @request.data.max_barbeiros:isset = false && @request.data.valor_adicional_barbeiro:isset = false && @request.data.status:isset = false && @request.data.status_assinatura:isset = false && @request.data.bloqueio_automatico:isset = false && @request.data.valor_mensalidade_acordado:isset = false && @request.data.max_barbeiros_inclusos:isset = false)`,
    deleteRule: `@request.auth.role = "superadmin"`,
  },
  users: {
    collection: 'usuarios',
    description: 'Usuários do sistema com roles (superadmin, owner, manager, barber, client)',
    listRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    viewRule: `@request.auth.role = "superadmin" || @request.auth.id = id || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    createRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id) || @request.auth.id = ""`,
    updateRule: `@request.auth.role = "superadmin" || @request.auth.id = id || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.role = "owner" && @request.auth.barbearia_id = barbearia_id)`,
  },
  logs_erros_sistema: {
    collection: 'logs_erros_sistema',
    description: 'Logs técnicos de erro e telemetria de suporte (exclusivo Super Admin)',
    listRule: `@request.auth.role = "superadmin"`,
    viewRule: `@request.auth.role = "superadmin"`,
    createRule: ``, // Limitado perimetricamente via Caddy rate-limiting
    updateRule: `@request.auth.role = "superadmin"`,
    deleteRule: `@request.auth.role = "superadmin"`,
  },
  planos_assinatura_cliente: {
    collection: 'planos_assinatura_cliente',
    description: 'Planos de assinatura recorrente do clube de clientes da barbearia',
    listRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)`,
    viewRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)`,
    createRule: `@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)`,
    updateRule: `@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")`,
  },
  planos_assinatura: {
    collection: 'planos_assinatura',
    description: 'Catálogo de planos mensais do Clube de Assinaturas (manual ou Mercado Pago)',
    listRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)`,
    viewRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)`,
    createRule: `@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)`,
    updateRule: `@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")`,
  },
  assinaturas_clientes: {
    collection: 'assinaturas_clientes',
    description: 'Assinaturas ativas, vencidas e histórico de mensalistas do clube',
    listRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id`,
    viewRule: `@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id`,
    createRule: `@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)`,
    updateRule: `@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)`,
    deleteRule: `@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")`,
  },
};

// Aliases em português e inglês para correspondência direta e consistente
POCKETBASE_API_RULES['agendamentos'] = POCKETBASE_API_RULES.bookings;
POCKETBASE_API_RULES['clientes'] = POCKETBASE_API_RULES.customers;
POCKETBASE_API_RULES['servicos'] = POCKETBASE_API_RULES.services;
POCKETBASE_API_RULES['produtos'] = POCKETBASE_API_RULES.products;
POCKETBASE_API_RULES['vendas_balcao'] = POCKETBASE_API_RULES.cash_transactions;
POCKETBASE_API_RULES['faturas'] = POCKETBASE_API_RULES.invoices;
POCKETBASE_API_RULES['despesas'] = POCKETBASE_API_RULES.expenses;
POCKETBASE_API_RULES['tenants'] = POCKETBASE_API_RULES.barbearias;
POCKETBASE_API_RULES['system_error_logs'] = POCKETBASE_API_RULES.logs_erros_sistema;
POCKETBASE_API_RULES['client_subscription_plans'] = POCKETBASE_API_RULES.planos_assinatura_cliente;
POCKETBASE_API_RULES['club_plans'] = POCKETBASE_API_RULES.planos_assinatura;
POCKETBASE_API_RULES['customer_subscriptions'] = POCKETBASE_API_RULES.assinaturas_clientes;

/**
 * Validador de RLS em tempo de execução (Zero Trust Guard)
 * Avalia se o usuário autenticado possui permissão para acessar determinado registro.
 */
export function enforceMultiTenantAccess(
  user: AuthUser | null,
  collectionKey: keyof typeof POCKETBASE_API_RULES | string,
  action: 'list' | 'view' | 'create' | 'update' | 'delete' | 'read' | 'write',
  record?: any
): { allowed: boolean; code?: number; reason?: string } {
  // Normalização de ações e chaves de coleção
  const normalizedAction = action === 'read' ? 'view' : action === 'write' ? 'update' : action;
  const normalizedKey =
    collectionKey === 'agendamentos'
      ? 'bookings'
      : collectionKey === 'clientes'
      ? 'customers'
      : collectionKey === 'servicos'
      ? 'services'
      : collectionKey === 'produtos'
      ? 'products'
      : collectionKey === 'vendas_balcao'
      ? 'cash_transactions'
      : collectionKey === 'faturas'
      ? 'invoices'
      : collectionKey === 'despesas'
      ? 'expenses'
      : collectionKey === 'barbearias'
      ? 'tenants'
      : collectionKey === 'logs_erros_sistema'
      ? 'system_error_logs'
      : collectionKey === 'planos_assinatura_cliente' || collectionKey === 'planos_assinatura' || collectionKey === 'club_plans'
      ? 'planos_assinatura'
      : collectionKey === 'assinaturas_clientes' || collectionKey === 'customer_subscriptions'
      ? 'assinaturas_clientes'
      : collectionKey;

  // 1. Super Admin possui permissão irrestrita de leitura/escrita
  if (user?.role === 'superadmin') {
    return { allowed: true };
  }

  // 2. Coleção de logs de erro: criação pública, visualização exclusiva Super Admin
  if (normalizedKey === 'system_error_logs') {
    if (normalizedAction === 'create') return { allowed: true };
    return {
      allowed: false,
      code: 403,
      reason: 'Acesso restrito exclusivo para auditores e Super Admin.',
    };
  }

  // 3. Usuário anônimo / não autenticado
  if (!user) {
    if (
      (normalizedKey === 'services' || normalizedKey === 'tenants') &&
      (normalizedAction === 'list' || normalizedAction === 'view')
    ) {
      return { allowed: true };
    }
    if (normalizedKey === 'bookings' && normalizedAction === 'create') {
      return { allowed: true }; // Permite agendamento público de clientes
    }
    return { allowed: false, code: 401, reason: 'Autenticação requerida (Token não informado).' };
  }

  // 4. Verificação de Isolamento de Tenant (Cross-tenant breach prevention)
  const recordTenantId =
    record?.barbearia_id || record?.tenantId || record?.tenant_id || (normalizedKey === 'tenants' ? record?.id : undefined);

  if (recordTenantId && recordTenantId !== user.barbearia_id) {
    return {
      allowed: false,
      code: 403,
      reason: `Violação Multi-Tenant: Usuário da barbearia ${user.barbearia_id} tentou acessar recursos da barbearia ${recordTenantId}.`,
    };
  }

  // 5. Restrições por Role: Faturas & Despesas
  if (normalizedKey === 'invoices' || normalizedKey === 'expenses') {
    if (user.role === 'barber' || user.role === 'client' || user.role === 'manager') {
      return {
        allowed: false,
        code: 403,
        reason: 'Acesso Proibido: Barbeiros, gerentes e clientes não possuem acesso ao módulo financeiro executivo/faturas.',
      };
    }
    return { allowed: true };
  }

  // 6. Restrições em Vendas de Balcão (PDV / Comandas)
  if (normalizedKey === 'cash_transactions') {
    if (user.role === 'barber') {
      const recordBarberId = record?.barberId || record?.barbeiro_id;
      if (recordBarberId && user.barber_id && recordBarberId !== user.barber_id) {
        return {
          allowed: false,
          code: 403,
          reason: 'Acesso Restrito: Barbeiro só pode visualizar ou lançar suas próprias vendas de comanda.',
        };
      }
      if (normalizedAction === 'update' || normalizedAction === 'delete') {
        return {
          allowed: false,
          code: 403,
          reason: 'Apenas proprietários e gerentes podem estornar ou alterar vendas registradas.',
        };
      }
      return { allowed: true };
    }
  }

  // 7. Restrições em Catálogo de Produtos
  if (normalizedKey === 'products') {
    if (user.role === 'barber' && (normalizedAction === 'create' || normalizedAction === 'update' || normalizedAction === 'delete')) {
      return {
        allowed: false,
        code: 403,
        reason: 'Acesso Proibido: Barbeiros não possuem permissão para criar, alterar preços ou excluir produtos.',
      };
    }
  }

  // 8. Restrições de Alteração Contratual do Tenant (Anti-BFLA)
  if (normalizedKey === 'tenants' && normalizedAction === 'update') {
    if (user.role === 'owner') {
      const hasPlanTampering =
        record?.plan !== undefined ||
        record?.plan_base_price !== undefined ||
        record?.max_barbeiros !== undefined ||
        record?.valor_mensalidade_acordado !== undefined ||
        record?.bloqueio_automatico !== undefined;
      if (hasPlanTampering) {
        return {
          allowed: false,
          code: 403,
          reason: 'Violação BFLA: Donos não podem alterar dados contratuais, limites ou plano SaaS diretamente.',
        };
      }
    }
  }

  // 9. Restrições por Role na Coleção de Agendamentos
  if (normalizedKey === 'bookings') {
    if (user.role === 'barber') {
      const recordBarberId = record?.barberId || record?.barbeiro_id;
      if (recordBarberId && user.barber_id && recordBarberId !== user.barber_id) {
        return {
          allowed: false,
          code: 403,
          reason: 'Acesso Restrito: Barbeiro só pode visualizar ou gerenciar seus próprios atendimentos na cadeira.',
        };
      }
      return { allowed: true };
    }

    if (user.role === 'client') {
      const recordClientId =
        record?.cliente_id || record?.clienteId || record?.customerId || record?.customer_id;
      if (recordClientId && recordClientId !== user.id) {
        return {
          allowed: false,
          code: 403,
          reason: 'Acesso Restrito: Cliente só pode visualizar ou gerenciar seus próprios agendamentos.',
        };
      }
      return { allowed: true };
    }

    if (user.role === 'owner' || user.role === 'manager') {
      return { allowed: true };
    }
  }

  // 10. Restrições no Cadastro de Clientes
  if (normalizedKey === 'customers') {
    if (normalizedAction === 'delete' && user.role !== 'owner' && user.role !== 'manager') {
      return { allowed: false, code: 403, reason: 'Apenas proprietários e gerentes podem excluir clientes.' };
    }
    return { allowed: true };
  }

  // 11. Restrições em Planos e Assinaturas do Clube
  if (normalizedKey === 'planos_assinatura') {
    if (user.role === 'barber' && (normalizedAction === 'create' || normalizedAction === 'update' || normalizedAction === 'delete')) {
      return {
        allowed: false,
        code: 403,
        reason: 'Acesso Proibido: Barbeiros não possuem permissão para criar, editar ou excluir planos de assinatura.',
      };
    }
  }

  if (normalizedKey === 'assinaturas_clientes') {
    if (user.role === 'barber' && (normalizedAction === 'update' || normalizedAction === 'delete')) {
      return {
        allowed: false,
        code: 403,
        reason: 'Acesso Proibido: Barbeiros não possuem permissão para alterar ou cancelar assinaturas de clientes.',
      };
    }
  }

  // 12. Demais operações de Dono e Gerente na própria barbearia
  if (user.role === 'owner' || user.role === 'manager') {
    return { allowed: true };
  }

  // 12. Cliente final
  if (user.role === 'client') {
    if (normalizedAction === 'list' || normalizedAction === 'view') {
      if (record?.cliente_id && record.cliente_id !== user.id) {
        return { allowed: false, code: 403, reason: 'Cliente só pode visualizar seus próprios registros.' };
      }
      return { allowed: true };
    }
  }

  return { allowed: true };
}

/**
 * Exporta o schema de coleções em JSON pronto para importar no PocketBase
 */
export function exportPocketBaseSchemaRulesJson(): string {
  const seen = new Set<string>();
  const collections: any[] = [];

  for (const def of Object.values(POCKETBASE_API_RULES)) {
    if (def && def.collection && !seen.has(def.collection)) {
      seen.add(def.collection);
      collections.push({
        name: def.collection,
        type: 'base',
        description: def.description,
        schema: [],
        listRule: def.listRule,
        viewRule: def.viewRule,
        createRule: def.createRule,
        updateRule: def.updateRule,
        deleteRule: def.deleteRule,
      });
    }
  }

  return JSON.stringify({ collections }, null, 2);
}
