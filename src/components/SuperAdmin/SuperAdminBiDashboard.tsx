import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendUp,
  CurrencyDollar,
  Storefront,
  UsersThree,
  ChartLineUp,
  ArrowRight,
  ArrowLeft,
  MagnifyingGlass,
  SlidersHorizontal,
  ArrowsClockwise,
  Crown,
  ShieldCheck,
  CalendarBlank,
  Bug,
  Plus,
  ArrowUpRight,
  Receipt,
  Globe,
  ToggleLeft,
  ToggleRight,
  Wallet,
  ChatDots,
  Sun,
  Moon,
  LinkSimple,
  LockKey,
  LockKeyOpen,
  Database,
  ChatCenteredDots,
} from '@phosphor-icons/react';
import {
  TenantConfig,
  TenantStatus,
  SaaSTelemetryPeriod,
  TenantHealthRecord,
  Invoice,
  SubscriptionPlan,
  InvoiceNinjaConfig,
  InvoiceNinjaWebhookLog,
  CrmWebhookConfig,
} from '../../types';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';
import { DEFAULT_TENANT_CONFIG } from '../../data/mockData';
import { DigitalReceiptModal } from '../Shared/DigitalReceiptModal';
import { WhatsAppIcon } from '../WhatsAppIcon';
import {
  getUnresolvedSystemErrorsCount,
  getTenantRecentErrorsCount,
} from '../../services/systemErrorLogService';
import { getWhatsAppDispatchHistory } from '../../services/whatsappAutomationService';
import { SystemDiagnosticsManager } from './SystemDiagnosticsManager';

export type ControlTowerTab = 'overview' | 'tenants' | 'metrics' | 'evolution' | 'logs';

interface SuperAdminBiDashboardProps {
  tenants: TenantConfig[];
  onSelectTenant: (tenantId: string) => void;
  onNavigateTenantAdmin: (tenantId: string) => void;
  onUpdateTenant?: (updatedTenant: TenantConfig) => void;
  onNewTenant?: () => void;
  onNavigateView?: (view: 'client' | 'admin') => void;
  onEditTenantPlan?: (tenant: TenantConfig) => void;
  onEditEstablishment?: (tenant: TenantConfig) => void;
  onOpenGenerateInvoice?: (tenant: TenantConfig) => void;
  invoices?: Invoice[];
  plans?: SubscriptionPlan[];
  invoiceNinjaConfig?: InvoiceNinjaConfig;
  ninjaLogs?: InvoiceNinjaWebhookLog[];
  crmConfig?: CrmWebhookConfig;
  isPocketBaseOnline?: boolean;
}

