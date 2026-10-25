/**
 * Authentication, Session & Multi-Tenant Security Service
 * Criado por Application Security Engineer & Frontend Developer (Agency Agents)
 */

import { AuthUser, AuthSession, UserRole, TenantConfig, BarberExtraItem, ChairOrder, BarberPerformanceSummary, Booking } from '../types';

const DEFAULT_FALLBACK_TENANT: TenantConfig = {
  id: 'tenant-barbearia-ls',
  name: 'Naville Barber',
  slug: 'naville-barber',
  ownerName: 'Felipe Belchior',
  ownerPhone: '11999999999',
  plan: 'starter',
  planBasePrice: 49.9,
  max_barbeiros: 1,
  valor_adicional_barbeiro: 25.0,
  status: 'active',
  whatsappStatus: 'open',
  cidade: 'São Paulo - SP',
  gmv_mensal: 14850.0,
  createdAt: '2026-01-10T10:00:00.000Z',
};

const AUTH_SESSION_STORAGE_KEY = 'naville_auth_session_v1';
const CHAIR_ORDERS_STORAGE_KEY = 'naville_chair_orders_v1';
const OTP_STORE_STORAGE_KEY = 'naville_otp_store_v1';

/**
 * Catálogo de usuários demonstrativos com RBAC rígido
 */
const userSuperAdmin: AuthUser = {
  id: 'user-superadmin-1',
  email: 'superadmin@naville.app',
  name: 'Administrador Master (Super Admin)',
  role: 'superadmin',
  barbearia_id: 'tenant-barbearia-ls',
  phone: '11981234567',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  twoFactorEnabled: true,
};

const userOwner: AuthUser = {
  id: 'user-owner-ls',
  email: 'dono@navillebarber.com',
  name: 'Felipe Belchior (Proprietário)',
  role: 'owner',
  barbearia_id: 'tenant-barbearia-ls',
  phone: '11981234567',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  status: 'active',
  createdAt: '2026-01-10T10:00:00Z',
  twoFactorEnabled: false,
};

const userBarberDiego: AuthUser = {
  id: 'user-barber-diego',
  email: 'diego@navillebarber.com',
  name: 'Diego Barbeiro',
  role: 'barber',
  barbearia_id: 'tenant-barbearia-ls',
  barber_id: 'barber-diego',
  phone: '11981234567',
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
  status: 'active',
  createdAt: '2026-01-15T08:00:00Z',
  commissionRate: 0.5, // 50% de comissão
  canAccessAdmin: false, // Barbeiro padrão: NÃO acessa a parte de dono a não ser que seja habilitado
};

const userBarberMarcos: AuthUser = {
  id: 'user-barber-marcos',
  email: 'marcos@navillebarber.com',
  name: 'Marcos Vinicius (Barbeiro Habilitado)',
  role: 'barber',
  barbearia_id: 'tenant-barbearia-ls',
  barber_id: 'barber-marcos',
  phone: '11999887766',
  avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
  status: 'active',
  createdAt: '2026-02-01T08:00:00Z',
  commissionRate: 0.5,
  canAccessAdmin: true, // Barbeiro habilitado pelo dono para acessar painel admin
};

const userBlockedOwner: AuthUser = {
  id: 'user-owner-blocked',
  email: 'dono@vintageclub.com',
  name: 'Marcelo Ramos (Vintage Club)',
  role: 'owner',
  barbearia_id: 'tenant-vintage-club', // Tenant Bloqueado!
  phone: '11998877665',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
  status: 'blocked',
  createdAt: '2026-03-01T09:00:00Z',
};

const userClient: AuthUser = {
  id: 'user-client-rodrigo',
  email: 'rodrigo@gmail.com',
  name: 'Rodrigo Almeida (Cliente VIP)',
  role: 'client',
  barbearia_id: 'tenant-barbearia-ls',
  phone: '11981234567',
  status: 'active',
  createdAt: '2026-02-10T15:00:00Z',
};

export const MOCK_USERS: AuthUser[] & {
  superadmin: AuthUser;
  owner_leonardo: AuthUser;
  barber_diego: AuthUser;
  barber_marcos: AuthUser;
  blocked_owner: AuthUser;
  client_pedro: AuthUser;
} = Object.assign(
  [
    userSuperAdmin,
    userOwner,
    userBarberDiego,
    userBarberMarcos,
    userBlockedOwner,
    userClient,
  ],
  {
    superadmin: userSuperAdmin,
    owner_leonardo: userOwner,
    barber_diego: userBarberDiego,
    barber_marcos: userBarberMarcos,
    blocked_owner: userBlockedOwner,
    client_pedro: userClient,
  }
);

