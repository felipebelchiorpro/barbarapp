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
import { SERVER_INITIAL_TENANTS } from './server/mockServerData';
import { TenantBlockedCustomerView } from './components/SuperAdmin/TenantBlockedCustomerView';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { UserFriendlyToast } from './components/UserFriendlyToast';
import { initGlobalErrorInterceptors } from './services/systemErrorLogService';
import { BarberPwaView } from './components/BarberPwa/BarberPwaView';
import { BarberLoginModal } from './components/BarberPwa/BarberLoginModal';
import { SecureLoginView } from './components/Auth/SecureLoginView';
import { createEvolutionInstance } from './services/evolutionApi';
import { generatePixCopyPaste } from './services/invoiceNinjaService';
import { getActiveSession, clearAuthSession, MOCK_USERS } from './services/authService';
import { AuthSession } from './types';
import { NavilleLuxuryClientView } from './components/LuxurySuite/NavilleLuxuryClientView';
import { NavilleSaasLandingPage } from './components/Landing/NavilleSaasLandingPage';
import { Crown, Scissors, CheckCircle, Sparkles } from 'lucide-react';
import { fetchTimeBlocks, createTimeBlock, deleteTimeBlock } from './services/blockService';
import {
  schedulePostCutWhatsAppMessage,
  sendBookingConfirmationWhatsApp,
} from './services/whatsappAutomationService';

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
  INITIAL_PRODUCTS,
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
  Product,
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
  // Suporta tanto /b/:slug quanto /db/:slug (e sub-rotas /b/:slug/admin, /b/:slug/barbeiro, /b/:slug/login)
  const match = path.match(/^\/(?:b|db)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  const params = new URLSearchParams(window.location.search);
  const paramSlug = params.get('b') || params.get('db') || params.get('slug') || params.get('tenant');
  if (paramSlug) return paramSlug.toLowerCase();
  return null;
}

export type AppViewMode = 'landing' | 'client' | 'admin' | 'super-admin' | 'barber' | 'login';