export const SuperAdminBiDashboard: React.FC<SuperAdminBiDashboardProps> = ({
  tenants,
  onSelectTenant,
  onNavigateTenantAdmin,
  onUpdateTenant,
  onNewTenant,
  onNavigateView,
  onEditTenantPlan,
  onOpenGenerateInvoice,
  invoices = [],
  plans = [],
  isPocketBaseOnline = true,
}) => {
  // Gerenciamento de Tema Dual (Modo Claro vs Modo Escuro com suporte a .dark)
  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('naville_admin_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (adminTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('naville_admin_theme', adminTheme);
  }, [adminTheme]);

  // Navegação da Torre de Controle
  const [activeTab, setActiveTab] = useState<ControlTowerTab>('overview');

  // Filtros
  const [period, setPeriod] = useState<SaaSTelemetryPeriod>('mes');
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'active' | 'trial' | 'blocked'>('all');
  const [tablePlanFilter, setTablePlanFilter] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');
  const [tableWhatsAppFilter, setTableWhatsAppFilter] = useState<'all' | 'open' | 'close'>('all');

  // Barbearia selecionada no Split Master-Detail
  const [selectedTenantId, setSelectedTenantId] = useState<string>(() => tenants[0]?.id || '');
  const [selectedPlanCard, setSelectedPlanCard] = useState<'starter' | 'pro' | 'enterprise'>('pro');

  // Ambiente e live polling
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => new Date().toLocaleTimeString('pt-BR'));
  const [unresolvedErrorsCount, setUnresolvedErrorsCount] = useState<number>(() => getUnresolvedSystemErrorsCount());
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);

  // Auditoria do tenant selecionado
  const [, setRecentDispatches] = useState<any[]>([]);

  // Atualização reativa de erros
  useEffect(() => {
    const handleUpdate = () => {
      setUnresolvedErrorsCount(getUnresolvedSystemErrorsCount());
    };
    window.addEventListener('naville:error-logs-updated' as any, handleUpdate);
    return () => {
      window.removeEventListener('naville:error-logs-updated' as any, handleUpdate);
    };
  }, []);

  // Carrega histórico recente da barbearia selecionada
  useEffect(() => {
    if (selectedTenantId) {
      getWhatsAppDispatchHistory(selectedTenantId).then((history) => {
        setRecentDispatches(history.slice(0, 5));
      });
    }
  }, [selectedTenantId]);

  // Multiplicador por período para simulação macroeconômica consistente
  const periodMultiplier = useMemo(() => {
    switch (period) {
      case 'hoje':
        return 0.033;
      case '30d':
      case 'mes':
        return 1.0;
      case 'ano':
        return 12.0;
      case 'vitalicio':
        return 18.5;
    }
  }, [period]);

  // Agregação de Métricas Globais do SaaS (Grid de 4 KPIs)
  const biMetrics = useMemo(() => {
    const totalTenantsCount = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'active');
    const trialTenants = tenants.filter((t) => t.status === 'trial');
    const blockedTenants = tenants.filter((t) => t.status === 'blocked');

    let basePlansMrr = 0;
    let expansionMrr = 0;

    tenants.forEach((t) => {
      if (t.status === 'active' || t.status === 'trial') {
        const base = t.planBasePrice || (t.plan === 'starter' ? 49.9 : t.plan === 'pro' ? 89.9 : 149.9);
        const extraSeats = Math.max(0, (t.max_barbeiros || 1) - 1);
        const extraRevenue = extraSeats * (t.valor_adicional_barbeiro || 25.0);

        basePlansMrr += base;
        expansionMrr += extraRevenue;
      }
    });

    const mrr = basePlansMrr + expansionMrr;
    const arr = mrr * 12;
    const churnRate = totalTenantsCount > 0 ? (blockedTenants.length / totalTenantsCount) * 100 : 0;
    const baseGmvSum = tenants.reduce((acc, t) => acc + (t.gmv_mensal || 15000), 0);
    const gmvTotal = baseGmvSum * periodMultiplier;
    const totalBarberSeats = tenants.reduce((acc, t) => acc + (t.max_barbeiros || 1), 0);
    const evolutionMessagesCount = Math.round(tenants.length * 480 * periodMultiplier);
    const openWhatsAppCount = tenants.filter((t) => t.whatsappStatus === 'open').length;

    return {
      mrr,
      arr,
      churnRate,
      gmvTotal,
      activeTenantsCount: activeTenants.length,
      trialTenantsCount: trialTenants.length,
      blockedTenantsCount: blockedTenants.length,
      totalTenantsCount,
      totalBarberSeats,
      expansionRevenue: expansionMrr,
      evolutionMessagesCount,
      openWhatsAppCount,
    };
  }, [tenants, periodMultiplier]);

  // Registros de Saúde e Operação de cada Tenant
  const tenantHealthRecords: TenantHealthRecord[] = useMemo(() => {
    return tenants.map((t) => {
      const basePrice = t.planBasePrice || (t.plan === 'starter' ? 49.9 : t.plan === 'pro' ? 89.9 : 149.9);
      const extraSeats = Math.max(0, (t.limite_profissionais || t.max_barbeiros || 1) - 1);
      const mrrContribution = t.is_vitalicio
        ? 0
        : t.status === 'blocked'
        ? 0
        : basePrice + extraSeats * (t.valor_adicional_barbeiro || 25.0);
      const gmvMonthly = t.gmv_mensal || 15000;
      const errorStats = getTenantRecentErrorsCount(t.id, 24);

      let healthScore: TenantHealthRecord['healthScore'] = 'good';
      if (t.status === 'blocked' || t.status_assinatura === 'em_atraso') {
        healthScore = 'danger';
      } else if (t.status === 'trial') {
        healthScore = 'warning';
      } else if (t.plan === 'enterprise' || gmvMonthly > 25000) {
        healthScore = 'excellent';
      }

      return {
        tenantId: t.id || 'tenant-ls',
        name: t.name || 'Nova Barbearia',
        slug: t.slug || 'barbearia',
        ownerName: t.ownerName || t.nome_responsavel || 'Proprietário',
        ownerPhone: t.ownerPhone || t.whatsapp_financeiro || '',
        city: t.cidade || 'São Paulo - SP',
        plan: t.plan || 'starter',
        cycle: t.plano_ciclo || 'mensal',
        barbersCount: t.max_barbeiros || 1,
        maxBarbers: t.max_barbeiros || 1,
        gmvMonthly,
        mrrContribution,
        billingStatus: t.status_assinatura || (t.status === 'blocked' ? 'em_atraso' : 'ativo'),
        status: t.status,
        is_vitalicio: t.is_vitalicio ?? false,
        evolutionMessagesCount: Math.round(gmvMonthly / 35),
        healthScore,
        daysOverdue: t.status === 'blocked' ? 9 : 0,
        unresolvedErrorsCount: errorStats.unresolved,
        last24hErrorsCount: errorStats.total,
      };
    });
  }, [tenants, unresolvedErrorsCount]);

  // Filtros aplicados na lista Master
  const filteredHealthRecords = useMemo(() => {
    return tenantHealthRecords.filter((r) => {
      const q = (tableSearch || '').toLowerCase();
      const matchesSearch =
        (r.name || '').toLowerCase().includes(q) ||
        (r.ownerName || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q) ||
        (r.slug || '').toLowerCase().includes(q) ||
        (r.tenantId || '').toLowerCase().includes(q);

      const matchesStatus = tableStatusFilter === 'all' || r.status === tableStatusFilter;
      const matchesPlan = tablePlanFilter === 'all' || r.plan === tablePlanFilter;

      const rawTenant = tenants.find((t) => t.id === r.tenantId);
      const matchesWhatsApp =
        tableWhatsAppFilter === 'all' ||
        (tableWhatsAppFilter === 'open' && rawTenant?.whatsappStatus === 'open') ||
        (tableWhatsAppFilter === 'close' && rawTenant?.whatsappStatus !== 'open');

      return matchesSearch && matchesStatus && matchesPlan && matchesWhatsApp;
    });
  }, [tenantHealthRecords, tableSearch, tableStatusFilter, tablePlanFilter, tableWhatsAppFilter, tenants]);

  // Registro do Tenant selecionado atualmente
  const selectedRecord = useMemo(() => {
    return (
      tenantHealthRecords.find((r) => r.tenantId === selectedTenantId) ||
      filteredHealthRecords[0] ||
      tenantHealthRecords[0]
    );
  }, [tenantHealthRecords, filteredHealthRecords, selectedTenantId]);

  const selectedRawTenant = useMemo(() => {
    return tenants.find((t) => t.id === selectedRecord?.tenantId) || tenants[0] || DEFAULT_TENANT_CONFIG;
  }, [tenants, selectedRecord]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (tableSearch.trim()) count++;
    if (tableStatusFilter !== 'all') count++;
    if (tablePlanFilter !== 'all') count++;
    if (tableWhatsAppFilter !== 'all') count++;
    if (period !== 'mes') count++;
    return count;
  }, [tableSearch, tableStatusFilter, tablePlanFilter, tableWhatsAppFilter, period]);

  // Ação Live Poll / Refresh
  const handleLivePoll = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshedAt(new Date().toLocaleTimeString('pt-BR'));
      setIsRefreshing(false);
    }, 600);
  };

  // Alternar Status (Kill Switch: Ativa <-> Bloqueada)
  const handleToggleBlock = () => {
    if (!selectedRawTenant || !onUpdateTenant) return;
    const newStatus: TenantStatus = selectedRawTenant?.status === 'blocked' ? 'active' : 'blocked';
    onUpdateTenant({
      ...selectedRawTenant,
      status: newStatus,
    });
  };

  // Ajustar Cadeiras (+ / -)
  const handleAdjustSeats = (delta: number) => {
    if (!selectedRawTenant || !onUpdateTenant) return;
    const current = selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1;
    const newCount = Math.max(1, current + delta);
    onUpdateTenant({
      ...selectedRawTenant,
      limite_profissionais: newCount,
      max_barbeiros: newCount,
    });
  };

  // Governança Granular: 1. Toggle Isenção de Mensalidade (Vitalício / Beta Tester)
  const handleToggleVitalicio = () => {
    if (!selectedRawTenant || !onUpdateTenant) return;
    const currentVal = selectedRawTenant.is_vitalicio ?? false;
    onUpdateTenant({
      ...selectedRawTenant,
      is_vitalicio: !currentVal,
    });
  };

  // Governança Granular: 2. Atualizar Limite Numérico de Cadeiras
  const handleUpdateLimiteProfissionais = (newLimit: number) => {
    if (!selectedRawTenant || !onUpdateTenant) return;
    const val = Math.max(1, newLimit);
    onUpdateTenant({
      ...selectedRawTenant,
      limite_profissionais: val,
      max_barbeiros: val,
    });
  };

  // Governança Granular: 3. Toggle Clube de Assinaturas (Mercado Pago do Dono)
  const handleToggleRecursoClube = () => {
    if (!selectedRawTenant || !onUpdateTenant) return;
    const currentVal = selectedRawTenant.recurso_clube_ativo ?? false;
    onUpdateTenant({
      ...selectedRawTenant,
      recurso_clube_ativo: !currentVal,
      enabledModules: {
        ...selectedRawTenant.enabledModules,
        clube_assinaturas: !currentVal,
      },
    });
  };

  // Governança Granular: 4. Toggle Fluxo Financeiro / Caixa
  const handleToggleRecursoFinanceiro = () => {
    if (!selectedRawTenant || !onUpdateTenant) return;
    const currentVal = selectedRawTenant.recurso_financeiro_avancado ?? true;
    onUpdateTenant({
      ...selectedRawTenant,
      recurso_financeiro_avancado: !currentVal,
      enabledModules: {
        ...selectedRawTenant.enabledModules,
        expenses: !currentVal,
        pdv: !currentVal,
      },
    });
  };

  // Governança Granular: 5. Toggle WhatsApp Engine (Nativo)
  const handleToggleWhatsappAtivo = () => {
    if (!selectedRawTenant || !onUpdateTenant) return;
    const currentVal = selectedRawTenant.whatsapp_ativo ?? true;
    onUpdateTenant({
      ...selectedRawTenant,
      whatsapp_ativo: !currentVal,
      enabledModules: {
        ...selectedRawTenant.enabledModules,
        whatsapp_auto: !currentVal,
      },
    });
  };

  return (
    <div className={`w-full min-h-screen text-left font-inter transition-colors duration-150 p-4 sm:p-6 lg:p-8 space-y-6 bg-[#F8FAFC] text-[#0F172A] dark:bg-[#09090B] dark:text-[#F4F4F5] ${adminTheme === 'dark' ? 'dark' : ''}`}>
      {/* ========================================================= */}
      {/* 1. TOP BAR EXECUTIVA ("NAVILLE CONTROL TOWER")            */}
      {/* ========================================================= */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs dark:bg-[#121215] dark:border-zinc-800 transition-colors">
        {/* Lado Esquerdo: Logo / Monograma Sóbrio + Badge Ativas */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold flex items-center justify-center text-xs tracking-wider shrink-0 shadow-xs">
            NV
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm tracking-tight">
                NAVILLE
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                Torre de Controle
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Gestão Corporativa de Barbearias e Infraestrutura SaaS
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100/70 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300 shrink-0">
            {/* Live green indicator with subtle ping */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <span>{biMetrics.activeTenantsCount} Barbearias Ativas</span>
          </div>
        </div>

        {/* Centro: Pílulas de Navegação Rápida (Segmented Control Sóbrio) */}
        <nav className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-x-auto max-w-full shrink-0 gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <ChartLineUp className="w-3.5 h-3.5" weight="bold" />
            <span>Visão Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'tenants'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <Storefront className="w-3.5 h-3.5" />
            <span>Barbearias ({tenants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <CurrencyDollar className="w-3.5 h-3.5" />
            <span>Métricas SaaS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evolution')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'evolution'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <ChatCenteredDots className="w-3.5 h-3.5" />
            <span>Motor WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Auditoria e Logs</span>
            {unresolvedErrorsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </nav>

        {/* Lado Direito: Live Poll, Alternador de Tema, Ambiente e Perfil */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status PocketBase */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
              isPocketBaseOnline
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
            }`}
            title={isPocketBaseOnline ? 'PocketBase Online na porta 8090' : 'Usando LocalStorage'}
          >
            {isPocketBaseOnline && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <Database className="w-3 h-3" />
            <span>PB (8090)</span>
          </div>

          {/* Botão Live Poll */}
          <button
            type="button"
            onClick={handleLivePoll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 text-xs font-mono transition cursor-pointer shadow-xs"
            title={`Última atualização: ${lastRefreshedAt}`}
          >
            <ArrowsClockwise className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-slate-900 dark:text-zinc-100' : ''}`} />
            <span className="hidden xl:inline">{lastRefreshedAt}</span>
          </button>

          {/* Alternador de Tema Claro / Escuro (Suporte Dual com .dark) */}
          <button
            type="button"
            onClick={() => setAdminTheme(adminTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium transition cursor-pointer shadow-xs"
            title={adminTheme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {adminTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" weight="bold" />
                <span className="hidden sm:inline">Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" weight="bold" />
                <span className="hidden sm:inline">Escuro</span>
              </>
            )}
          </button>

          {/* Alternador de Ambiente */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
            {(['production', 'staging'] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold transition cursor-pointer ${
                  environment === env
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                {env === 'production' ? 'PROD' : 'HMLG'}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-0.5" />

          {/* Perfil Executivo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs border border-slate-300 dark:border-zinc-700 shadow-xs">
              FB
            </div>
            <div className="hidden xl:block text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 block leading-tight">Felipe Belchior</span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">Super Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. SUB-HEADER: TÍTULO DA VISÃO & BOTÃO + NOVA BARBEARIA   */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView('admin')}
              className="w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition cursor-pointer shrink-0 shadow-xs"
              title="Voltar ao Painel da Barbearia"
            >
              <ArrowLeft className="w-4 h-4" weight="bold" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
              {activeTab === 'overview' && 'Torre de Controle Executiva'}
              {activeTab === 'tenants' && 'Gestão de Barbearias'}
              {activeTab === 'metrics' && 'Inteligência Financeira e Indicadores SaaS'}
              {activeTab === 'evolution' && 'Cluster de WhatsApp e Motor Anti-Ban'}
              {activeTab === 'logs' && 'Auditoria e Diagnóstico Técnico'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Monitoramento em tempo real de faturamento, infraestrutura WhatsApp e governança das barbearias.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNewTenant && (
            <button
              type="button"
              onClick={onNewTenant}
              className="h-9 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-semibold flex items-center gap-2 transition active:scale-[0.99] shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Nova Barbearia</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. GRID SUPERIOR DE 4 KPIS COM MICRO-GRÁFICOS SÓBRIOS     */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MRR RECORRENTE */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 flex flex-col justify-between shadow-xs transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Receita Recorrente (MRR)
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                ARR: {formatCurrency(biMetrics.arr)}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-zinc-100 tracking-tight">
                {formatCurrency(biMetrics.mrr)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <TrendUp className="w-3.5 h-3.5" weight="bold" />
                <span>+18.4% vs mês anterior</span>
              </div>
            </div>
          </div>

          {/* Micro-gráfico Sparkline em SVG sóbrio */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="h-8 w-24 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
                <path
                  d="M 0 24 Q 20 18 40 20 T 70 10 T 100 4"
                  fill="none"
                  className="stroke-slate-400 dark:stroke-zinc-500"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-medium">Expansão de Cadeiras</span>
              <span className="text-xs font-mono font-semibold text-slate-900 dark:text-zinc-200">
                +{formatCurrency(biMetrics.expansionRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: REDE DE BARBEARIAS */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 flex flex-col justify-between shadow-xs transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Rede de Barbearias
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{biMetrics.activeTenantsCount} ativas</span>
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-zinc-100 tracking-tight">
                {biMetrics.activeTenantsCount} / {biMetrics.totalTenantsCount}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                <span>Total de estabelecimentos cadastrados</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras Verticais Sóbrio */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-end justify-between gap-1.5 h-8">
              {[
                { month: 'Mai', height: '45%', active: false },
                { month: 'Jun', height: '55%', active: false },
                { month: 'Jul', height: '65%', active: false },
                { month: 'Ago', height: '75%', active: false },
                { month: 'Set', height: '85%', active: false },
                { month: 'Out', height: '100%', active: true },
              ].map((b) => (
                <div key={b.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    style={{ height: b.height }}
                    className={`w-full rounded-xs transition-all ${
                      b.active
                        ? 'bg-slate-900 dark:bg-zinc-200'
                        : 'bg-slate-200 dark:bg-zinc-800'
                    }`}
                  />
                  <span className={`text-[9px] font-mono ${b.active ? 'text-slate-900 dark:text-zinc-200 font-semibold' : 'text-slate-400 dark:text-zinc-500'}`}>
                    {b.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI 3: GMV TOTAL PROCESSADO */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 flex flex-col justify-between shadow-xs transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Faturamento Balcão (GMV)
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                Rede Total
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-zinc-100 tracking-tight">
                {formatCurrency(biMetrics.gmvTotal)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <TrendUp className="w-3.5 h-3.5" weight="bold" />
                <span>+8.2% de volume líquido</span>
              </div>
            </div>
          </div>

          {/* Spline curva Bezier Sóbria */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="h-8 relative flex items-end">
              <svg className="w-full h-7 overflow-visible" viewBox="0 0 200 25">
                <path
                  d="M 5 20 C 30 18, 60 16, 90 13 C 120 8, 150 11, 175 6 C 185 4, 195 3, 195 3"
                  fill="none"
                  className="stroke-emerald-600 dark:stroke-emerald-400"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="195" cy="3" r="3" className="fill-emerald-600 dark:fill-emerald-400" />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 4: EVOLUTION CLUSTER HEALTH & WHATSAPP */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 flex flex-col justify-between shadow-xs transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                <WhatsAppIcon variant="official" size={13} />
                <span>Motor WhatsApp</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium">
                v2.3.7
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                <span>{biMetrics.openWhatsAppCount}/{biMetrics.totalTenantsCount}</span>
                <span className="text-xs font-sans text-emerald-600 dark:text-emerald-400 font-medium">Conectadas</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                {biMetrics.evolutionMessagesCount} disparos realizados
              </div>
            </div>
          </div>

          {/* Mini-Cards dos Planos Ativas */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              {(['starter', 'pro', 'enterprise'] as const).map((planKey) => (
                <button
                  key={planKey}
                  type="button"
                  onClick={() => setSelectedPlanCard(planKey)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-mono font-medium transition text-center uppercase cursor-pointer ${
                    selectedPlanCard === planKey
                      ? 'bg-slate-900 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {planKey === 'starter' ? 'INICIANTE' : planKey === 'pro' ? 'PRO' : 'ENTERPRISE'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. BARRA DE FILTROS AVANÇADOS E BUSCA UNIVERSAL           */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 text-xs shadow-xs transition-colors">
          {/* Lado Esquerdo: Filtros Ativas + Dropdowns Sóbrios */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-medium flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Filtros</span>
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white dark:bg-zinc-200 dark:text-zinc-900 text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            </div>

            {/* Dropdown Barbearia */}
            <select
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="h-8 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600 cursor-pointer"
            >
              <option value="">Todas as Barbearias</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Dropdown Status */}
            <select
              value={tableStatusFilter}
              onChange={(e) => setTableStatusFilter(e.target.value as any)}
              className="h-8 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600 cursor-pointer"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Ativas</option>
              <option value="trial">Em Teste</option>
              <option value="blocked">Inadimplentes / Bloqueadas</option>
            </select>

            {/* Dropdown Plano */}
            <select
              value={tablePlanFilter}
              onChange={(e) => setTablePlanFilter(e.target.value as any)}
              className="h-8 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600 cursor-pointer"
            >
              <option value="all">Planos: Todos</option>
              <option value="starter">Iniciante (Starter)</option>
              <option value="pro">Profissional (Pro)</option>
              <option value="enterprise">Corporativo (Enterprise)</option>
            </select>

            {/* Dropdown WhatsApp */}
            <select
              value={tableWhatsAppFilter}
              onChange={(e) => setTableWhatsAppFilter(e.target.value as any)}
              className="h-8 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600 cursor-pointer"
            >
              <option value="all">WhatsApp: Todos</option>
              <option value="open">Conectado (Ativa)</option>
              <option value="close">Desconectado (Inativo)</option>
            </select>
          </div>

          {/* Lado Direito: Seletor de Período + Input de Busca Universal */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shrink-0">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: '30d', label: '30 Dias' },
                { id: 'mes', label: 'Este Mês' },
                { id: 'ano', label: 'Este Ano' },
                { id: 'vitalicio', label: 'Histórico' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id as SaaSTelemetryPeriod)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                    period === item.id
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {period === item.id && <CalendarBlank className="w-3 h-3" />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Busca Universal */}
            <div className="relative">
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Buscar barbearia, dono, cidade..."
                className="h-8 w-48 sm:w-60 pl-3 pr-8 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600"
              />
              <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 5. SPLIT MASTER-DETAIL CONTAINER (PADRÃO LINEAR / STRIPE)  */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <section className="rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 shadow-xs overflow-hidden transition-colors">
          {/* Header do Container Master-Detail */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <Storefront className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                Carteira de Estabelecimentos
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-mono border border-slate-200 dark:border-zinc-700">
                {filteredHealthRecords.length} de {tenants.length}
              </span>
            </div>

            {/* Abas Rápidas de Status */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTableStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  tableStatusFilter === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                Todas ({tenants.length})
              </button>

              <button
                type="button"
                onClick={() => setTableStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  tableStatusFilter === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                Ativas ({tenants.filter((t) => t.status === 'active').length})
              </button>

              <button
                type="button"
                onClick={() => setTableStatusFilter('trial')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  tableStatusFilter === 'trial'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                Em Teste ({tenants.filter((t) => t.status === 'trial').length})
              </button>

              <button
                type="button"
                onClick={() => setTableStatusFilter('blocked')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  tableStatusFilter === 'blocked'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                Inadimplentes ({tenants.filter((t) => t.status === 'blocked').length})
              </button>
            </div>
          </div>

          {/* Corpo Dividido: Master (Esquerda, 5 cols) + Detail (Direita, 7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
            {/* MASTER LIST (ESQUERDA) */}
            <div className="lg:col-span-5 p-3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-zinc-800 space-y-2 overflow-y-auto max-h-[640px] bg-slate-50/30 dark:bg-zinc-950/20">
              {filteredHealthRecords.length === 0 ? (
                <div className="py-16 px-4 text-center text-slate-500 dark:text-zinc-400 space-y-3">
                  <Storefront className="w-10 h-10 mx-auto text-slate-400 dark:text-zinc-600 mb-1" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Nenhuma barbearia encontrada</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Cadastre uma nova barbearia para gerenciar faturamento, cadeiras e motor de WhatsApp.
                  </p>
                  {onNewTenant && (
                    <button
                      type="button"
                      onClick={onNewTenant}
                      className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium text-xs shadow-xs hover:bg-slate-800 dark:hover:bg-white transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" weight="bold" />
                      <span>Cadastrar Barbearia</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredHealthRecords.map((r) => {
                  const isSelected = r.tenantId === selectedRecord?.tenantId;
                  const raw = tenants.find((t) => t.id === r.tenantId);
                  const isWhatsAppOpen = raw?.whatsappStatus === 'open';

                  return (
                    <div
                      key={r.tenantId}
                      onClick={() => {
                        setSelectedTenantId(r.tenantId);
                        onSelectTenant(r.tenantId);
                      }}
                      className={`p-3 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 border ${
                        isSelected
                          ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-zinc-800/80 dark:border-zinc-700 dark:text-zinc-100 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 dark:bg-[#121215] dark:border-zinc-800/80 dark:hover:bg-zinc-800/40 dark:text-zinc-300'
                      }`}
                    >
                      {/* Avatar e Informações */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                              : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                          }`}
                        >
                          {r.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-semibold text-xs truncate ${
                                isSelected ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-800 dark:text-zinc-200'
                              }`}
                            >
                              {r.name}
                            </span>
                            {r.plan === 'enterprise' && (
                              <Crown className="w-3 h-3 text-amber-500" weight="fill" />
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono truncate mt-0.5 flex items-center gap-1.5">
                            <span className="text-slate-600 dark:text-zinc-300">/b/{r.slug}</span>
                            <span>·</span>
                            <span>{r.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* GMV e Badges */}
                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-mono font-semibold text-slate-900 dark:text-zinc-100 text-xs">
                          {formatCurrency(r.gmvMonthly)}
                        </div>

                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live green indicator for WhatsApp */}
                          {isWhatsAppOpen ? (
                            <span className="relative flex h-2 w-2" title="WhatsApp Conectado">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                            </span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-600" title="WhatsApp Desconectado" />
                          )}

                          {raw?.is_vitalicio && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                              Vitalício
                            </span>
                          )}
                          {r.status === 'blocked' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40">
                              Bloqueada
                            </span>
                          ) : r.status === 'trial' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                              Em Teste
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40">
                              Ativa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DETAIL PANEL (DIREITA) */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white dark:bg-[#121215] transition-colors">
              {selectedRecord ? (
                <div className="space-y-6">
                  {/* Cabeçalho do Estabelecimento Selecionado */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-zinc-400">
                          Visão Corporativa
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          Plano {selectedRecord.plan === "starter" ? "Iniciante" : selectedRecord.plan === "pro" ? "Profissional" : "Corporativo"}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                        <span>{selectedRecord.name}</span>
                        {selectedRecord.status === 'blocked' ? (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40 font-medium">
                            Suspenso / Inadimplente
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40 font-medium flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                            </span>
                            <span>Regular / Em Dia</span>
                          </span>
                        )}
                      </h2>
                    </div>

                    {/* Dados do Proprietário */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold flex items-center justify-center text-xs">
                        {selectedRecord.ownerName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 block leading-tight">
                          {selectedRecord.ownerName}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block leading-tight">
                          {selectedRecord.ownerPhone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de 4 Micro-Chips de Métricas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Chip 1: GMV Mensal */}
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                        <span className="text-[10px] uppercase font-medium">Faturamento Balcão (GMV)</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
                        {formatCurrency(selectedRecord.gmvMonthly)}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">Movimentação mensal</span>
                    </div>

                    {/* Chip 2: Mensalidade SaaS */}
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                        <span className="text-[10px] uppercase font-medium">Mensalidade SaaS</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                      </div>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
                        {selectedRawTenant.is_vitalicio ? 'R$ 0,00' : formatCurrency(selectedRecord.mrrContribution)}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate">
                        {selectedRawTenant.is_vitalicio ? 'Isenção Vitalícia' : 'Recorrência mensal'}
                      </span>
                    </div>

                    {/* Chip 3: Cadeiras com Stepper */}
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                        <span className="text-[10px] uppercase font-medium">Cadeiras</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustSeats(-1)}
                            className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                            title="Remover cadeira"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustSeats(1)}
                            className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                            title="Adicionar cadeira"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-base font-bold font-mono text-slate-900 dark:text-zinc-100">
                        {selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1} cadeira(s)
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">
                        Cota autorizada
                      </span>
                    </div>

                    {/* Chip 4: Ajustar Plano e Módulos */}
                    <div
                      onClick={() => onEditTenantPlan && onEditTenantPlan(selectedRawTenant)}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-xs group"
                    >
                      <Crown className="w-4 h-4 text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-100 transition" />
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 mt-1">
                        Plano e Módulos
                      </span>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* MATRIZ DE RECURSOS & GOVERNANÇA (VITALÍCIO & GATEWAYS)     */}
                  {/* ========================================================= */}
                  <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-zinc-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                            Governança de Recursos & Gateways
                          </h3>
                          {selectedRawTenant.is_vitalicio ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                              Parceiro Vitalício
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                              Assinante Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Ativação independente de recursos por barbearia e isolamento de Gateways.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 1. Toggle: Isenção de Mensalidade */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-zinc-400" weight="fill" />
                              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Isenção de Mensalidade (Vitalício)</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                              Isenta de faturas SaaS da Naville.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleVitalicio}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.is_vitalicio ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'}`}
                            title="Alternar Isenção de Mensalidade"
                          >
                            {selectedRawTenant.is_vitalicio ? (
                              <ToggleRight className="w-7 h-7" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-7 h-7" />
                            )}
                          </button>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10px] flex items-center justify-between">
                          <span className="text-slate-500 dark:text-zinc-400">Status Gateway SaaS:</span>
                          <span className={`font-mono font-medium ${selectedRawTenant.is_vitalicio ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {selectedRawTenant.is_vitalicio ? 'Isento' : 'Cobrança Ativa'}
                          </span>
                        </div>
                      </div>

                      {/* 2. Limite de Cadeiras */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <UsersThree className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                            <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Cadeiras Permitidas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateLimiteProfissionais((selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1) - 1)}
                              disabled={(selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1) <= 1}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                              title="Diminuir cota"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1}
                              onChange={(e) => handleUpdateLimiteProfissionais(parseInt(e.target.value) || 1)}
                              className="w-10 text-center py-0.5 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 font-mono font-bold text-xs text-slate-900 dark:text-zinc-100 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateLimiteProfissionais((selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1) + 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                              title="Aumentar cota"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                          Limite de barbeiros ativos cadastráveis.
                        </p>
                      </div>

                      {/* 3. Toggle: Clube de Assinaturas */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Crown className="w-4 h-4 text-slate-600 dark:text-zinc-400" weight="fill" />
                              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Clube de Assinaturas</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                              Permite ao dono cobrar assinaturas de clientes.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleRecursoClube}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.recurso_clube_ativo ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'}`}
                            title="Alternar Clube de Assinaturas"
                          >
                            {selectedRawTenant.recurso_clube_ativo ? (
                              <ToggleRight className="w-7 h-7" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-7 h-7" />
                            )}
                          </button>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10px] flex items-center justify-between">
                          <span className="text-slate-500 dark:text-zinc-400">Gateway do Dono:</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
                            {selectedRawTenant.recurso_clube_ativo ? '100% Direto ao Dono' : 'Desativado'}
                          </span>
                        </div>
                      </div>

                      {/* 4. Toggle: Fluxo Financeiro / Caixa */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Wallet className="w-4 h-4 text-slate-600 dark:text-zinc-400" weight="fill" />
                              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Fluxo Financeiro / Caixa</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                              PDV, Sangrias e Controle de Gastos no painel.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleRecursoFinanceiro}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.recurso_financeiro_avancado !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'}`}
                            title="Alternar Fluxo Financeiro"
                          >
                            {selectedRawTenant.recurso_financeiro_avancado !== false ? (
                              <ToggleRight className="w-7 h-7" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-7 h-7" />
                            )}
                          </button>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10px] flex items-center justify-between">
                          <span className="text-slate-500 dark:text-zinc-400">Módulos PDV & Caixa:</span>
                          <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
                            {selectedRawTenant.recurso_financeiro_avancado !== false ? 'Habilitado' : 'Oculto'}
                          </span>
                        </div>
                      </div>

                      {/* 5. Toggle: WhatsApp Engine */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 md:col-span-2 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <ChatDots className="w-4 h-4 text-slate-600 dark:text-zinc-400" weight="fill" />
                              <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">Motor WhatsApp Nativo</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                              Evolution API v2, confirmação automática e atraso anti-ban.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleWhatsappAtivo}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.whatsapp_ativo !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'}`}
                            title="Alternar Motor WhatsApp"
                          >
                            {selectedRawTenant.whatsapp_ativo !== false ? (
                              <ToggleRight className="w-7 h-7" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-7 h-7" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telemetria Operacional & WhatsApp Evolution Cluster */}
                  <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                        API de WhatsApp e Motor Anti-Ban
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                        Instância: <strong className="text-slate-900 dark:text-zinc-100">naville_barbearia_{selectedRecord.tenantId}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-medium">Sessão Baileys</span>
                        <span className={`font-semibold mt-0.5 block ${selectedRawTenant?.whatsappStatus === 'open' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`}>
                          {selectedRawTenant?.whatsappStatus === 'open' ? '● Conectado' : '○ Desconectado'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-medium">Anti-Ban</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-zinc-200 mt-0.5 block">35s dinâmico</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-medium">Digitação</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 block">4s ativo</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block uppercase font-medium">Disparos no Mês</span>
                        <span className="font-mono font-medium text-slate-900 dark:text-zinc-100 mt-0.5 block">
                          {selectedRecord.evolutionMessagesCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Links Oficiais por Slug */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                        <LinkSimple className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                        <span>Links de Acesso por Slug</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                        Login: <strong className="text-slate-800 dark:text-zinc-200">{(selectedRawTenant?.email_financeiro) || (selectedRecord?.slug ? `dono@${selectedRecord.slug}.com` : 'dono@naville.com')}</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => window.open(`/b/${selectedRecord.slug}`, '_blank')}
                        className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-left transition cursor-pointer"
                      >
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-sans font-medium uppercase">1. Cliente (/b)</span>
                        <span className="text-slate-900 dark:text-zinc-100 font-semibold truncate block mt-0.5">/b/{selectedRecord.slug}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`/b/${selectedRecord.slug}/admin`, '_blank')}
                        className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-left transition cursor-pointer"
                      >
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-sans font-medium uppercase">2. Painel do Dono</span>
                        <span className="text-slate-900 dark:text-zinc-100 font-semibold truncate block mt-0.5">/b/{selectedRecord.slug}/admin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`/b/${selectedRecord.slug}/barbeiro`, '_blank')}
                        className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-left transition cursor-pointer"
                      >
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-sans font-medium uppercase">3. Cadeira Barbeiro</span>
                        <span className="text-slate-900 dark:text-zinc-100 font-semibold truncate block mt-0.5">/b/{selectedRecord.slug}/barbeiro</span>
                      </button>
                    </div>
                  </div>

                  {/* Histórico de Faturas & Recibos deste Estabelecimento */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-slate-600 dark:text-zinc-400" weight="fill" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                          Faturas & Assinaturas SaaS
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                        {invoices.filter((i) => i.tenantId === selectedRawTenant?.id).length} fatura(s)
                      </span>
                    </div>

                    {invoices.filter((i) => i.tenantId === selectedRawTenant?.id).length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400 dark:text-zinc-500">
                        Nenhuma fatura emitida para esta barbearia.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {invoices
                          .filter((i) => i.tenantId === selectedRawTenant.id)
                          .map((inv) => {
                            const isPaid = inv.status === 'paid';
                            const isOverdue = inv.status === 'overdue';
                            return (
                              <div
                                key={inv.id}
                                className="p-3 rounded-lg bg-slate-50/70 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">{inv.invoiceNumber}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                        isPaid
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                                          : isOverdue
                                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40'
                                      }`}
                                    >
                                      {isPaid ? 'Paga' : isOverdue ? 'Vencida' : 'Pendente'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
                                    Vencimento: {formatDatePtBR(inv.dueDate)} {inv.paidAt && `· Paga em: ${formatDatePtBR(inv.paidAt)}`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-semibold font-mono text-slate-900 dark:text-zinc-100 tabular-nums">
                                    {formatCurrency(inv.amount)}
                                  </span>
                                  {isPaid && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReceiptInvoice(inv)}
                                      className="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
                                      title="Visualizar Comprovante / Recibo"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      <span>Recibo</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Barra de Ações de Governança */}
                  <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      {/* Kill Switch Toggle Sóbrio */}
                      <button
                        type="button"
                        onClick={handleToggleBlock}
                        className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                          selectedRawTenant?.status === 'blocked'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 hover:bg-rose-100'
                        }`}
                      >
                        {selectedRawTenant?.status === 'blocked' ? (
                          <>
                            <LockKeyOpen className="w-4 h-4" />
                            <span>Desbloquear Estabelecimento</span>
                          </>
                        ) : (
                          <>
                            <LockKey className="w-4 h-4" />
                            <span>Bloquear Estabelecimento</span>
                          </>
                        )}
                      </button>

                      {/* Botão Gerar Fatura */}
                      {onOpenGenerateInvoice && (
                        <button
                          type="button"
                          onClick={() => onOpenGenerateInvoice(selectedRawTenant)}
                          className="h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Gerar fatura para esta barbearia"
                        >
                          <Receipt className="w-4 h-4" weight="bold" />
                          <span>+ Fatura</span>
                        </button>
                      )}

                      {/* Contato WhatsApp */}
                      <button
                        type="button"
                        onClick={() => {
                          window.open(`https://wa.me/55${(selectedRecord?.ownerPhone || '').replace(/\D/g, '')}`, '_blank');
                        }}
                        className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
                        title="Conversar no WhatsApp"
                      >
                        <WhatsAppIcon variant="official" size={16} />
                      </button>

                      {/* Link público /b/:slug */}
                      <button
                        type="button"
                        onClick={() => {
                          window.open(`/b/${selectedRecord.slug}`, '_blank');
                        }}
                        className="h-9 px-3 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        title="Abrir página pública"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>/b/{selectedRecord.slug}</span>
                      </button>
                    </div>

                    {/* Botão Primário: Acessar Painel da Barbearia */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTenant(selectedRecord.tenantId);
                        onNavigateTenantAdmin(selectedRecord.tenantId);
                      }}
                      className="w-full sm:w-auto h-9 px-5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-xs cursor-pointer"
                    >
                      <span>Acessar Painel da Barbearia</span>
                      <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 px-6 text-center text-slate-500 dark:text-zinc-400 space-y-4">
                  <Storefront className="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-700" />
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900 dark:text-zinc-100">Nenhuma barbearia selecionada</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                      Selecione um estabelecimento na lista à esquerda ou clique em &ldquo;Nova Barbearia&rdquo; para iniciar.
                    </p>
                  </div>
                  {onNewTenant && (
                    <button
                      type="button"
                      onClick={onNewTenant}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs shadow-xs hover:bg-slate-800 dark:hover:bg-white transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" weight="bold" />
                      <span>Cadastrar Barbearia</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 6. SUB-VISÕES (QUANDO CLICADO NAS DEMAIS ABAS DA NAV)     */}
      {/* ========================================================= */}
      {activeTab === 'tenants' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-4 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold flex items-center justify-center text-xs">
                      {t.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">{t.name}</h3>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">/b/{t.slug}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                      t.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">Plano</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 uppercase">{t.plan}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">Cadeiras</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{t.max_barbeiros || 1} profissionais</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">WhatsApp</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {t.whatsappStatus === 'open' ? '● Conectado' : '○ Desconectado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">Mensalidade</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-zinc-100">
                      {formatCurrency(t.planBasePrice || 89.9)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTenant(t.id);
                      onNavigateTenantAdmin(t.id);
                    }}
                    className="flex-1 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-semibold text-xs transition text-center shadow-xs cursor-pointer"
                  >
                    Acessar Painel
                  </button>
                  {onEditTenantPlan && (
                    <button
                      type="button"
                      onClick={() => onEditTenantPlan(t)}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-medium text-xs border border-slate-200 dark:border-zinc-700 transition cursor-pointer"
                    >
                      Plano
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'metrics' && (
        <section className="space-y-4">
          <div className="p-6 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <ChartLineUp className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
              <span>Projeções Financeiras da Plataforma SaaS</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <span className="text-xs text-slate-500 dark:text-zinc-400 block uppercase font-medium">Receita Anualizada (ARR)</span>
                <span className="text-2xl font-mono font-bold text-slate-900 dark:text-zinc-100 mt-1 block">
                  {formatCurrency(biMetrics.arr)}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">+12.8% em relação ao ano anterior</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <span className="text-xs text-slate-500 dark:text-zinc-400 block uppercase font-medium">Taxa de Cancelamento (Churn)</span>
                <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {biMetrics.churnRate.toFixed(1)}%
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">Abaixo do limite de 5%</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <span className="text-xs text-slate-500 dark:text-zinc-400 block uppercase font-medium">LTV Estimado</span>
                <span className="text-2xl font-mono font-bold text-slate-900 dark:text-zinc-100 mt-1 block">
                  R$ 3.240,00
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">Tempo médio estimado: 24 meses</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'evolution' && (
        <section className="space-y-4">
          <div className="p-6 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <WhatsAppIcon variant="official" size={16} />
                  <span>Cluster de WhatsApp Evolution v2 (Produção VPS)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Monitoramento em tempo real dos contêineres Docker, instâncias WhatsApp e motor humanizado.
                </p>
              </div>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </span>
                <span>6 Contêineres Operacionais</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-medium block">Evolution API v2</span>
                <span className="text-xs font-mono font-semibold text-slate-900 dark:text-zinc-100 mt-0.5 block">v2.3.7 (Porta 8080)</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">✓ Instâncias ativas</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-medium block">PostgreSQL 15</span>
                <span className="text-xs font-mono font-semibold text-slate-900 dark:text-zinc-100 mt-0.5 block">Porta 5432</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">✓ Conexão estável</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-medium block">Filas Redis 7</span>
                <span className="text-xs font-mono font-semibold text-slate-900 dark:text-zinc-100 mt-0.5 block">Porta 6379</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">✓ Filas operacionais</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-medium block">Proxy Caddy SSL</span>
                <span className="text-xs font-mono font-semibold text-slate-900 dark:text-zinc-100 mt-0.5 block">Portas 80/443</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-1">✓ Roteamento ativo</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'logs' && (
        <section className="space-y-4">
          <SystemDiagnosticsManager
            tenants={tenants}
            onSelectTenant={onSelectTenant}
            onNavigateTenantAdmin={onNavigateTenantAdmin}
          />
        </section>
      )}

      {selectedReceiptInvoice && (
        <DigitalReceiptModal
          invoice={selectedReceiptInvoice}
          tenant={tenants.find((t) => t.id === selectedReceiptInvoice.tenantId) || DEFAULT_TENANT_CONFIG}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
};