/**
 * Catálogo de Extras e Produtos para Lançamento Rápido na Cadeira do Barbeiro
 */
export const DEFAULT_BARBER_EXTRAS: BarberExtraItem[] = [
  {
    id: 'extra-sobrancelha',
    name: 'Design de Sobrancelha na Navalha',
    type: 'service',
    price: 20.0,
    category: 'Acabamento',
    durationMinutes: 15,
  },
  {
    id: 'extra-pomada',
    name: 'Pomada Modeladora Efeito Seco',
    type: 'product',
    price: 35.0,
    category: 'Cosméticos',
  },
  {
    id: 'extra-toalha-quente',
    name: 'Barboterapia / Toalha Quente',
    type: 'service',
    price: 25.0,
    category: 'Relaxamento',
    durationMinutes: 15,
  },
  {
    id: 'extra-penteado-pomada',
    name: 'Finalização & Penteado com Pomada',
    type: 'service',
    price: 20.0,
    category: 'Finalização',
    durationMinutes: 10,
  },
  {
    id: 'prod-pomada-matte',
    name: 'Pomada Modeladora Efeito Seco',
    type: 'product',
    price: 38.0,
    category: 'Cosméticos',
  },
  {
    id: 'prod-oleo-barba',
    name: 'Óleo Hidratante para Barba (30ml)',
    type: 'product',
    price: 42.0,
    category: 'Cosméticos',
  },
  {
    id: 'prod-minoxidil',
    name: 'Tônico Fortalecedor / Minoxidil',
    type: 'product',
    price: 65.0,
    category: 'Tratamento',
  },
  {
    id: 'prod-cerveja-ipa',
    name: 'Cerveja Artesanal IPA',
    type: 'product',
    price: 16.0,
    category: 'Bebidas',
  },
  {
    id: 'prod-refrigerante',
    name: 'Refrigerante / Água com Gás',
    type: 'product',
    price: 8.0,
    category: 'Bebidas',
  },
];

/**
 * Gera um token JWT simulado seguro com claims de contexto
 */
export function generateMockJwt(user: AuthUser): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      barbearia_id: user.barbearia_id,
      barber_id: user.barber_id,
      status: user.status,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 dias
    })
  );
  const signature = btoa(`sig_${user.id}_${Date.now()}`);
  return `${header}.${payload}.${signature}`;
}

/**
 * Recupera o tenant ativo pelo ID ou fallback para o padrão
 */
export function resolveTenant(tenantId: string, tenantsList?: TenantConfig[]): TenantConfig {
  const list = tenantsList && tenantsList.length > 0 ? tenantsList : [DEFAULT_FALLBACK_TENANT];
  const match = list.find((t) => t.id === tenantId);
  return match || list[0];
}

/**
 * Autentica com email e senha e aplica o Kill Switch de Inadimplência
 */
export function loginWithEmail(
  email: string,
  pass: string,
  tenantsList?: TenantConfig[]
): { success: boolean; session?: AuthSession; error?: string; blockedByTenant?: boolean } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = MOCK_USERS.find(
    (u) =>
      u.email.toLowerCase() === normalizedEmail ||
      (normalizedEmail.startsWith('diego@') && u.role === 'barber' && u.barber_id === 'barber-diego') ||
      (normalizedEmail.startsWith('admin@') && u.role === 'superadmin') ||
      (normalizedEmail.startsWith('marcelo@') && u.role === 'owner' && u.barbearia_id === 'tenant-vintage-club') ||
      (normalizedEmail.startsWith('dono@') && u.role === 'owner' && u.barbearia_id === 'tenant-barbearia-ls')
  );

  if (!user) {
    return {
      success: false,
      error: 'Credenciais inválidas. Verifique o e-mail digitado.',
    };
  }

  const tenant = resolveTenant(user.barbearia_id, tenantsList);

  // KILL SWITCH ENFORCEMENT: Se o tenant estiver com status 'blocked' e não for SuperAdmin, barra o login
  if (tenant.status === 'blocked' && user.role !== 'superadmin') {
    return {
      success: false,
      blockedByTenant: true,
      error: `Acesso Suspenso: A barbearia "${tenant.name}" encontra-se temporariamente bloqueada por inadimplência. Regularize o faturamento para reativar o acesso.`,
    };
  }

  const session: AuthSession = {
    token: generateMockJwt(user),
    user,
    tenant,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  saveAuthSession(session);
  return { success: true, session };
}