function checkUrlView(): AppViewMode {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  // Super Admin tem prioridade máxima
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

  // Rotas com slug (/b/:slug ou /db/:slug) e suas sub-rotas de Dono, Barbeiro e Cliente
  const slugMatch = path.match(/^\/(?:b|db)\/([a-zA-Z0-9_-]+)(?:\/(.*))?$/i);
  if (slugMatch) {
    const subRoute = (slugMatch[2] || '').toLowerCase();
    if (
      subRoute.startsWith('admin') ||
      subRoute.startsWith('painel') ||
      subRoute.startsWith('dono') ||
      hash.includes('admin') ||
      hash.includes('painel')
    ) {
      return 'admin';
    }
    if (
      subRoute.startsWith('barbeiro') ||
      subRoute.startsWith('barber') ||
      subRoute.startsWith('cadeira') ||
      subRoute.startsWith('pwa') ||
      hash.includes('barbeiro') ||
      hash.includes('cadeira')
    ) {
      return 'barber';
    }
    if (
      subRoute.startsWith('login') ||
      subRoute.startsWith('entrar') ||
      subRoute.startsWith('acesso') ||
      hash.includes('login')
    ) {
      return 'login';
    }
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

  // Se houver query param de barbearia (?b=slug ou ?slug=slug), abre visão do cliente
  const urlSlug = extractSlugFromUrl();
  if (urlSlug) {
    return 'client';
  }

  // Domínio raiz principal (https://navillebarber.pro/) -> Landing Page Oficial de Venda SaaS
  return 'landing';
}

export default function App() {
  // Navigation View (auto-detects /, /b/:slug, /super-admin, /admin, /barbeiro, /login)
  const [currentView, setCurrentView] = useState<AppViewMode>(() => {
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

  // Multi-Tenant State (Gerenciado pelo Super Admin e sincronizado com PocketBase Cloud State)
  const [tenants, setTenants] = useState<TenantConfig[]>(() => {
    const saved = localStorage.getItem('naville_tenants_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_TENANTS;
  });

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlSlug = extractSlugFromUrl();
      const savedRaw = localStorage.getItem('naville_tenants_v2_prod');
      const currentList: TenantConfig[] = savedRaw ? JSON.parse(savedRaw) : INITIAL_TENANTS;
      if (urlSlug) {
        const found = currentList.find((t) => t.slug === urlSlug || t.id === urlSlug);
        if (found) return found.id;
      }
      if (currentList[0]) return currentList[0].id;
    }
    return DEFAULT_TENANT_CONFIG.id;
  });

  // Save tenants
  useEffect(() => {
    localStorage.setItem('naville_tenants_v2_prod', JSON.stringify(tenants));
  }, [tenants]);

  // Active tenant derived (also matches URL slug if activeTenantId wasn't updated yet)
  const activeTenant = useMemo(() => {
    const urlSlug = extractSlugFromUrl();
    if (urlSlug) {
      const bySlug = tenants.find((t) => t.slug === urlSlug || t.id === urlSlug);
      if (bySlug) return bySlug;
    }
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
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [tenants]);

  const handleNavigate = (view: AppViewMode, slug?: string) => {
    if (slug) {
      const found = tenants.find((t) => t.slug === slug || t.id === slug);
      if (found) {
        setActiveTenantId(found.id);
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const currentSlug = slug || extractSlugFromUrl() || activeTenant?.slug || '';
    const targetPath =
      view === 'landing'
        ? '/'
        : view === 'super-admin'
        ? '/super-admin'
        : view === 'admin'
        ? currentSlug
          ? `/b/${currentSlug}/admin`
          : '/painel'
        : view === 'barber'
        ? currentSlug
          ? `/b/${currentSlug}/barbeiro`
          : '/barbeiro'
        : view === 'login'
        ? currentSlug
          ? `/b/${currentSlug}/login`
          : '/login'
        : currentSlug
        ? `/b/${currentSlug}`
        : '/';
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
  const [paymentSuccessModal, setPaymentSuccessModal] = useState<{
    isOpen: boolean;
    nextDate: string;
    invoiceNumber: string;
    tenantName: string;
  } | null>(null);

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

  // Geração de Fatura Central pelo Super Admin para aparecer no Painel da Barbearia
  const handleGenerateInvoice = (
    targetTenant: TenantConfig,
    amount: number,
    dueDate: string,
    description: string
  ) => {
    const invId = `inv-${Date.now()}`;
    const invoiceNumber = `FAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const pixPayload = generatePixCopyPaste({ id: invId, invoiceNumber, amount, tenantId: targetTenant.id, tenantName: targetTenant.name, status: 'pending', issueDate: new Date().toISOString(), dueDate: new Date(dueDate).toISOString() });

    const newInvoice: Invoice = {
      id: invId,
      invoiceNumber,
      tenantId: targetTenant.id,
      tenantName: targetTenant.name,
      amount,
      status: 'pending',
      issueDate: new Date().toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      pixCopyPaste: pixPayload,
      description: description || `Assinatura Mensal SaaS Naville Barber - Plano ${targetTenant.plan.toUpperCase()}`,
      lineItems: [
        {
          id: `li-${Date.now()}`,
          description: description || `Assinatura Mensal SaaS Naville Barber - Plano ${targetTenant.plan.toUpperCase()}`,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
      ],
      billingHistory: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'pending',
          message: 'Fatura emitida pela governança central Super Admin.',
        },
      ],
    };

    setInvoices((prev) => [newInvoice, ...prev]);

    // Atualiza próximo vencimento e vínculo da fatura no cadastro da barbearia
    const updatedTenant: TenantConfig = {
      ...targetTenant,
      currentInvoiceId: invId,
      nextBillingDate: new Date(dueDate).toISOString(),
      status_assinatura: 'ativo',
    };
    handleUpdateTenant(updatedTenant);
  };

  const handleAddTenant = (newTenant: TenantConfig) => {
    const rawInstance = newTenant.instanceName || `barbearia_${newTenant.slug || newTenant.id}`;
    const cleanInstance = rawInstance.startsWith('naville_')
      ? rawInstance
      : `naville_${rawInstance.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

    const cleanTenant: TenantConfig = {
      ...newTenant,
      instanceName: cleanInstance,
      whatsappStatus: 'close',
      is_vitalicio: newTenant.plan === 'partner' || newTenant.status === 'partner' || newTenant.is_vitalicio,
    };

    setTenants((prev) => [cleanTenant, ...prev]);
    setActiveTenantId(cleanTenant.id);
    syncTenantToPocketBase(cleanTenant);

    // Inicializa WhatsApp isolado e limpo (sem número de outra barbearia)
    setEvolutionConfigsByTenant((prev) => {
      const updated = {
        ...prev,
        [cleanTenant.id]: {
          baseUrl: '',
          apiKey: '4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1',
          instanceName: cleanInstance,
          autoSendEnabled: true,
          reminderHoursBefore: 2,
          connectionStatus: 'close' as const,
          qrcode: undefined,
          number: undefined,
          profileName: undefined,
        },
      };
      localStorage.setItem('naville_evolution_configs_by_tenant_v2', JSON.stringify(updated));
      return updated;
    });

    dispatchCrmWebhook(
      'saas.lead.cadastro_iniciado',
      buildCrmEventPayload('saas.lead.cadastro_iniciado', { tenant: cleanTenant }),
      crmConfig
    );

    createEvolutionInstance({
      baseUrl: '',
      apiKey: '4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1',
      instanceName: cleanInstance,
      autoSendEnabled: true,
      reminderHoursBefore: 2,
    }).catch((err) => console.warn('[Evolution API] Auto-provisioning em background:', err));
  };

  const handleSelectTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
  };

  // Invoice Ninja & Billing State (Módulo 3)
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('naville_invoices_v2_prod');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_INVOICES;
      }
    }
    return INITIAL_INVOICES;
  });

  const [ninjaConfig, setNinjaConfig] = useState<InvoiceNinjaConfig>(() => {
    const saved = localStorage.getItem('naville_ninja_config_v2_prod');
    return saved ? JSON.parse(saved) : DEFAULT_INVOICE_NINJA_CONFIG;
  });

  const [ninjaWebhookLogs, setNinjaWebhookLogs] = useState<InvoiceNinjaWebhookLog[]>(() => {
    const saved = localStorage.getItem('naville_ninja_logs_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_NINJA_WEBHOOK_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('naville_invoices_v2_prod', JSON.stringify(invoices));
  }, [invoices]);

  // Escuta retorno automático de pagamento da Stripe (?stripe_payment=success ou ?session_id=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const stripePayment = urlParams.get('stripe_payment');
    const sessionId = urlParams.get('session_id') || urlParams.get('stripe_session_id');

    if (stripePayment === 'success' || sessionId) {
      const paidTimestamp = new Date().toISOString();

      setInvoices((prev) => {
        let updated = false;
        const nextInvoices = prev.map((inv) => {
          if (inv.tenantId === activeTenant.id && (inv.status === 'pending' || inv.status === 'overdue') && !updated) {
            updated = true;
            return {
              ...inv,
              status: 'paid' as const,
              paidAt: paidTimestamp,
              pago_em: paidTimestamp,
              paymentMethod: 'stripe' as const,
              stripePaymentId: sessionId || `cs_test_${Date.now()}`,
            };
          }
          return inv;
        });

        if (!updated) {
          const newPaidInv: Invoice = {
            id: `inv-stripe-${Date.now()}`,
            tenantId: activeTenant.id,
            tenantName: activeTenant.name,
            invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            amount: activeTenant.plan === 'starter' ? 99.9 : activeTenant.plan === 'enterprise' ? 149.9 : 89.9,
            status: 'paid',
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
            paidAt: paidTimestamp,
            paymentMethod: 'stripe',
            stripePaymentId: sessionId || `cs_test_${Date.now()}`,
            items: [
              {
                description: `Assinatura SaaS Plano ${activeTenant.plan.toUpperCase()} - Pago via Stripe`,
                quantity: 1,
                unitPrice: activeTenant.plan === 'starter' ? 99.9 : 89.9,
                total: activeTenant.plan === 'starter' ? 99.9 : 89.9,
              },
            ],
          };
          nextInvoices.unshift(newPaidInv);
        }

        localStorage.setItem('barbearia_ls_invoices_v1', JSON.stringify(nextInvoices));
        return nextInvoices;
      });

      // Atualiza o tenant para ativo com renovação de 30 dias
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const invNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      setTenants((prevTenants) =>
        prevTenants.map((t) =>
          t.id === activeTenant.id
            ? {
                ...t,
                status: 'active',
                status_assinatura: 'ativo',
                nextBillingDate: nextDateStr,
                data_proximo_vencimento: nextDateStr,
              }
            : t
        )
      );

      // Reconcilia imediatamente no backend PocketBase via Cloud State
      if (sessionId) {
        fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
          .then((res) => res.json())
          .then((data) => {
            console.log('[Stripe Verify Session Retorno Backend]', data);
          })
          .catch((err) => {
            console.warn('[Stripe Verify Session Erro Backend]', err);
          });
      }

      // Abre modal de celebração e confirmação visual para o usuário
      setPaymentSuccessModal({
        isOpen: true,
        nextDate: nextDateStr,
        invoiceNumber: invNum,
        tenantName: activeTenant.name || 'Sua Barbearia',
      });

      // Limpa os parâmetros de busca da URL para não reprocessar no refresh
      const cleanUrl = window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [activeTenant.id]);

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

  const handlePayInvoiceSimulated = (invoiceId: string, method: 'pix' | 'stripe' = 'pix') => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const paidTimestamp = new Date().toISOString();
    const updatedInvoices = invoices.map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            status: 'paid' as const,
            paidAt: paidTimestamp,
            pago_em: paidTimestamp,
            paymentMethod: method,
            stripePaymentId: method === 'stripe' ? (inv.stripePaymentId || `cs_test_${Date.now()}`) : undefined,
          }
        : inv
    );

    setInvoices(updatedInvoices);

    // Atualiza status do tenant para active imediatamente
    setTenants((prev) =>
      prev.map((t) =>
        t.id === invoice.tenantId
          ? {
              ...t,
              status: 'active',
              status_assinatura: 'ativo',
            }
          : t
      )
    );

    handleTriggerNinjaWebhook({
      eventType: 'invoice.paid',
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      amount: invoice.amount,
    });

    // PUSH IMEDIATO PARA CLOUD-STATE para sincronizar celulares e notebooks no mesmo segundo
    fetch('/api/barbearia/cloud-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: {
          tenants: tenants.map((t) => (t.id === invoice.tenantId ? { ...t, status: 'active', status_assinatura: 'ativo' } : t)),
          barbers,
          services,
          bookings,
          blocks,
          customers,
          expenses,
          cashTransactions,
          clientPlans,
          products,
          invoices: updatedInvoices,
          updatedAt: paidTimestamp,
        },
      }),
    }).catch(() => {});
  };

  // Expenses State (Controle de Gastos & Fluxo de Caixa)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('naville_expenses_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  useEffect(() => {
    localStorage.setItem('naville_expenses_v2_prod', JSON.stringify(expenses));
  }, [expenses]);

  const handleAddExpense = (newExpData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}`,
      tenantId: activeTenant.id,
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
    const saved = localStorage.getItem('naville_customers_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  useEffect(() => {
    localStorage.setItem('naville_customers_v2_prod', JSON.stringify(customers));
  }, [customers]);

  const handleAddCustomer = (newCustData: Omit<CustomerProfile, 'id' | 'createdAt'>) => {
    const newCust: CustomerProfile = {
      ...newCustData,
      id: `cust-${Date.now()}`,
      tenantId: activeTenant.id,
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
    const saved = localStorage.getItem('naville_cash_tx_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_CASH_TRANSACTIONS;
  });

  useEffect(() => {
    localStorage.setItem('naville_cash_tx_v2_prod', JSON.stringify(cashTransactions));
  }, [cashTransactions]);

  const handleAddCashTransaction = (newTxData: Omit<CashTransaction, 'id' | 'timestamp'>) => {
    const newTx: CashTransaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
      tenantId: activeTenant.id,
      timestamp: new Date().toISOString(),
    };
    setCashTransactions((prev) => [newTx, ...prev]);
    syncCashTransactionToPocketBase(newTx);
  };

  // Client Subscription Plans State (Clube de Assinaturas & Recorrência)
  const [clientPlans, setClientPlans] = useState<ClientSubscriptionPlan[]>(() => {
    const saved = localStorage.getItem('naville_client_plans_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_CLIENT_SUBSCRIPTION_PLANS;
  });

  useEffect(() => {
    localStorage.setItem('naville_client_plans_v2_prod', JSON.stringify(clientPlans));
  }, [clientPlans]);

  const handleAddClientPlan = (newPlanData: Omit<ClientSubscriptionPlan, 'id' | 'createdAt'>) => {
    const newPlan: ClientSubscriptionPlan = {
      ...newPlanData,
      id: `cplan-${Date.now()}`,
      barbearia_id: activeTenant.id,
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

  // Products State (Produtos & Estoque Interno da Barbearia - NÃO aparecem no agendamento do cliente)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('naville_products_v2_prod');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PRODUCTS;
      }
    }
    return INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem('naville_products_v2_prod', JSON.stringify(products));
  }, [products]);

  const handleAddProduct = (newProdData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...newProdData,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)));
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleAdjustProductStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stockQuantity: Math.max(0, (p.stockQuantity || 0) + delta) }
          : p
      )
    );
  };

  // Services State (com persistência e catálogo editável)
  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('naville_services_v2_prod');
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
    const saved = localStorage.getItem('naville_services_v2_prod');
    const all = saved ? JSON.parse(saved) : INITIAL_SERVICES;
    const firstActive = all.find((s: Service) => s.active !== false);
    return firstActive ? [firstActive] : [all[0]];
  });

  // Barbers State (com persistência e trava de plano)
  const [barbers, setBarbers] = useState<Barber[]>(() => {
    const saved = localStorage.getItem('naville_barbers_v2_prod');
    if (saved) {
      try {
        return JSON.parse(saved);
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
    const saved = localStorage.getItem('naville_bookings_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [blocks, setBlocks] = useState<TimeBlock[]>(() => {
    const saved = localStorage.getItem('naville_blocks_v2_prod');
    return saved ? JSON.parse(saved) : INITIAL_BLOCKS;
  });

  const [evolutionConfigsByTenant, setEvolutionConfigsByTenant] = useState<Record<string, EvolutionApiConfig>>(() => {
    const saved = localStorage.getItem('naville_evolution_configs_by_tenant_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          for (const k of Object.keys(parsed)) {
            if (parsed[k]?.baseUrl && (parsed[k].baseUrl.includes('evolution-api') || parsed[k].baseUrl.includes(':8080'))) {
              parsed[k].baseUrl = '';
            }
          }
          return parsed;
        }
      } catch (_) {}
    }
    return {};
  });

  const activeEvolutionConfig: EvolutionApiConfig = useMemo(() => {
    if (evolutionConfigsByTenant[activeTenant.id]) {
      return evolutionConfigsByTenant[activeTenant.id];
    }
    const cleanInstance = `naville_${(activeTenant.slug || activeTenant.id).replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    return {
      baseUrl: '',
      apiKey: '4f89d3a1b72e5c9f0861ab4e3c7d92f15082e6da19743c5b8df2194a860eb3c1',
      instanceName: cleanInstance,
      autoSendEnabled: true,
      reminderHoursBefore: 2,
      connectionStatus: 'close',
      qrcode: undefined,
      number: undefined,
      profileName: undefined,
    };
  }, [evolutionConfigsByTenant, activeTenant.id, activeTenant.slug]);

  const handleUpdateEvolutionConfig = (newCfg: EvolutionApiConfig) => {
    setEvolutionConfigsByTenant((prev) => {
      const updated = { ...prev, [activeTenant.id]: newCfg };
      localStorage.setItem('naville_evolution_configs_by_tenant_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const evolutionConfig = activeEvolutionConfig;
  const setEvolutionConfig = handleUpdateEvolutionConfig;

  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(() => {
    const saved = localStorage.getItem('naville_webhook_logs_v2_prod');
    return saved ? JSON.parse(saved) : [];
  });

  // ==============================================================================
  // ISOLAMENTO MULTI-TENANT: Dados Filtrados Estritamente por Barbearia Ativa
  // Garante que uma nova barbearia inicie com ZERO serviços, ZERO clientes e ZERO barbeiros
  // ==============================================================================
  const activeTenantServices = useMemo(() => {
    return services.filter((s) => s.tenantId === activeTenant.id || (!s.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [services, activeTenant.id]);

  const activeTenantBarbers = useMemo(() => {
    return barbers.filter((b) => b.tenantId === activeTenant.id || (!b.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [barbers, activeTenant.id]);

  const activeTenantBookings = useMemo(() => {
    return bookings.filter((b) => b.tenantId === activeTenant.id || (!b.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [bookings, activeTenant.id]);

  const activeTenantBlocks = useMemo(() => {
    return blocks.filter((b) => b.tenantId === activeTenant.id || (!b.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [blocks, activeTenant.id]);

  const activeTenantCustomers = useMemo(() => {
    return customers.filter((c) => c.tenantId === activeTenant.id || (!c.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [customers, activeTenant.id]);

  const activeTenantExpenses = useMemo(() => {
    return expenses.filter((e) => e.tenantId === activeTenant.id || (!e.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [expenses, activeTenant.id]);

  const activeTenantCashTransactions = useMemo(() => {
    return cashTransactions.filter((tx) => tx.tenantId === activeTenant.id || (!tx.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [cashTransactions, activeTenant.id]);

  const activeTenantClientPlans = useMemo(() => {
    return clientPlans.filter((p) => p.barbearia_id === activeTenant.id || (!p.barbearia_id && activeTenant.id === 'tenant-barbearia-ls'));
  }, [clientPlans, activeTenant.id]);

  const activeTenantProducts = useMemo(() => {
    return products.filter((p) => p.tenantId === activeTenant.id || (!p.tenantId && activeTenant.id === 'tenant-barbearia-ls'));
  }, [products, activeTenant.id]);

  // Modals
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [blockModalBarberId, setBlockModalBarberId] = useState<string | undefined>(undefined);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cloudLoaded, setCloudLoaded] = useState<boolean>(false);

  // Sincronização automática com Stripe Live para compensar novas faturas pagas
  useEffect(() => {
    fetch('/api/stripe/sync-recent-payments')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res && res.success && res.syncedCount > 0) {
          // Recarrega o cloud-state atualizado
          fetch('/api/barbearia/cloud-state')
            .then((r) => (r.ok ? r.json() : null))
            .then((csRes) => {
              if (csRes && csRes.success && csRes.state) {
                let st = csRes.state;
                if (Array.isArray(st) && typeof st[0] === 'number') {
                  try {
                    let s = '';
                    for (let i = 0; i < st.length; i++) s += String.fromCharCode(st[i]);
                    st = JSON.parse(decodeURIComponent(escape(s)));
                  } catch (_) {}
                }
                if (st && Array.isArray(st.invoices)) setInvoices(st.invoices);
                if (st && Array.isArray(st.tenants)) setTenants(st.tenants);
              }
            }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

    // Sincronização Cloud State (PocketBase) para funcionar entre celular e notebook em tempo real
  useEffect(() => {
    fetch('/api/barbearia/cloud-state')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res && res.success && res.state) {
          let st = res.state;
          if (Array.isArray(st) && typeof st[0] === 'number') {
            try {
              let s = '';
              for (let i = 0; i < st.length; i++) s += String.fromCharCode(st[i]);
              st = JSON.parse(decodeURIComponent(escape(s)));
            } catch (_) {
              try {
                let s = '';
                for (let i = 0; i < st.length; i++) s += String.fromCharCode(st[i]);
                st = JSON.parse(s);
              } catch (_) {}
            }
          } else if (typeof st === 'string') {
            try { st = JSON.parse(st); } catch (_) {}
          }
          if (st && typeof st === 'object') {
          if (Array.isArray(st.tenants)) {
            setTenants(st.tenants);
            const urlSlug = extractSlugFromUrl();
            if (urlSlug) {
              const found = st.tenants.find((t: TenantConfig) => t.slug === urlSlug || t.id === urlSlug);
              if (found) setActiveTenantId(found.id);
            } else if (st.tenants[0]) {
              setActiveTenantId((prev) =>
                st.tenants.some((t: TenantConfig) => t.id === prev) ? prev : st.tenants[0].id
              );
            }
          }
          if (Array.isArray(st.barbers) && st.barbers.length > 0) setBarbers(st.barbers);
          if (Array.isArray(st.services) && st.services.length > 0) setServices(st.services);
          if (Array.isArray(st.bookings)) setBookings(st.bookings);
          if (Array.isArray(st.blocks)) setBlocks(st.blocks);
          if (Array.isArray(st.customers)) setCustomers(st.customers);
          if (Array.isArray(st.expenses)) setExpenses(st.expenses);
          if (Array.isArray(st.cashTransactions)) setCashTransactions(st.cashTransactions);
          if (Array.isArray(st.clientPlans) && st.clientPlans.length > 0) setClientPlans(st.clientPlans);
          if (Array.isArray(st.products) && st.products.length > 0) setProducts(st.products);
          if (Array.isArray(st.invoices)) setInvoices(st.invoices);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setCloudLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!cloudLoaded) return;
    const timer = setTimeout(() => {
      fetch('/api/barbearia/cloud-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: {
            tenants,
            barbers,
            services,
            bookings,
            blocks,
            customers,
            expenses,
            cashTransactions,
            clientPlans,
            products,
            invoices,
            updatedAt: new Date().toISOString(),
          },
        }),
      }).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [
    cloudLoaded,
    tenants,
    barbers,
    services,
    bookings,
    blocks,
    customers,
    expenses,
    cashTransactions,
    clientPlans,
    products,
  ]);

  // Sincroniza bloqueios de horários do PocketBase para a barbearia ativa
  useEffect(() => {
    if (activeTenant?.id) {
      fetchTimeBlocks(activeTenant.id).then((serverBlocks) => {
        if (serverBlocks && serverBlocks.length > 0) {
          setBlocks(serverBlocks);
        }
      });
    }
  }, [activeTenant?.id]);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('naville_bookings_v2_prod', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('naville_blocks_v2_prod', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('naville_evolution_config_v2_prod', JSON.stringify(evolutionConfig));
  }, [evolutionConfig]);

  useEffect(() => {
    localStorage.setItem('naville_webhook_logs_v2_prod', JSON.stringify(webhookLogs));
  }, [webhookLogs]);

  useEffect(() => {
    localStorage.setItem('naville_barbers_v2_prod', JSON.stringify(barbers));
  }, [barbers]);

  useEffect(() => {
    localStorage.setItem('naville_tenant_config_v2_prod', JSON.stringify(activeTenant));
  }, [activeTenant]);

  useEffect(() => {
    localStorage.setItem('naville_services_v2_prod', JSON.stringify(services));
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

    // 2. Dispatch Evolution API Webhook & Confirmação Real de Agendamento WhatsApp + Lembrete 2h
    let newLog: WebhookLog | null = null;
    if (notifyWhatsApp) {
      try {
        newLog = await dispatchEvolutionWebhook('booking.created', newBooking, evolutionConfig);
        setWebhookLogs((prev) => [newLog!, ...prev]);
      } catch (err) {
        console.error('Webhook error:', err);
      }
      sendBookingConfirmationWhatsApp({
        barbearia_id: activeTenant.id,
        barbearia_nome: activeTenant.name,
        agendamento_id: newBooking.id,
        cliente_nome: newBooking.customerName,
        cliente_telefone: newBooking.customerPhone,
        barbeiro_nome: newBooking.barberName,
        servico_nome: newBooking.services.map((s) => s.name).join(' + '),
        horario: newBooking.startTime,
        data: newBooking.date,
      }).catch((err) => {
        console.warn('[WhatsApp] Erro não bloqueante ao enviar confirmação de agendamento:', err);
      });
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

    // Se o barbeiro ou dono finalizou o atendimento (pelo celular ou notebook),
    // agenda automaticamente a mensagem Pós-Corte para daqui a 30 minutos!
    if (newStatus === 'completed' && targetBooking.status !== 'completed') {
      const servicoNomes =
        targetBooking.services && targetBooking.services.length > 0
          ? targetBooking.services.map((s) => s.name).join(' + ')
          : 'Corte';

      schedulePostCutWhatsAppMessage({
        barbearia_id: activeTenant.id,
        agendamento_id: targetBooking.id,
        cliente_nome: targetBooking.customerName,
        cliente_telefone: targetBooking.customerPhone,
        barbeiro_nome: targetBooking.barberName,
        servico_nome: servicoNomes,
        horario: targetBooking.startTime,
        data: targetBooking.date,
        delay_minutos: 30,
      }).catch((err) => {
        console.warn('[PostCut] Erro não bloqueante ao agendar mensagem pós-corte:', err);
      });
    }

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

  const handleOpenBlockModal = (barberId?: string) => {
    setBlockModalBarberId(typeof barberId === 'string' ? barberId : undefined);
    setIsBlockModalOpen(true);
  };

  const handleAddBlock = async (blockData: Omit<TimeBlock, 'id' | 'createdAt'>) => {
    const saved = await createTimeBlock(activeTenant.id, blockData);
    setBlocks((prev) => [...prev, saved]);
    setIsBlockModalOpen(false);
    setBlockModalBarberId(undefined);
  };

  const handleAddBlocks = async (blocksData: Array<Omit<TimeBlock, 'id' | 'createdAt'>>) => {
    const savedList: TimeBlock[] = [];
    for (const b of blocksData) {
      const saved = await createTimeBlock(activeTenant.id, b);
      savedList.push(saved);
    }
    setBlocks((prev) => [...prev, ...savedList]);
    setIsBlockModalOpen(false);
    setBlockModalBarberId(undefined);
  };

  const handleRemoveBlock = async (blockId: string) => {
    await deleteTimeBlock(blockId);
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleTriggerTestReminder = async (booking: Booking) => {
    const log = await dispatchEvolutionWebhook('booking.reminder', booking, evolutionConfig);
    setWebhookLogs((prev) => [log, ...prev]);
  };

  // Barber Management Handlers (com trava de limite por plano)
  const handleAddBarber = (newBarberData: Omit<Barber, 'id'>): boolean => {
    const activeCount = barbers.filter((b) => (b.tenantId === activeTenant.id || (!b.tenantId && activeTenant.id === 'tenant-barbearia-ls')) && b.active !== false).length;
    const limite = activeTenant.limite_profissionais ?? activeTenant.max_barbeiros ?? 1;
    if (activeCount >= limite) {
      return false;
    }
    const id = `barber-${Date.now()}`;
    const newBarber: Barber = {
      ...newBarberData,
      id,
      tenantId: activeTenant.id,
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
      tenantId: activeTenant.id,
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
      {/* Top Header */}
      {currentView !== 'client' && currentView !== 'landing' && (
        <Header
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenWebhooks={() => setIsWebhookModalOpen(true)}
          onOpenQRCode={() => setIsQRCodeModalOpen(true)}
          webhookCount={webhookLogs.length}
          brandName={activeTenant.name}
          uiVersion={uiVersion}
          onToggleUiVersion={handleToggleUiVersion}
          authSession={authSession}
          onLogout={() => {
            clearAuthSession();
            setAuthSession(null);
            handleNavigate('login');
          }}
        />
      )}

      {/* Main Content Area Wrapped with Global Error Boundary */}
      <GlobalErrorBoundary
        activeTenantId={activeTenantId}
        activeTenantName={activeTenant.name}
      >
        <main className={`flex-1 w-full mx-auto transition-all duration-200 ${
          currentView === 'landing' || (currentView === 'client' && uiVersion === 'v2') || currentView === 'super-admin' || currentView === 'login'
            ? 'p-0 max-w-full space-y-0'
            : currentView === 'client' || currentView === 'barber'
            ? 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 max-w-2xl sm:max-w-3xl'
            : 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 max-w-[1600px]'
        }`}>
        {currentView === 'landing' ? (
          /* Domínio Raiz Principal (https://navillebarber.pro/) -> Landing Page Oficial de Venda SaaS */
          <NavilleSaasLandingPage
            tenants={tenants}
            plans={SAAS_PLANS}
            onNavigateToLogin={() => handleNavigate('login')}
            onNavigateToSuperAdmin={() => handleNavigate('super-admin')}
            onOpenTenantLink={(slug: string, subView: 'client' | 'admin' | 'barber' = 'client') => {
              const found = tenants.find((t) => t.slug === slug || t.id === slug);
              if (found) {
                setActiveTenantId(found.id);
              }
              handleNavigate(subView, slug);
            }}
          />
        ) : currentView === 'login' ? (
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
          /* Super Admin Panel - Login Estritamente Obrigatório */
          !authSession ? (
            <SecureLoginView
              initialPortal="super-admin"
              tenants={tenants}
              activeTenantId={activeTenantId}
              onSelectTenant={setActiveTenantId}
              onLoginSuccess={(newSession, targetView) => {
                setAuthSession(newSession);
                handleNavigate(targetView || 'super-admin');
              }}
              onBackToClient={() => handleNavigate('client')}
            />
          ) : authSession.user.role !== 'superadmin' ? (
            <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-2xl bg-[#18181B] border border-red-500/30 text-center space-y-4 shadow-xl animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Acesso Exclusivo Super Admin</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Você está autenticado como <strong>{authSession.user.name}</strong> ({authSession.user.role}), mas esta área é restrita aos administradores master da plataforma Naville.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleNavigate(authSession.user.role === 'barber' ? 'barber' : 'admin')}
                  className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#c59f2e] transition cursor-pointer"
                >
                  Ir para meu painel ({authSession.user.role === 'barber' ? 'Modo Cadeira' : 'Painel da Barbearia'})
                </button>
                <button
                  onClick={() => {
                    clearAuthSession();
                    setAuthSession(null);
                    handleNavigate('login');
                  }}
                  className="w-full py-2 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-xs hover:bg-zinc-700 transition cursor-pointer"
                >
                  Sair e Entrar com outra conta
                </button>
              </div>
            </div>
          ) : (
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
              onGenerateInvoice={handleGenerateInvoice}
              onNavigateView={handleNavigate}
              onUpdateInvoiceNinjaConfig={setNinjaConfig}
              onUpdateCrmConfig={setCrmConfig}
              onTriggerNinjaWebhook={handleTriggerNinjaWebhook}
              onClearNinjaLogs={() => setNinjaWebhookLogs([])}
            />
          )
        ) : currentView === 'barber' ? (
          /* Modo Cadeira - Login Obrigatório */
          !authSession ? (
            <SecureLoginView
              initialPortal="tenant"
              initialRole="barber"
              tenants={tenants}
              activeTenantId={activeTenantId}
              onSelectTenant={setActiveTenantId}
              onLoginSuccess={(newSession) => {
                setAuthSession(newSession);
                handleNavigate('barber');
              }}
              onBackToClient={() => handleNavigate('client')}
            />
          ) : (
            <BarberPwaView
              currentUser={authSession.user}
              tenant={activeTenant}
              barbers={activeTenantBarbers}
              bookings={activeTenantBookings}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
              isTenantBlocked={activeTenant.status === 'blocked'}
            />
          )
        ) : currentView === 'client' ? (
          /* Check Kill Switch: If tenant is blocked, render blocked customer view */
          activeTenant.status === 'blocked' ? (
            <TenantBlockedCustomerView tenant={activeTenant} />
          ) : uiVersion === 'v2' ? (
            /* NOVA VERSÃO 2.0 (NAVILLE LUXURY SUITE) - ADAPTADA ÀS FUNÇÕES ATUAIS */
            <NavilleLuxuryClientView
              tenantConfig={activeTenant}
              services={activeTenantServices}
              barbers={activeTenantBarbers}
              bookings={activeTenantBookings}
              blocks={activeTenantBlocks}
              customers={activeTenantCustomers}
              clientPlans={activeTenantClientPlans}
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

                // 2. Dispatch Evolution API Webhook & Confirmação Real de Agendamento WhatsApp + Lembrete 2h
                try {
                  const newLog = await dispatchEvolutionWebhook('booking.created', newBooking, evolutionConfig);
                  setWebhookLogs((prev) => [newLog, ...prev]);
                } catch (err) {
                  console.error('Webhook error:', err);
                }

                sendBookingConfirmationWhatsApp({
                  barbearia_id: activeTenant.id,
                  barbearia_nome: activeTenant.name,
                  agendamento_id: newBooking.id,
                  cliente_nome: newBooking.customerName,
                  cliente_telefone: newBooking.customerPhone,
                  barbeiro_nome: newBooking.barberName,
                  servico_nome: newBooking.services.map((s) => s.name).join(' + '),
                  horario: newBooking.startTime,
                  data: newBooking.date,
                }).catch((err) => {
                  console.warn('[WhatsApp] Erro não bloqueante ao enviar confirmação de agendamento:', err);
                });

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
        ) : !authSession ? (
          /* Login Obrigatório para o Painel da Barbearia */
          <SecureLoginView
            initialPortal="tenant"
            initialRole="owner"
            tenants={tenants}
            activeTenantId={activeTenantId}
            onSelectTenant={setActiveTenantId}
            onLoginSuccess={(newSession) => {
              setAuthSession(newSession);
              handleNavigate('admin');
            }}
            onBackToClient={() => handleNavigate('client')}
          />
        ) : authSession.user.role === 'barber' &&
           !(authSession.user.canAccessAdmin || barbers.find((b) => b.id === authSession.user.barber_id)?.canAccessAdmin) ? (
          /* O barbeiro não precisa saber que a área administrativa existe: redirecionamento transparente para o Modo Cadeira */
          <div className="py-20 text-center text-xs text-zinc-400">
            {(() => {
              if (typeof window !== 'undefined') {
                setTimeout(() => handleNavigate('barber'), 0);
              }
              return 'Carregando Modo Cadeira...';
            })()}
          </div>
        ) : (
          /* Admin / Barber Panel (Dono ou Barbeiro Habilitado) */
          <AdminScheduleView
            barbers={activeTenantBarbers}
            services={activeTenantServices}
            bookings={activeTenantBookings}
            blocks={activeTenantBlocks}
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
            customers={activeTenantCustomers}
            cashTransactions={activeTenantCashTransactions}
            clientPlans={activeTenantClientPlans}
            products={activeTenantProducts}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustProductStock={handleAdjustProductStock}
            onAddClientPlan={handleAddClientPlan}
            onUpdateClientPlan={handleUpdateClientPlan}
            onDeleteClientPlan={handleDeleteClientPlan}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onAddCashTransaction={handleAddCashTransaction}
            onSelectDate={setSelectedDate}
            onUpdateStatus={handleUpdateBookingStatus}
            onOpenBlockModal={handleOpenBlockModal}
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
          initialBarberId={blockModalBarberId}
          onClose={() => {
            setIsBlockModalOpen(false);
            setBlockModalBarberId(undefined);
          }}
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

      {/* Modal de Celebracao de Pagamento Confirmado Stripe */}
      {paymentSuccessModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-zinc-950 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-9 h-9" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Compensação Imediata</span>
              </div>
              <h3 className="text-xl font-bold text-white">Pagamento Confirmado! 🎉</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Sua assinatura do <strong className="text-amber-400">Naville Barber SaaS</strong> para <strong className="text-white">{paymentSuccessModal.tenantName}</strong> está 100% ativa.
              </p>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Status da Assinatura:</span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Ativa & Em Dia
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Próxima Renovação:</span>
                <span className="text-white font-medium">{paymentSuccessModal.nextDate.split('-').reverse().join('/')}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Fatura Registrada:</span>
                <span className="text-amber-400 font-mono font-medium">{paymentSuccessModal.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Recibo Oficial:</span>
                <span className="text-amber-400 font-medium">Disponível em "Minha Assinatura"</span>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              O agendamento online público e todos os recursos do painel administrativo continuam 100% liberados sem nenhum bloqueio.
            </p>
            <button
              onClick={() => setPaymentSuccessModal(null)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              Acessar Painel Agora
            </button>
          </div>
        </div>
      )}

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
      {currentView !== 'super-admin' && currentView !== 'client' && currentView !== 'login' && currentView !== 'landing' && (
        <footer className="py-6 border-t border-white/5 text-center text-xs text-zinc-500 w-full overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentView === 'barber' ? (
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
            {currentView === 'barber' ? (
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
