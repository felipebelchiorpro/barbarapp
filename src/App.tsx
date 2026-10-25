import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { StepIndicator } from './components/BookingFlow/StepIndicator';
import { StepServices } from './components/BookingFlow/StepServices';
import { StepBarber } from './components/BookingFlow/StepBarber';
import { StepDateTime } from './components/BookingFlow/StepDateTime';
import { StepCustomer } from './components/BookingFlow/StepCustomer';
import { StepConfirmation } from './components/BookingFlow/StepConfirmation';
import { FloatingFooterSummary } from './components/BookingFlow/FloatingFooterSummary';
import { BookingSuccessModal } from './components/BookingFlow/BookingSuccessModal';
import { AdminScheduleView } from './components/AdminPanel/AdminScheduleView';
import { QuickTimeBlockModal } from './components/AdminPanel/QuickTimeBlockModal';
import { WebhookMonitorModal } from './components/AdminPanel/WebhookMonitorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { QRCodeModal } from './components/QRCodeModal';
import { SuperAdminDashboard } from './components/SuperAdmin/SuperAdminDashboard';
import { TenantBlockedCustomerView } from './components/SuperAdmin/TenantBlockedCustomerView';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { UserFriendlyToast } from './components/UserFriendlyToast';
import { initGlobalErrorInterceptors } from './services/systemErrorLogService';
import { BarberPwaView } from './components/BarberPwa/BarberPwaView';
import { BarberLoginModal } from './components/BarberPwa/BarberLoginModal';
import { SecureLoginView } from './components/Auth/SecureLoginView';
import { getActiveSession, MOCK_USERS } from './services/authService';
import { AuthSession } from './types';
import { NavilleLuxuryClientView } from './components/LuxurySuite/NavilleLuxuryClientView';
import { Crown } from 'lucide-react';

import {
  INITIAL_SERVICES,
  INITIAL_BARBERS,
  INITIAL_BOOKINGS,
  INITIAL_BLOCKS,
  DEFAULT_EVOLUTION_CONFIG,
  DEFAULT_TENANT_CONFIG,
  INITIAL_TENANTS,
  INITIAL_INVOICES,
  INITIAL_NINJA_WEBHOOK_LOGS,
  DEFAULT_INVOICE_NINJA_CONFIG,
  SAAS_PLANS,
  INITIAL_EXPENSES,
  INITIAL_CUSTOMERS,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_CLIENT_SUBSCRIPTION_PLANS,
  getTodayDateString,
} from './data/mockData';
import {
  Barber,
  Booking,
  BookingStatus,
  EvolutionApiConfig,
  Service,
  TimeBlock,
  WebhookLog,
  TenantConfig,
  Invoice,
  InvoiceNinjaConfig,
  InvoiceNinjaWebhookEvent,
  InvoiceNinjaWebhookLog,
  Expense,
  CustomerProfile,
  CashTransaction,
  ClientSubscriptionPlan,
  CrmWebhookConfig,
} from './types';
import { addMinutesToTime, cleanPhone, cleanDigits, generateSlug } from './utils/formatters';
import { calculateSlotAvailability } from './utils/doubleBooking';
import { dispatchEvolutionWebhook } from './services/webhookService';
import { processInvoiceNinjaWebhook } from './services/invoiceNinjaService';
import {
  DEFAULT_CRM_WEBHOOK_CONFIG,
  buildCrmEventPayload,
  dispatchCrmWebhook,
} from './services/crmWebhookService';
import {
  syncTenantToPocketBase,
  syncCustomerToPocketBase,
  syncCashTransactionToPocketBase,
  syncExpenseToPocketBase,
  syncClientSubscriptionPlanToPocketBase,
} from './services/pocketbaseSchema';

export function extractSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const match = path.match(/^\/b\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  const params = new URLSearchParams(window.location.search);
  const paramSlug = params.get('b') || params.get('slug') || params.get('tenant');
  if (paramSlug) return paramSlug.toLowerCase();
  return null;
}

function checkUrlView(): 'client' | 'admin' | 'super-admin' | 'barber' {
  if (typeof window === 'undefined') return 'client';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  // Rota pública por slug /b/:slug sempre abre a tela do cliente
  if (path.startsWith('/b/')) {
    return 'client';
  }

  // Rota de Login Seguro (Barbeiro, Dono e Super Admin Master)
  if (
    path.includes('/login') ||
    path.includes('/entrar') ||
    path.includes('/acesso') ||
    path.includes('/auth') ||
    hash.includes('login') ||
    hash.includes('entrar') ||
    hash.includes('auth') ||
    search.includes('login') ||
    search.includes('auth')
  ) {
    return 'login';
  }

  if (
    path.includes('/super-admin') ||
    path.includes('/superadmin') ||
    hash.includes('super-admin') ||
    hash.includes('superadmin') ||
    search.includes('superadmin') ||
    search.includes('super-admin')
  ) {
    return 'super-admin';
  }
  if (
    path.includes('/barbeiro') ||
    path.includes('/barber') ||
    path.includes('/cadeira') ||
    path.includes('/pwa') ||
    hash.includes('barbeiro') ||
    hash.includes('barber') ||
    hash.includes('cadeira') ||
    search.includes('barbeiro') ||
    search.includes('barber')
  ) {
    return 'barber';
  }
  if (
    path.includes('/painel') ||
    path.includes('/app') ||
    path.includes('/admin') ||
    hash.includes('admin') ||
    hash.includes('painel') ||
    hash.includes('app') ||
    search.includes('admin') ||
    search.includes('painel')
  ) {
    return 'admin';
  }
  return 'client';
}