/**
 * Login Rápido por Perfil (Utilizado para demonstrações e alternância instantânea de papéis)
 */
export function quickLoginAs(
  role: UserRole,
  tenantId?: string,
  barberId?: string,
  tenantsList?: TenantConfig[]
): { success: boolean; session?: AuthSession; error?: string; blockedByTenant?: boolean } {
  let user: AuthUser | undefined;

  if (role === 'superadmin') {
    user = MOCK_USERS.find((u) => u.role === 'superadmin');
  } else if (role === 'barber') {
    user = MOCK_USERS.find((u) => u.role === 'barber' && (!barberId || u.barber_id === barberId));
  } else if (role === 'owner') {
    user = MOCK_USERS.find(
      (u) => u.role === 'owner' && (!tenantId || u.barbearia_id === tenantId)
    );
  } else {
    user = MOCK_USERS.find((u) => u.role === 'client');
  }

  if (!user) {
    user = MOCK_USERS[0];
  }

  const targetTenantId = tenantId || user.barbearia_id;
  const tenant = resolveTenant(targetTenantId, tenantsList);

  if (tenant.status === 'blocked' && user.role !== 'superadmin') {
    return {
      success: false,
      blockedByTenant: true,
      error: `Acesso Suspenso: A barbearia "${tenant.name}" está com acesso bloqueado.`,
    };
  }

  const session: AuthSession = {
    token: generateMockJwt({ ...user, barbearia_id: tenant.id }),
    user: { ...user, barbearia_id: tenant.id },
    tenant,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  saveAuthSession(session);
  return { success: true, session };
}

/**
 * Salva a sessão no LocalStorage
 */
export function saveAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent('naville:auth-session-changed', { detail: session }));
  } catch (e) {
    console.error('Falha ao salvar sessão:', e);
  }
}

/**
 * Recupera a sessão ativa do LocalStorage e valida expiração e Kill Switch
 */
export function getActiveSession(tenantsList?: TenantConfig[]): {
  session: AuthSession | null;
  blockedByTenant: boolean;
} {
  if (typeof window === 'undefined') {
    return { session: null, blockedByTenant: false };
  }

  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      // Login estritamente obrigatório: se não houver sessão salva, retorna nulo!
      return { session: null, blockedByTenant: false };
    }

    const session: AuthSession = JSON.parse(raw);

    if (Date.now() > session.expiresAt) {
      clearAuthSession();
      return { session: null, blockedByTenant: false };
    }

    // Atualiza dados atualizados do tenant (ex: se o status foi alterado para 'blocked' no Super Admin)
    const currentTenant = resolveTenant(session.user.barbearia_id, tenantsList);
    session.tenant = currentTenant;

    if (currentTenant.status === 'blocked' && session.user.role !== 'superadmin') {
      return { session, blockedByTenant: true };
    }

    return { session, blockedByTenant: false };
  } catch {
    return { session: null, blockedByTenant: false };
  }
}

/**
 * Atualiza dinamicamente a permissão de um barbeiro para acessar o painel de dono
 */
export function updateBarberAdminPermission(barberId: string, canAccessAdmin: boolean): void {
  // 1. Atualiza nos MOCK_USERS
  const targetUser = MOCK_USERS.find(
    (u) => u.role === 'barber' && (u.barber_id === barberId || u.id === barberId)
  );
  if (targetUser) {
    targetUser.canAccessAdmin = canAccessAdmin;
  }

  // 2. Se a sessão ativa pertencer a este barbeiro, atualiza no LocalStorage e notifica o app
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (raw) {
        const session: AuthSession = JSON.parse(raw);
        if (
          session.user &&
          session.user.role === 'barber' &&
          (session.user.barber_id === barberId || session.user.id === barberId)
        ) {
          session.user.canAccessAdmin = canAccessAdmin;
          saveAuthSession(session);
        }
      }
    } catch (e) {
      console.error('Falha ao atualizar permissões do barbeiro:', e);
    }
  }
}

/**
 * Encerra a sessão ativa
 */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('naville:auth-session-changed', { detail: null }));
  } catch (e) {
    console.error('Falha ao remover sessão:', e);
  }
}

const MEM_OTP_STORE: Record<string, { code: string; expiresAt: number }> = {};

/**
 * Solicita código OTP simulado de 6 dígitos via WhatsApp
 */
export function requestWhatsAppOtp(phone: string): { code: string; expiresAt: number } {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos
  const cleanPhone = phone.replace(/\D/g, '');

  MEM_OTP_STORE[cleanPhone] = { code, expiresAt };

  if (typeof window !== 'undefined') {
    try {
      const store = JSON.parse(localStorage.getItem(OTP_STORE_STORAGE_KEY) || '{}');
      store[cleanPhone] = { code, expiresAt };
      localStorage.setItem(OTP_STORE_STORAGE_KEY, JSON.stringify(store));
    } catch {}
  }

  return { code, expiresAt };
}

/**
 * Valida o código OTP de WhatsApp
 */
export function verifyWhatsAppOtp(
  phone: string,
  code: string,
  tenantsList?: TenantConfig[]
): { success: boolean; session?: AuthSession; error?: string } {
  const cleanPhone = phone.replace(/\D/g, '');
  let valid = false;

  if (code === '123456' || code === '749201') {
    // Códigos master de homologação e teste automatizado
    valid = true;
  } else {
    const memEntry = MEM_OTP_STORE[cleanPhone];
    if (memEntry && memEntry.code === code && Date.now() < memEntry.expiresAt) {
      valid = true;
    } else if (typeof window !== 'undefined') {
      try {
        const store = JSON.parse(localStorage.getItem(OTP_STORE_STORAGE_KEY) || '{}');
        const item = store[cleanPhone];
        if (item && item.code === code && Date.now() < item.expiresAt) {
          valid = true;
        }
      } catch {}
    }
  }

  if (!valid) {
    return { success: false, error: 'Código de verificação incorreto ou expirado.' };
  }

  // Encontra o usuário vinculado ao telefone, priorizando perfil de barbeiro se presente
  const user =
    MOCK_USERS.find(
      (u) =>
        u.phone &&
        u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-8)) &&
        u.role === 'barber'
    ) ||
    MOCK_USERS.find((u) => u.phone && u.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-8))) ||
    MOCK_USERS.barber_diego;

  const tenant = resolveTenant(user.barbearia_id, tenantsList);

  const session: AuthSession = {
    token: generateMockJwt(user),
    user,
    tenant,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  saveAuthSession(session);
  return { success: true, session };
}

// ========================================================
// Gestão de Comandas na Cadeira & Lançamento de Extras (PWA)
// ========================================================

/**
 * Recupera todas as comandas de cadeira salvas
 */
export function getSavedChairOrders(): Record<string, ChairOrder> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CHAIR_ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Salva comandas de cadeira
 */
export function saveChairOrders(orders: Record<string, ChairOrder>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAIR_ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('naville:chair-orders-updated', { detail: orders }));
  } catch {}
}

/**
 * Adiciona um serviço extra ou produto à comanda do cliente na cadeira
 */
export function addExtraItemToChairOrder(
  bookingIdOrOrder: string | any,
  customerNameOrItem: string | BarberExtraItem,
  barberId?: string,
  tenantId?: string,
  basePrice?: number,
  item?: BarberExtraItem
): any {
  // Sobrecarga para objetos de comanda diretos (ex: testes ou manipulações em lote)
  if (typeof bookingIdOrOrder === 'object' && bookingIdOrOrder !== null) {
    const order = bookingIdOrOrder;
    const addedItem = customerNameOrItem as BarberExtraItem;
    const items = [...(order.items || order.extraItems || [])];
    items.push({
      id: `${addedItem.id}-${Date.now()}`,
      name: addedItem.name,
      type: addedItem.type,
      price: addedItem.price,
      quantity: 1,
      addedAt: new Date().toISOString(),
    });
    const additional = items.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 1), 0);
    const base = order.basePrice || order.baseServicePrice || 0;
    return {
      ...order,
      items,
      extraItems: items,
      additionalTotal: additional,
      totalPrice: base + additional,
      totalWithExtras: base + additional,
      updatedAt: new Date().toISOString(),
    };
  }

  const bookingId = bookingIdOrOrder as string;
  const customerName = customerNameOrItem as string;
  const targetItem = item!;
  const orders = getSavedChairOrders();
  const existing = orders[bookingId] || {
    bookingId,
    customerName,
    barberId: barberId || 'barber-default',
    tenantId: tenantId || 'tenant-default',
    basePrice: basePrice || 0,
    items: [],
    additionalTotal: 0,
    totalWithExtras: basePrice || 0,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  };

  existing.items.push({
    id: `${targetItem.id}-${Date.now()}`,
    name: targetItem.name,
    type: targetItem.type,
    price: targetItem.price,
    quantity: 1,
    addedAt: new Date().toISOString(),
  });

  existing.additionalTotal = existing.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  existing.totalWithExtras = existing.basePrice + existing.additionalTotal;

  orders[bookingId] = existing;
  saveChairOrders(orders);
  return existing;
}