export default function App() {
  // Navigation View (auto-detects /super-admin, /admin, /barbeiro, /login, or client)
  const [currentView, setCurrentView] = useState<'client' | 'admin' | 'super-admin' | 'barber' | 'login'>(() => {
    return checkUrlView();
  });

  // UI Version: 'v1' (Clássica 1.0) | 'v2' (Naville Luxury Suite 2.0)
  const [uiVersion, setUiVersion] = useState<'v1' | 'v2'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('naville_ui_version');
      if (saved === 'v1' || saved === 'v2') return saved;
    }
    return 'v2'; // Nova versão Luxury Suite 2.0 por padrão!
  });

  const handleToggleUiVersion = (v: 'v1' | 'v2') => {
    setUiVersion(v);
    if (typeof window !== 'undefined') {
      localStorage.setItem('naville_ui_version', v);
    }
  };

  // Multi-Tenant State (Gerenciado pelo Super Admin e persistido no LocalStorage / PocketBase)
  const [tenants, setTenants] = useState<TenantConfig[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_tenants_v1');
    return saved ? JSON.parse(saved) : INITIAL_TENANTS;
  });

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlSlug = extractSlugFromUrl();
      if (urlSlug) {
        const found = INITIAL_TENANTS.find((t) => t.slug === urlSlug || t.id === urlSlug);
        if (found) return found.id;
      }
    }
    return INITIAL_TENANTS[0]?.id || 'tenant-barbearia-ls';
  });

  // Save tenants
  useEffect(() => {
    localStorage.setItem('barbearia_ls_tenants_v1', JSON.stringify(tenants));
  }, [tenants]);

  // Active tenant derived
  const activeTenant = useMemo(() => {
    return tenants.find((t) => t.id === activeTenantId) || tenants[0] || DEFAULT_TENANT_CONFIG;
  }, [tenants, activeTenantId]);

  // Sync with browser URL changes and initialize global silent error capture
  useEffect(() => {
    initGlobalErrorInterceptors();
    const handleUrlChange = () => {
      setCurrentView(checkUrlView());
      const urlSlug = extractSlugFromUrl();
      if (urlSlug) {
        const found = tenants.find((t) => t.slug === urlSlug || t.id === urlSlug);
        if (found) {
          setActiveTenantId(found.id);
        }
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [tenants]);

  const handleNavigate = (view: 'client' | 'admin' | 'super-admin' | 'barber' | 'login', slug?: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const currentSlug = slug || activeTenant.slug || 'barbearia-ls';
    const targetPath =
      view === 'super-admin'
        ? '/super-admin'
        : view === 'admin'
        ? '/painel'
        : view === 'barber'
        ? '/barbeiro'
        : view === 'login'
        ? '/login'
        : `/b/${currentSlug}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view, slug: currentSlug }, '', targetPath);
    }
  };

  // Booking Flow Steps (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Auth Session & Zero-Trust RBAC State (Modo Cadeira & Multi-tenant)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    return getActiveSession(tenants).session;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Auto-enforce Kill Switch: if tenant gets blocked, session is immediately re-checked
  useEffect(() => {
    const updated = getActiveSession(tenants);
    setAuthSession(updated.session);
  }, [tenants]);

  // CRM Webhooks State (Módulo CRM & Pipeline de Vendas)
  const [crmConfig, setCrmConfig] = useState<CrmWebhookConfig>(() => {
    const saved = localStorage.getItem('naville_crm_config_v1');
    return saved ? JSON.parse(saved) : DEFAULT_CRM_WEBHOOK_CONFIG;
  });

  // Handlers for Super Admin Actions
  const handleUpdateTenant = (updatedTenant: TenantConfig) => {
    const oldTenant = tenants.find((t) => t.id === updatedTenant.id);

    setTenants((prev) =>
      prev.map((t) => (t.id === updatedTenant.id ? updatedTenant : t))
    );
    syncTenantToPocketBase(updatedTenant);

    // Disparo em tempo real de webhooks de ciclo de vida para o CRM externo
    if (oldTenant) {
      // 1. Upsell de vaga de barbeiro
      if (updatedTenant.max_barbeiros > oldTenant.max_barbeiros) {
        dispatchCrmWebhook(
          'saas.upsell.vaga_adicionada',
          buildCrmEventPayload('saas.upsell.vaga_adicionada', {
            tenant: updatedTenant,
            upsell: {
              vagas_anteriores: oldTenant.max_barbeiros,
              novas_vagas: updatedTenant.max_barbeiros,
              vagas_adicionais: updatedTenant.max_barbeiros - oldTenant.max_barbeiros,
              valor_recorrente_adicional:
                (updatedTenant.max_barbeiros - oldTenant.max_barbeiros) * 25.0,
            },
          }),
          crmConfig
        );
      }
      // 2. Barbearia ativada
      if (oldTenant.status === 'trial' && updatedTenant.status === 'active') {
        dispatchCrmWebhook(
          'saas.barbearia.ativada',
          buildCrmEventPayload('saas.barbearia.ativada', { tenant: updatedTenant }),
          crmConfig
        );
      }
      // 3. Suspensão / Bloqueio (Kill Switch)
      if (oldTenant.status !== 'blocked' && updatedTenant.status === 'blocked') {
        dispatchCrmWebhook(
          'saas.cobranca.cancelada_ou_bloqueada',
          buildCrmEventPayload('saas.cobranca.cancelada_ou_bloqueada', {
            tenant: updatedTenant,
            motivoBloqueio: 'Inadimplência de mensalidade - Suspensão da barbearia',
          }),
          crmConfig
        );
      }
      // 4. Cobrança em atraso
      if (oldTenant.status_assinatura !== 'em_atraso' && updatedTenant.status_assinatura === 'em_atraso') {
        dispatchCrmWebhook(
          'saas.cobranca.em_atraso',
          buildCrmEventPayload('saas.cobranca.em_atraso', { tenant: updatedTenant }),
          crmConfig
        );
      }
    }
  };

  const handleAddTenant = (newTenant: TenantConfig) => {
    setTenants((prev) => [newTenant, ...prev]);
    syncTenantToPocketBase(newTenant);
    dispatchCrmWebhook(
      'saas.lead.cadastro_iniciado',
      buildCrmEventPayload('saas.lead.cadastro_iniciado', { tenant: newTenant }),
      crmConfig
    );
  };

  const handleSelectTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
  };

  // Invoice Ninja & Billing State (Módulo 3)
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_invoices_v1');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [ninjaConfig, setNinjaConfig] = useState<InvoiceNinjaConfig>(() => {
    const saved = localStorage.getItem('barbearia_ls_ninja_config_v1');
    return saved ? JSON.parse(saved) : DEFAULT_INVOICE_NINJA_CONFIG;
  });

  const [ninjaWebhookLogs, setNinjaWebhookLogs] = useState<InvoiceNinjaWebhookLog[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_ninja_logs_v1');
    return saved ? JSON.parse(saved) : INITIAL_NINJA_WEBHOOK_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('barbearia_ls_invoices_v1', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_ninja_config_v1', JSON.stringify(ninjaConfig));
  }, [ninjaConfig]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_ninja_logs_v1', JSON.stringify(ninjaWebhookLogs));
  }, [ninjaWebhookLogs]);

  // Handler for Invoice Ninja Webhooks (Idempotent processing with Kill Switch trigger)
  const handleTriggerNinjaWebhook = (params: {
    eventType: InvoiceNinjaWebhookEvent;
    tenantId: string;
    invoiceId?: string;
    amount?: number;
    forcedIdempotencyKey?: string;
  }) => {
    const result = processInvoiceNinjaWebhook({
      eventType: params.eventType,
      tenantId: params.tenantId,
      invoiceId: params.invoiceId,
      amount: params.amount,
      tenants,
      invoices,
      existingLogs: ninjaWebhookLogs,
      config: ninjaConfig,
      forcedIdempotencyKey: params.forcedIdempotencyKey,
    });

    setTenants(result.updatedTenants);
    setInvoices(result.updatedInvoices);
    setNinjaWebhookLogs((prev) => [result.log, ...prev]);

    return {
      actionTaken: result.actionTaken,
      isDuplicate: result.isDuplicate,
    };
  };

  const handlePayInvoiceSimulated = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    handleTriggerNinjaWebhook({
      eventType: 'invoice.paid',
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      amount: invoice.amount,
    });
  };

  // Expenses State (Controle de Gastos & Fluxo de Caixa)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_expenses_v1');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  useEffect(() => {
    localStorage.setItem('barbearia_ls_expenses_v1', JSON.stringify(expenses));
  }, [expenses]);

  const handleAddExpense = (newExpData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    syncExpenseToPocketBase(newExpense);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
    );
    syncExpenseToPocketBase(updatedExpense);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  };

  const handleToggleExpensePaid = (expenseId: string) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id === expenseId) {
          const isNowPaid = e.status !== 'paid';
          const updated = {
            ...e,
            status: (isNowPaid ? 'paid' : 'pending') as 'paid' | 'pending',
            paidAt: isNowPaid ? new Date().toISOString() : null,
          };
          syncExpenseToPocketBase(updated);
          return updated;
        }
        return e;
      })
    );
  };

  // Customers State (Mini CRM & Base de Clientes)
  const [customers, setCustomers] = useState<CustomerProfile[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_customers_v1');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  useEffect(() => {
    localStorage.setItem('barbearia_ls_customers_v1', JSON.stringify(customers));
  }, [customers]);

  const handleAddCustomer = (newCustData: Omit<CustomerProfile, 'id' | 'createdAt'>) => {
    const newCust: CustomerProfile = {
      ...newCustData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    syncCustomerToPocketBase(newCust);
  };

  const handleUpdateCustomer = (updatedCust: CustomerProfile) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCust.id ? updatedCust : c))
    );
    syncCustomerToPocketBase(updatedCust);
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
  };

  // Cash Transactions State (Frente de Caixa / PDV)
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_cash_tx_v1');
    return saved ? JSON.parse(saved) : INITIAL_CASH_TRANSACTIONS;
  });

  useEffect(() => {
    localStorage.setItem('barbearia_ls_cash_tx_v1', JSON.stringify(cashTransactions));
  }, [cashTransactions]);

  const handleAddCashTransaction = (newTxData: Omit<CashTransaction, 'id' | 'timestamp'>) => {
    const newTx: CashTransaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setCashTransactions((prev) => [newTx, ...prev]);
    syncCashTransactionToPocketBase(newTx);
  };

  // Client Subscription Plans State (Clube de Assinaturas & Recorrência)
  const [clientPlans, setClientPlans] = useState<ClientSubscriptionPlan[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_client_plans_v1');
    return saved ? JSON.parse(saved) : INITIAL_CLIENT_SUBSCRIPTION_PLANS;
  });

  useEffect(() => {
    localStorage.setItem('barbearia_ls_client_plans_v1', JSON.stringify(clientPlans));
  }, [clientPlans]);

  const handleAddClientPlan = (newPlanData: Omit<ClientSubscriptionPlan, 'id' | 'createdAt'>) => {
    const newPlan: ClientSubscriptionPlan = {
      ...newPlanData,
      id: `cplan-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setClientPlans((prev) => [newPlan, ...prev]);
    syncClientSubscriptionPlanToPocketBase(newPlan);
  };

  const handleUpdateClientPlan = (updatedPlan: ClientSubscriptionPlan) => {
    setClientPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
    syncClientSubscriptionPlanToPocketBase(updatedPlan);
  };

  const handleDeleteClientPlan = (planId: string) => {
    setClientPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  // Services State (com persistência e catálogo editável)
  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_services_v1');
    if (saved) {
      try {
        const parsed: Service[] = JSON.parse(saved);
        return parsed.map((s) => {
          if (!s.imageUrl) {
            const init = INITIAL_SERVICES.find((i) => i.id === s.id);
            if (init?.imageUrl) return { ...s, imageUrl: init.imageUrl };
          }
          return s;
        });
      } catch (e) {
        return INITIAL_SERVICES;
      }
    }
    return INITIAL_SERVICES;
  });
  const [selectedServices, setSelectedServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_services_v1');
    const all = saved ? JSON.parse(saved) : INITIAL_SERVICES;
    const firstActive = all.find((s: Service) => s.active !== false);
    return firstActive ? [firstActive] : [all[0]];
  });

  // Barbers State (com persistência e trava de plano)
  const [barbers, setBarbers] = useState<Barber[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_barbers');
    if (saved) {
      try {
        const parsed: Barber[] = JSON.parse(saved);
        const merged = [...parsed];
        INITIAL_BARBERS.forEach((ib) => {
          const idx = merged.findIndex((b) => b.id === ib.id);
          if (idx !== -1) {
            merged[idx] = {
              ...ib,
              ...merged[idx],
              attendanceType: merged[idx].attendanceType || ib.attendanceType,
              acceptsSubscriptionClub:
                merged[idx].acceptsSubscriptionClub !== undefined
                  ? merged[idx].acceptsSubscriptionClub
                  : ib.acceptsSubscriptionClub,
              serviceIds: merged[idx].serviceIds || ib.serviceIds,
            };
          } else {
            merged.push(ib);
          }
        });
        return merged;
      } catch (e) {
        return INITIAL_BARBERS;
      }
    }
    return INITIAL_BARBERS;
  });
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    () => INITIAL_BARBERS[0]?.id || 'barber-leonardo'
  );

  // Date and Time State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedTime, setSelectedTime] = useState<string>('14:00');

  // Customer Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState<boolean>(true);

  // Persistence: Bookings, Blocks, Webhook Logs, Config
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_bookings_v1');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [blocks, setBlocks] = useState<TimeBlock[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_blocks_v1');
    return saved ? JSON.parse(saved) : INITIAL_BLOCKS;
  });

  const [evolutionConfig, setEvolutionConfig] = useState<EvolutionApiConfig>(() => {
    const saved = localStorage.getItem('barbearia_ls_evolution_config');
    return saved ? JSON.parse(saved) : DEFAULT_EVOLUTION_CONFIG;
  });

  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(() => {
    const saved = localStorage.getItem('barbearia_ls_webhook_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Modals
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('barbearia_ls_bookings_v1', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_blocks_v1', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_evolution_config', JSON.stringify(evolutionConfig));
  }, [evolutionConfig]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_webhook_logs', JSON.stringify(webhookLogs));
  }, [webhookLogs]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_barbers', JSON.stringify(barbers));
  }, [barbers]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_tenant_config', JSON.stringify(activeTenant));
  }, [activeTenant]);

  useEffect(() => {
    localStorage.setItem('barbearia_ls_services_v1', JSON.stringify(services));
  }, [services]);

  // Apenas serviços e profissionais ativos para agendamento dos clientes
  const activeServices = useMemo(() => {
    return services.filter((s) => s.active !== false);
  }, [services]);

  const activeBarbers = useMemo(() => {
    return barbers.filter((b) => b.active !== false);
  }, [barbers]);

  // Derived Totals & Subscriber Recognition
  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [selectedServices]);

  // Detecção de cliente assinante e validação de cobertura do plano no agendamento público
  const detectedCustomer = useMemo(() => {
    const cleanCurrent = cleanPhone(customerPhone);
    if (cleanCurrent.length < 10) return null;
    return (
      customers.find(
        (c) =>
          c.tenantId === activeTenant.id &&
          cleanPhone(c.phone) === cleanCurrent
      ) || null
    );
  }, [customerPhone, customers, activeTenant.id]);

  const activeCustomerPlan = useMemo(() => {
    if (
      !detectedCustomer ||
      detectedCustomer.status_assinatura !== 'ativo' ||
      !detectedCustomer.plano_assinatura_id
    ) {
      return null;
    }
    return (
      clientPlans.find(
        (p) =>
          p.id === detectedCustomer.plano_assinatura_id &&
          p.ativo !== false &&
          p.barbearia_id === activeTenant.id
      ) || null
    );
  }, [detectedCustomer, clientPlans, activeTenant.id]);

  // Preenchimento automático do nome ao detectar telefone de cliente cadastrado
  useEffect(() => {
    if (detectedCustomer && !customerName.trim()) {
      setCustomerName(detectedCustomer.name);
    }
  }, [detectedCustomer, customerName]);

  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return new Date().getDay();
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay(); // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  }, [selectedDate]);

  const isDayAllowedForPlan = useMemo(() => {
    if (!activeCustomerPlan) return false;
    return activeCustomerPlan.dias_permitidos.includes(selectedDayOfWeek);
  }, [activeCustomerPlan, selectedDayOfWeek]);

  // Preço total com desconto de 100% nos serviços cobertos pelo plano VIP em dias válidos
  const totalPrice = useMemo(() => {
    if (activeCustomerPlan && isDayAllowedForPlan) {
      return selectedServices.reduce((sum, s) => {
        const isCovered = activeCustomerPlan.servicos_inclusos.includes(s.id);
        return sum + (isCovered ? 0 : s.price);
      }, 0);
    }
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices, activeCustomerPlan, isDayAllowedForPlan]);

  const calculatedEndTime = useMemo(() => {
    if (!selectedTime) return '';
    return addMinutesToTime(selectedTime, totalDurationMinutes || 45);
  }, [selectedTime, totalDurationMinutes]);

  const resolvedBarber = useMemo(() => {
    if (selectedBarberId === 'any') {
      // Find the first barber available for this slot
      const availability = calculateSlotAvailability(
        selectedDate,
        selectedTime || '14:00',
        totalDurationMinutes || 45,
        'any',
        barbers,
        bookings,
        blocks
      );
      if (availability.availableBarberIds.length > 0) {
        return barbers.find((b) => b.id === availability.availableBarberIds[0]) || barbers[0];
      }
      return barbers[0];
    }
    return barbers.find((b) => b.id === selectedBarberId) || barbers[0];
  }, [selectedBarberId, selectedDate, selectedTime, totalDurationMinutes, barbers, bookings, blocks]);

  // Service toggle handler
  const handleToggleService = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        // Keep at least 1 service
        if (prev.length === 1) return prev;
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  // Step navigation rules
  const canProceedFromCurrentStep = useMemo(() => {
    if (currentStep === 1) return selectedServices.length > 0;
    if (currentStep === 2) return Boolean(selectedBarberId);
    if (currentStep === 3) return Boolean(selectedTime);
    if (currentStep === 4) {
      const cleanDigits = cleanPhone(customerPhone);
      return customerName.trim().length >= 2 && cleanDigits.length >= 10;
    }
    return true;
  }, [currentStep, selectedServices, selectedBarberId, selectedTime, customerName, customerPhone]);

  const handleNextStep = () => {
    if (!canProceedFromCurrentStep) return;
    setErrorMessage(null);
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToStep = (stepNumber: number) => {
    setErrorMessage(null);
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Booking Confirmation Handler
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // 1. Double-booking check to prevent race conditions
    const finalAvailability = calculateSlotAvailability(
      selectedDate,
      selectedTime,
      totalDurationMinutes,
      selectedBarberId,
      barbers,
      bookings,
      blocks
    );

    if (!finalAvailability.available) {
      setIsSubmitting(false);
      setErrorMessage(
        `Desculpe! O horário das ${selectedTime} acabou de ser reservado ou bloqueado. Por favor, selecione outro horário.`
      );
      setCurrentStep(3); // return to schedule picker
      return;
    }

    // Determine barber
    const assignedBarber =
      selectedBarberId === 'any'
        ? barbers.find((b) => b.id === finalAvailability.availableBarberIds[0]) || barbers[0]
        : barbers.find((b) => b.id === selectedBarberId) || barbers[0];

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerNotes: customerNotes.trim() || undefined,
      barberId: assignedBarber.id,
      barberName: assignedBarber.name,
      barberAvatar: assignedBarber.avatarUrl,
      services: selectedServices,
      date: selectedDate,
      startTime: selectedTime,
      endTime: calculatedEndTime,
      totalMinutes: totalDurationMinutes,
      totalPrice,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      notifyWhatsApp,
      reminderStatus: 'scheduled',
      webhookDispatched: true,
    };

    // 2. Dispatch Evolution API Webhook
    let newLog: WebhookLog | null = null;
    if (notifyWhatsApp) {
      try {
        newLog = await dispatchEvolutionWebhook('booking.created', newBooking, evolutionConfig);
        setWebhookLogs((prev) => [newLog!, ...prev]);
      } catch (err) {
        console.error('Webhook error:', err);
      }
    }

    // 3. Cadastramento automático do cliente no banco de dados usando o WhatsApp como documento único
    const cleanPhoneInput = cleanDigits(newBooking.customerPhone);
    const existingCust = customers.find(
      (c) => c.tenantId === activeTenant.id && cleanDigits(c.phone) === cleanPhoneInput
    );

    if (!existingCust) {
      const newCust: CustomerProfile = {
        id: `cust-${Date.now()}`,
        tenantId: activeTenant.id,
        name: newBooking.customerName.trim(),
        phone: newBooking.customerPhone,
        notes: newBooking.customerNotes || '',
        totalBookings: 1,
        totalSpent: newBooking.totalPrice,
        total_visitas: 1,
        total_gasto: newBooking.totalPrice,
        lastVisitDate: newBooking.date,
        ultima_visita: newBooking.date,
        favoriteBarberId: newBooking.barberId,
        favoriteBarberName: newBooking.barberName,
        status_assinatura: 'sem_plano',
        createdAt: new Date().toISOString(),
      };
      newBooking.customerId = newCust.id;
      setCustomers((prev) => [newCust, ...prev]);
      syncCustomerToPocketBase(newCust);
    } else {
      newBooking.customerId = existingCust.id;
      const updatedCust: CustomerProfile = {
        ...existingCust,
        name: newBooking.customerName.trim() || existingCust.name,
        totalBookings: (existingCust.totalBookings || 0) + 1,
        totalSpent: (existingCust.totalSpent || 0) + newBooking.totalPrice,
        total_visitas: (existingCust.total_visitas || 0) + 1,
        total_gasto: (existingCust.total_gasto || 0) + newBooking.totalPrice,
        lastVisitDate: newBooking.date,
        ultima_visita: newBooking.date,
        favoriteBarberId: newBooking.barberId,
        favoriteBarberName: newBooking.barberName,
        cortes_utilizados_mes:
          existingCust.status_assinatura === 'ativo' && isDayAllowedForPlan
            ? (existingCust.cortes_utilizados_mes || 0) + 1
            : existingCust.cortes_utilizados_mes || 0,
      };
      handleUpdateCustomer(updatedCust);
    }

    // 3. Update bookings
    setBookings((prev) => [newBooking, ...prev]);
    setIsSubmitting(false);

    // 4. Open success modal
    setConfirmedBooking(newBooking);

    // Reset customer input for clean slate
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setCurrentStep(1);
  };

  // Admin Actions
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) return;

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );

    // If cancelled, dispatch status change webhook
    if (newStatus === 'cancelled') {
      const log = await dispatchEvolutionWebhook(
        'booking.status_changed',
        { ...targetBooking, status: 'cancelled' },
        evolutionConfig
      );
      setWebhookLogs((prev) => [log, ...prev]);
    }
  };

  const handleAddBlock = (blockData: Omit<TimeBlock, 'id' | 'createdAt'>) => {
    const newBlock: TimeBlock = {
      ...blockData,
      id: `blk-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBlocks((prev) => [...prev, newBlock]);
    setIsBlockModalOpen(false);
  };

  const handleAddBlocks = (blocksData: Array<Omit<TimeBlock, 'id' | 'createdAt'>>) => {
    const now = Date.now();
    const newBlocks: TimeBlock[] = blocksData.map((b, idx) => ({
      ...b,
      id: `blk-${now}-${idx}`,
      createdAt: new Date().toISOString(),
    }));
    setBlocks((prev) => [...prev, ...newBlocks]);
    setIsBlockModalOpen(false);
  };

  const handleRemoveBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleTriggerTestReminder = async (booking: Booking) => {
    const log = await dispatchEvolutionWebhook('booking.reminder', booking, evolutionConfig);
    setWebhookLogs((prev) => [log, ...prev]);
  };

  // Barber Management Handlers (com trava de limite por plano)
  const handleAddBarber = (newBarberData: Omit<Barber, 'id'>): boolean => {
    const activeCount = barbers.filter((b) => b.active !== false).length;
    const limite = activeTenant.limite_profissionais ?? activeTenant.max_barbeiros ?? 1;
    // Trava de limite de profissionais por plano / matriz de recursos
    if (activeCount >= limite) {
      return false;
    }
    const id = `barber-${Date.now()}`;
    const newBarber: Barber = {
      ...newBarberData,
      id,
      active: true,
    };
    setBarbers((prev) => [...prev, newBarber]);
    return true;
  };

  const handleUpdateBarber = (updatedBarber: Barber) => {
    setBarbers((prev) => prev.map((b) => (b.id === updatedBarber.id ? updatedBarber : b)));
  };

  const handleDeleteBarber = (barberId: string) => {
    setBarbers((prev) => prev.filter((b) => b.id !== barberId));
  };

  const handleToggleBarberActive = (barberId: string): boolean => {
    const target = barbers.find((b) => b.id === barberId);
    if (!target) return false;
    const isCurrentlyActive = target.active !== false;

    // Se está inativo e quer ativar, checa o teto do plano
    if (!isCurrentlyActive) {
      const activeCount = barbers.filter((b) => b.active !== false).length;
      if (activeCount >= activeTenant.max_barbeiros) {
        return false;
      }
    }

    setBarbers((prev) =>
      prev.map((b) => (b.id === barberId ? { ...b, active: !isCurrentlyActive } : b))
    );
    return true;
  };

  // Services Management Handlers (CRUD & Visibilidade)
  const handleAddService = (newServiceData: Omit<Service, 'id'>) => {
    const id = `srv-${Date.now()}`;
    const newService: Service = {
      ...newServiceData,
      id,
    };
    setServices((prev) => [...prev, newService]);
  };

  const handleUpdateService = (updatedService: Service) => {
    setServices((prev) => prev.map((s) => (s.id === updatedService.id ? updatedService : s)));
    setSelectedServices((prev) =>
      prev.map((s) => (s.id === updatedService.id ? updatedService : s))
    );
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const handleToggleServiceActive = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, active: s.active === false } : s))
    );
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#E4E4E7] flex flex-col selection:bg-[#D4AF37] selection:text-black w-full max-w-full overflow-x-hidden">
      <OfflineIndicator />

      {/* Top Header (Clean customer header or dedicated admin header) */}
      {currentView !== 'super-admin' && currentView !== 'client' && currentView !== 'login' && (
        <Header
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenWebhooks={() => setIsWebhookModalOpen(true)}
          onOpenQRCode={() => setIsQRCodeModalOpen(true)}
          webhookCount={webhookLogs.length}
          brandName={activeTenant.name}
          uiVersion={uiVersion}
          onToggleUiVersion={handleToggleUiVersion}
        />
      )}

      {/* Main Content Area Wrapped with Global Error Boundary */}
      <GlobalErrorBoundary
        activeTenantId={activeTenantId}
        activeTenantName={activeTenant.name}
      >
        <main className={`flex-1 w-full mx-auto transition-all duration-200 ${
          (currentView === 'client' && uiVersion === 'v2') || currentView === 'super-admin' || currentView === 'login'
            ? 'p-0 max-w-full space-y-0'
            : currentView === 'client' || currentView === 'barber'
            ? 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 max-w-2xl sm:max-w-3xl'
            : 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 max-w-[1600px]'
        }`}>
        {currentView === 'login' ? (
          /* Área de Login Segura (Dono / Barbeiro com Logo da Barbearia & Super Admin Master com Logo Branca Naville) */
          <SecureLoginView
            initialPortal={
              typeof window !== 'undefined' &&
              (window.location.pathname.includes('super-admin') ||
               window.location.search.includes('superadmin') ||
               window.location.hash.includes('superadmin'))
                ? 'super-admin'
                : 'tenant'
            }
            initialRole={
              typeof window !== 'undefined' && window.location.pathname.includes('barbeiro')
                ? 'barber'
                : 'owner'
            }
            tenants={tenants}
            activeTenantId={activeTenantId}
            onSelectTenant={setActiveTenantId}
            onLoginSuccess={(newSession, targetView) => {
              setAuthSession(newSession);
              handleNavigate(targetView);
            }}
            onBackToClient={() => handleNavigate('client')}
          />
        ) : currentView === 'super-admin' ? (
          /* Super Admin Panel */
          <SuperAdminDashboard
            tenants={tenants}
            activeTenantId={activeTenantId}
            invoices={invoices}
            plans={SAAS_PLANS}
            invoiceNinjaConfig={ninjaConfig}
            ninjaLogs={ninjaWebhookLogs}
            crmConfig={crmConfig}
            onSelectTenant={handleSelectTenant}
            onUpdateTenant={handleUpdateTenant}
            onAddTenant={handleAddTenant}
            onNavigateView={handleNavigate}
            onUpdateInvoiceNinjaConfig={setNinjaConfig}
            onUpdateCrmConfig={setCrmConfig}
            onTriggerNinjaWebhook={handleTriggerNinjaWebhook}
            onClearNinjaLogs={() => setNinjaWebhookLogs([])}
          />
        ) : currentView === 'barber' ? (
          /* Modo Cadeira - PWA do Barbeiro com RLS & Zero Trust (Isolado e restrito ao Barbeiro) */
          <BarberPwaView
            currentUser={authSession?.user || MOCK_USERS.barber_diego}
            tenant={activeTenant}
            barbers={barbers}
            bookings={bookings}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            isTenantBlocked={activeTenant.status === 'blocked'}
          />
        ) : currentView === 'client' ? (
          /* Check Kill Switch: If tenant is blocked, render blocked customer view */
          activeTenant.status === 'blocked' ? (
            <TenantBlockedCustomerView tenant={activeTenant} />
          ) : uiVersion === 'v2' ? (
            /* NOVA VERSÃO 2.0 (NAVILLE LUXURY SUITE) - ADAPTADA ÀS FUNÇÕES ATUAIS */
            <NavilleLuxuryClientView
              tenantConfig={activeTenant}
              services={services}
              barbers={barbers}
              bookings={bookings}
              blocks={blocks}
              customers={customers.filter((c) => c.tenantId === activeTenant.id)}
              clientPlans={clientPlans.filter((p) => p.barbearia_id === activeTenant.id)}
              onConfirmBooking={async (data) => {
                setIsSubmitting(true);
                setErrorMessage(null);

                // 1. Double-booking check
                const finalAvailability = calculateSlotAvailability(
                  data.date,
                  data.time,
                  data.totalMinutes,
                  data.barber.id,
                  barbers,
                  bookings,
                  blocks
                );

                if (!finalAvailability.available) {
                  setIsSubmitting(false);
                  throw new Error(
                    `O horário das ${data.time} no dia ${data.date} não está mais disponível. Por favor, escolha outro horário.`
                  );
                }

                const calculatedEnd = addMinutesToTime(data.time, data.totalMinutes);

                const newBooking: Booking = {
                  id: `b-${Date.now()}`,
                  customerName: data.customerName,
                  customerPhone: data.customerPhone,
                  customerNotes: data.customerNotes,
                  barberId: data.barber.id,
                  barberName: data.barber.name,
                  barberAvatar: data.barber.avatarUrl,
                  services: data.services,
                  date: data.date,
                  startTime: data.time,
                  endTime: calculatedEnd,
                  totalMinutes: data.totalMinutes,
                  totalPrice: data.totalPrice,
                  status: 'confirmed',
                  createdAt: new Date().toISOString(),
                  notifyWhatsApp: true,
                  reminderStatus: 'scheduled',
                  webhookDispatched: true,
                };

                // 2. Dispatch Evolution API Webhook
                try {
                  const newLog = await dispatchEvolutionWebhook('booking.created', newBooking, evolutionConfig);
                  setWebhookLogs((prev) => [newLog, ...prev]);
                } catch (err) {
                  console.error('Webhook error:', err);
                }

                // 3. Cadastramento automático no banco de dados e vínculo ao número de WhatsApp (documento do cliente)
                const cleanPhoneInput = cleanDigits(data.customerPhone);
                const existingCust = customers.find(
                  (c) => c.tenantId === activeTenant.id && cleanDigits(c.phone) === cleanPhoneInput
                );

                let savedCustomerId: string;

                if (!existingCust) {
                  // Automaticamente cadastra o cliente no banco de dados com o número dele
                  const newCust: CustomerProfile = {
                    id: `cust-${Date.now()}`,
                    tenantId: activeTenant.id,
                    name: data.customerName.trim(),
                    phone: data.customerPhone,
                    notes: data.customerNotes || '',
                    totalBookings: 1,
                    totalSpent: data.totalPrice,
                    total_visitas: 1,
                    total_gasto: data.totalPrice,
                    lastVisitDate: data.date,
                    ultima_visita: data.date,
                    favoriteBarberId: data.barber.id,
                    favoriteBarberName: data.barber.name,
                    status_assinatura: 'sem_plano',
                    createdAt: new Date().toISOString(),
                  };
                  savedCustomerId = newCust.id;
                  newBooking.customerId = newCust.id;
                  setCustomers((prev) => [newCust, ...prev]);
                  syncCustomerToPocketBase(newCust);
                } else {
                  savedCustomerId = existingCust.id;
                  newBooking.customerId = existingCust.id;
                  const updatedCust: CustomerProfile = {
                    ...existingCust,
                    name: data.customerName.trim() || existingCust.name,
                    totalBookings: (existingCust.totalBookings || 0) + 1,
                    totalSpent: (existingCust.totalSpent || 0) + data.totalPrice,
                    total_visitas: (existingCust.total_visitas || 0) + 1,
                    total_gasto: (existingCust.total_gasto || 0) + data.totalPrice,
                    lastVisitDate: data.date,
                    ultima_visita: data.date,
                    favoriteBarberId: data.barber.id,
                    favoriteBarberName: data.barber.name,
                    cortes_utilizados_mes:
                      existingCust.status_assinatura === 'ativo'
                        ? (existingCust.cortes_utilizados_mes || 0) + 1
                        : existingCust.cortes_utilizados_mes || 0,
                  };
                  handleUpdateCustomer(updatedCust);
                }

                // 4. Update bookings state
                setBookings((prev) => [newBooking, ...prev]);
                setIsSubmitting(false);
                setConfirmedBooking(newBooking);
              }}
              uiVersion={uiVersion}
              onToggleUiVersion={handleToggleUiVersion}
              onNavigateToAdmin={() => handleNavigate('admin')}
              onNavigateToBarber={() => handleNavigate('barber')}
              onNavigateToLogin={() => handleNavigate('login')}
            />
          ) : (
            /* VERSÃO 1.0 (CLÁSSICA) - PRESERVADA CASO QUEIRA VOLTAR ATRÁS */
            <div className="space-y-6">
              {/* Banner informativo de versão com botão para testar v2.0 */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Você está na Versão 1.0 (Clássica)
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      Criamos a nova versão 2.0 (Naville Luxury Suite) com novo visual e funções integradas!
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleUiVersion('v2')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B88656] text-[#0F0F11] font-extrabold text-xs tracking-wider uppercase hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
                >
                  Ativar v2.0
                </button>
              </div>

              {/* Hero Atmosphere Banner (Only on Step 1) */}
              {currentStep === 1 && (
                <HeroBanner />
              )}

              {/* Step Progress Bar */}
              <div className="bg-[#18181B] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg">
                <StepIndicator
                  currentStep={currentStep}
                  onStepClick={handleGoToStep}
                />
              </div>

              {/* Error banner if double booking was detected on final submit */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs sm:text-sm animate-in fade-in">
                  {errorMessage}
                </div>
              )}

              {/* Step 1: Services (Apenas ativos no agendamento público) */}
              {currentStep === 1 && (
                <StepServices
                  services={activeServices}
                  selectedServiceIds={selectedServices.map((s) => s.id)}
                  onToggleService={handleToggleService}
                />
              )}

              {/* Step 2: Barber Selection (Apenas ativos) */}
              {currentStep === 2 && (
                <StepBarber
                  barbers={activeBarbers}
                  selectedBarberId={selectedBarberId}
                  onSelectBarber={setSelectedBarberId}
                />
              )}

              {/* Step 3: Date & Time */}
              {currentStep === 3 && (
                <StepDateTime
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  totalDurationMinutes={totalDurationMinutes}
                  totalPrice={totalPrice}
                  selectedBarberId={selectedBarberId}
                  barbers={barbers}
                  bookings={bookings}
                  blocks={blocks}
                  selectedServices={selectedServices}
                  tenantConfig={activeTenant}
                  onSelectDate={setSelectedDate}
                  onSelectTime={setSelectedTime}
                  onSelectServices={setSelectedServices}
                  onSelectBarber={setSelectedBarberId}
                />
              )}

              {/* Step 4: Customer Details */}
              {currentStep === 4 && (
                <StepCustomer
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerNotes={customerNotes}
                  notifyWhatsApp={notifyWhatsApp}
                  activeCustomerPlan={activeCustomerPlan}
                  onChangeName={setCustomerName}
                  onChangePhone={setCustomerPhone}
                  onChangeNotes={setCustomerNotes}
                  onToggleNotify={setNotifyWhatsApp}
                />
              )}

              {/* Step 5: Summary & Confirm */}
              {currentStep === 5 && (
                <StepConfirmation
                  services={selectedServices}
                  barber={resolvedBarber}
                  isAnyBarber={selectedBarberId === 'any'}
                  date={selectedDate}
                  startTime={selectedTime}
                  endTime={calculatedEndTime}
                  totalDurationMinutes={totalDurationMinutes}
                  totalPrice={totalPrice}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerNotes={customerNotes}
                  isSubmitting={isSubmitting}
                  activeCustomerPlan={activeCustomerPlan}
                  isDayAllowedForPlan={isDayAllowedForPlan}
                  selectedDayOfWeek={selectedDayOfWeek}
                  onConfirm={handleConfirmBooking}
                  onBackToStep={handleGoToStep}
                />
              )}

              {/* Natural Reach Zone Floating Footer (Mobile-first Thumb CTA) */}
              <div className="h-20 sm:h-24" />
              <FloatingFooterSummary
                currentStep={currentStep}
                totalSteps={5}
                selectedServicesCount={selectedServices.length}
                totalDurationMinutes={totalDurationMinutes}
                totalPrice={totalPrice}
                canProceed={canProceedFromCurrentStep}
                onNext={handleNextStep}
              />
            </div>
          )
        ) : (
          /* Admin / Barber Panel */
          <AdminScheduleView
            barbers={barbers}
            services={services}
            bookings={bookings}
            blocks={blocks}
            selectedDate={selectedDate}
            evolutionConfig={evolutionConfig}
            tenantConfig={activeTenant}
            invoices={invoices}
            plans={SAAS_PLANS}
            invoiceNinjaConfig={ninjaConfig}
            onPayInvoiceSimulated={handlePayInvoiceSimulated}
            onUpdateTenantConfig={handleUpdateTenant}
            expenses={expenses.filter((e) => e.tenantId === activeTenant.id)}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onToggleExpensePaid={handleToggleExpensePaid}
            customers={customers.filter((c) => c.tenantId === activeTenant.id)}
            cashTransactions={cashTransactions.filter((tx) => tx.tenantId === activeTenant.id)}
            clientPlans={clientPlans}
            onAddClientPlan={handleAddClientPlan}
            onUpdateClientPlan={handleUpdateClientPlan}
            onDeleteClientPlan={handleDeleteClientPlan}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onAddCashTransaction={handleAddCashTransaction}
            onSelectDate={setSelectedDate}
            onUpdateStatus={handleUpdateBookingStatus}
            onOpenBlockModal={() => setIsBlockModalOpen(true)}
            onUpdateEvolutionConfig={setEvolutionConfig}
            onAddBarber={handleAddBarber}
            onUpdateBarber={handleUpdateBarber}
            onDeleteBarber={handleDeleteBarber}
            onToggleBarberActive={handleToggleBarberActive}
            onAddService={handleAddService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
            onToggleServiceActive={handleToggleServiceActive}
            onNavigateClient={() => handleNavigate('client')}
          />
        )}
        </main>
      </GlobalErrorBoundary>

      {/* Success Modal with WhatsApp direct trigger */}
      {confirmedBooking && (
        <BookingSuccessModal
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
        />
      )}

      {/* Quick Time Block Modal */}
      {isBlockModalOpen && (
        <QuickTimeBlockModal
          barbers={activeBarbers}
          activeBlocks={blocks.filter((b) => b.date === selectedDate)}
          selectedDate={selectedDate}
          tenantPlan={activeTenant.plan}
          maxBarbers={activeTenant.max_barbeiros || 1}
          onClose={() => setIsBlockModalOpen(false)}
          onAddBlock={handleAddBlock}
          onAddBlocks={handleAddBlocks}
          onRemoveBlock={handleRemoveBlock}
        />
      )}

      {/* Webhook & Evolution API Simulator Modal */}
      {isWebhookModalOpen && (
        <WebhookMonitorModal
          logs={webhookLogs}
          config={evolutionConfig}
          bookings={bookings}
          onClose={() => setIsWebhookModalOpen(false)}
          onUpdateConfig={setEvolutionConfig}
          onTriggerTestReminder={handleTriggerTestReminder}
          onClearLogs={() => setWebhookLogs([])}
        />
      )}

      {/* QR Code Modal for Instant Mobile Testing */}
      {isQRCodeModalOpen && (
        <QRCodeModal onClose={() => setIsQRCodeModalOpen(false)} />
      )}

      {/* Notificações e Toasts Refinados para Usuário Final */}
      <UserFriendlyToast />

      {/* Modal de Autenticação Segura & Troca de Papéis (RBAC / WhatsApp OTP) */}
      <BarberLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(newSession) => {
          setAuthSession(newSession);
          setIsLoginModalOpen(false);
        }}
        tenants={tenants}
      />

      {/* Quiet Footer */}
      {currentView !== 'super-admin' && currentView !== 'client' && currentView !== 'login' && (
        <footer className="py-6 border-t border-white/5 text-center text-xs text-zinc-500 w-full overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentView === 'super-admin' ? (
              <>
                <span className="font-display font-bold text-[#D4AF37] tracking-wider">NAVILLE</span>
                <span>·</span>
                <span>Plataforma SaaS Multi-tenant</span>
              </>
            ) : currentView === 'barber' ? (
              <>
                <span className="font-display font-bold text-zinc-300">MODO CADEIRA</span>
                <span>·</span>
                <span className="text-[#D4AF37]/90 font-medium">PWA do Barbeiro</span>
              </>
            ) : (
              <>
                <span className="font-display font-bold text-zinc-300">{activeTenant.name || 'NAVILLE BARBER'}</span>
                <span>·</span>
                <span className="text-[#D4AF37]/90 font-medium">Powered by Naville</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-zinc-500 text-[11px]">
            {currentView === 'super-admin' ? (
              <>
                <button
                  onClick={() => handleNavigate('barber')}
                  className="hover:text-amber-400 transition cursor-pointer underline text-amber-400/90 hover:text-amber-300"
                >
                  Modo Cadeira (/barbeiro)
                </button>
                <span>·</span>
                <button
                  onClick={() => handleNavigate('admin')}
                  className="hover:text-amber-400 transition cursor-pointer underline text-amber-400/90 hover:text-amber-300"
                >
                  Painel da Barbearia (/admin)
                </button>
                <span>·</span>
                <button
                  onClick={() => handleNavigate('client')}
                  className="hover:text-amber-400 transition cursor-pointer underline text-zinc-500 hover:text-zinc-300"
                >
                  Agendamento do Cliente
                </button>
                <span>·</span>
                <span>© {new Date().getFullYear()} Naville SaaS</span>
              </>
            ) : currentView === 'barber' ? (
              <>
                <span className="text-zinc-400 font-medium">Terminal do Profissional · Sessão Ativa</span>
                <span>·</span>
                <span>© {new Date().getFullYear()} {activeTenant.name || 'Naville Barber'}</span>
              </>
            ) : currentView === 'admin' ? (
              <>
                <button
                  onClick={() => handleNavigate('barber')}
                  className="hover:text-amber-400 transition cursor-pointer underline text-amber-400/90 hover:text-amber-300"
                >
                  Modo Cadeira (/barbeiro)
                </button>
                <span>·</span>
                <button
                  onClick={() => handleNavigate('client')}
                  className="hover:text-amber-400 transition cursor-pointer underline text-zinc-500 hover:text-zinc-300"
                >
                  ← Ver Agendamento do Cliente
                </button>
                <span>·</span>
                <span>© {new Date().getFullYear()} {activeTenant.name || 'Naville Barber'}</span>
              </>
            ) : (
              <>
                <span className="text-zinc-500 font-medium">Agendamento Online 24h</span>
                <span>·</span>
                <span>© {new Date().getFullYear()} Todos os direitos reservados para Naville Barber</span>
              </>
            )}
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