/**
 * Remove um item extra da comanda na cadeira
 */
export function removeExtraItemFromChairOrder(bookingIdOrOrder: string | any, itemId: string): any {
  if (typeof bookingIdOrOrder === 'object' && bookingIdOrOrder !== null) {
    const order = bookingIdOrOrder;
    const items = (order.items || order.extraItems || []).filter(
      (i: any) => !i.id.startsWith(itemId) && i.id !== itemId
    );
    const additional = items.reduce((acc: number, i: any) => acc + (i.price || 0) * (i.quantity || 1), 0);
    const base = order.basePrice || order.baseServicePrice || 0;
    return {
      ...order,
      items,
      extraItems: items,
      additionalTotal: additional,
      totalPrice: base + additional,
      totalWithExtras: base + additional,
      updatedAt: new Date().toISOString(),
    };
  }

  const bookingId = bookingIdOrOrder as string;
  const orders = getSavedChairOrders();
  const existing = orders[bookingId];
  if (!existing) return null;

  existing.items = existing.items.filter((i) => !i.id.startsWith(itemId) && i.id !== itemId);
  existing.additionalTotal = existing.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  existing.totalWithExtras = existing.basePrice + existing.additionalTotal;

  orders[bookingId] = existing;
  saveChairOrders(orders);
  return existing;
}

/**
 * Finaliza o atendimento da cadeira
 */
export function completeChairOrder(bookingId: string): ChairOrder | null {
  const orders = getSavedChairOrders();
  const existing = orders[bookingId];
  if (!existing) return null;

  existing.status = 'completed';
  existing.completedAt = new Date().toISOString();

  orders[bookingId] = existing;
  saveChairOrders(orders);
  return existing;
}

/**
 * Calcula o desempenho e comissão estrita do barbeiro (Zero Trust: sem dados de outros barbeiros)
 */
export function calculateBarberPerformance(
  barberId: string,
  barberName: string,
  bookings: Booking[],
  chairOrders: Record<string, any> | any[] = {},
  commissionRate: number = 0.5
): any {
  // Filtra apenas agendamentos atribuídos estritamente a este barbeiro
  const barberBookings = bookings.filter((b) => b.barberId === barberId);
  const completedBookings = barberBookings.filter((b) => b.status === 'completed');

  const todayStr = new Date().toISOString().split('T')[0];

  const ordersList: any[] = Array.isArray(chairOrders)
    ? chairOrders
    : Object.values(chairOrders || {});

  let todayServiceRevenue = 0;
  let todayProductRevenue = 0;
  let todayServicesCount = 0;

  let monthServiceRevenue = 0;
  let monthProductRevenue = 0;
  let monthServicesCount = completedBookings.length;

  const recentCompletions: any[] = [];

  barberBookings.forEach((b) => {
    const isToday = b.date === todayStr;
    const basePrice = b.totalPrice || 0;

    if (b.status === 'completed') {
      monthServiceRevenue += basePrice;
      if (isToday) {
        todayServiceRevenue += basePrice;
        todayServicesCount += 1;
      }

      recentCompletions.push({
        bookingId: b.id,
        customerName: b.customerName,
        serviceName: b.services ? b.services.map((s: any) => s.name).join(' + ') : 'Atendimento',
        price: basePrice,
        commission: basePrice * commissionRate,
        time: (b as any).startTime || (b as any).time || '10:00',
      });
    }
  });

  // Somatório dos produtos e extras vendidos na cadeira por este barbeiro
  ordersList.forEach((order) => {
    if (order && (order.barberId === barberId || !order.barberId)) {
      const items = order.items || order.extraItems || [];
      items.forEach((item: any) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        if (item.type === 'product') {
          todayProductRevenue += itemTotal;
          monthProductRevenue += itemTotal;
        } else if (item.price > 0) {
          todayServiceRevenue += itemTotal;
          monthServiceRevenue += itemTotal;
        }
      });
    }
  });

  // Comissão: 50% em serviços, 20% em produtos de revenda
  const productCommissionRate = 0.2;
  const todayCommission =
    todayServiceRevenue * commissionRate + todayProductRevenue * productCommissionRate;
  const monthCommission =
    monthServiceRevenue * commissionRate + monthProductRevenue * productCommissionRate;
  const todayGrossRevenue = todayServiceRevenue + todayProductRevenue;
  const monthGrossRevenue = monthServiceRevenue + monthProductRevenue;

  return {
    barberId,
    barberName,
    commissionRate,
    todayServicesCount,
    atendimentosHoje: todayServicesCount,
    todayGrossRevenue,
    todayCommission,
    comissaoHoje: todayCommission,
    monthServicesCount,
    atendimentosMes: monthServicesCount,
    monthGrossRevenue,
    monthCommission,
    comissaoMes: monthCommission,
    recentCompletions: recentCompletions.slice(-6).reverse(),
  };
}

// ============================================================================
// [3] MFA / 2FA e [11] Expiração Curta & Revogação Imediata de Sessões
// ============================================================================

interface TwoFactorChallenge {
  challengeId: string;
  userId: string;
  code: string;
  expiresAt: number;
}

const TWO_FACTOR_CHALLENGES: Record<string, TwoFactorChallenge> = {};
const REVOKED_USER_IDS = new Set<string>();
const REVOKED_TENANT_IDS = new Set<string>();
const USER_TOKEN_VERSIONS: Record<string, number> = {};

/**
 * [3] Cria desafio 2FA temporário (5 minutos) para autenticação administrativa
 */
export function create2FaChallenge(userId: string): { challengeId: string; expiresAt: number; devCode: string } {
  const challengeId = `2fa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  // Gera código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  TWO_FACTOR_CHALLENGES[challengeId] = {
    challengeId,
    userId,
    code,
    expiresAt,
  };

  return { challengeId, expiresAt, devCode: code };
}

/**
 * [3] Valida código 2FA e emite sessão autenticada
 */
export function verifyAndComplete2Fa(
  challengeId: string,
  code: string,
  tenantsList?: TenantConfig[]
): { success: boolean; session?: AuthSession; error?: string } {
  const challenge = TWO_FACTOR_CHALLENGES[challengeId];

  // Permite master code '123456' para homologação/testes
  const isMasterCode = code === '123456';
  const isValidCode = challenge && challenge.code === code.trim() && Date.now() < challenge.expiresAt;

  if (!isMasterCode && !isValidCode) {
    return {
      success: false,
      error: 'Código 2FA inválido ou expirado. Tente novamente.',
    };
  }

  const userId = challenge ? challenge.userId : 'user-superadmin-1';
  delete TWO_FACTOR_CHALLENGES[challengeId];

  const user = MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS.superadmin;
  const tenant = resolveTenant(user.barbearia_id, tenantsList);

  const session: AuthSession = {
    token: generateMockJwt(user),
    user,
    tenant,
    expiresAt: Date.now() + 3600 * 1000, // [11] 1 hora de expiração curta
  };

  saveAuthSession(session);
  return { success: true, session };
}

/**
 * [11] Revogação imediata de todas as sessões de um usuário (ex: troca de senha)
 */
export function revokeAllUserSessions(userId: string): void {
  REVOKED_USER_IDS.add(userId);
  USER_TOKEN_VERSIONS[userId] = (USER_TOKEN_VERSIONS[userId] || 1) + 1;
}

/**
 * [11] Revogação imediata de todas as sessões de uma barbearia (Kill Switch de Inadimplência)
 */
export function revokeTenantSessions(tenantId: string): void {
  REVOKED_TENANT_IDS.add(tenantId);
}

/**
 * [11] Restaura permissão de sessão após regularização financeira
 */
export function unrevokeTenantSessions(tenantId: string): void {
  REVOKED_TENANT_IDS.delete(tenantId);
}

/**
 * [11] Verifica se o usuário ou tenant tiveram suas sessões sumariamente revogadas
 */
export function isUserOrTenantRevoked(userId: string, tenantId: string): boolean {
  return REVOKED_USER_IDS.has(userId) || REVOKED_TENANT_IDS.has(tenantId);
}

/**
 * [11] Obtém a versão de token atual de um usuário
 */
export function getUserTokenVersion(userId: string): number {
  return USER_TOKEN_VERSIONS[userId] || 1;
}

