import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendUp,
  TrendDown,
  CurrencyDollar,
  Storefront,
  UsersThree,
  WarningOctagon,
  CheckCircle,
  XCircle,
  WarningCircle,
  Clock,
  ChartLineUp,
  ArrowRight,
  ArrowLeft,
  MagnifyingGlass,
  SlidersHorizontal,
  ArrowsClockwise,
  Crown,
  ShieldCheck,
  CalendarBlank,
  FileText,
  Bug,
  Plus,
  ArrowUpRight,
  CreditCard,
  Receipt,
  User,
  GearSix,
  Bell,
  Sparkle,
  LinkSimple,
  DotsThreeVertical,
  Check,
  X,
  Phone,
  Database,
  LockKey,
  LockKeyOpen,
  PencilSimple,
  Globe,
  Buildings,
  ChatCenteredDots,
  ToggleLeft,
  ToggleRight,
  Wallet,
  ChatDots,
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
import { WhatsAppIcon } from '../WhatsAppIcon';
import {
  getUnresolvedSystemErrorsCount,
  getTenantRecentErrorsCount,
} from '../../services/systemErrorLogService';
import { getWhatsAppDispatchHistory } from '../../services/whatsappAutomationService';
import { CrmWebhooksManager } from './CrmWebhooksManager';
import { InvoiceNinjaManager } from './InvoiceNinjaManager';
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
  onEditEstablishment,
  invoices = [],
  plans = [],
  invoiceNinjaConfig,
  ninjaLogs = [],
  crmConfig,
  isPocketBaseOnline = true,
}) => {
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
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'sandbox'>('production');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => new Date().toLocaleTimeString('pt-BR'));
  const [unresolvedErrorsCount, setUnresolvedErrorsCount] = useState<number>(() => getUnresolvedSystemErrorsCount());

  // Auditoria do tenant selecionado
  const [recentDispatches, setRecentDispatches] = useState<any[]>([]);

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
      // Se vitalício, isenção permanente de mensalidade SaaS da Naville (MRR = 0)
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
        tenantId: t.id,
        name: t.name,
        slug: t.slug,
        ownerName: t.ownerName,
        ownerPhone: t.ownerPhone,
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
      const matchesSearch =
        r.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.ownerName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.city.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.slug.toLowerCase().includes(tableSearch.toLowerCase()) ||
        r.tenantId.toLowerCase().includes(tableSearch.toLowerCase());

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
    return tenants.find((t) => t.id === selectedRecord?.tenantId) || tenants[0];
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
    const newStatus: TenantStatus = selectedRawTenant.status === 'blocked' ? 'active' : 'blocked';
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
    <div className="w-full space-y-6 text-left font-sans bg-[#0C0C0E] text-[#F4F4F6] min-h-screen p-4 sm:p-6 lg:p-8">
      {/* ========================================================= */}
      {/* 1. TOP BAR EXECUTIVA ("NAVILLE CONTROL TOWER")            */}
      {/* ========================================================= */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#141418] border border-[#262630] shadow-2xl relative overflow-hidden">
        {/* Glow Dourado sutil no topo */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#D4A373]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Lado Esquerdo: Logo / Monograma + Badge Ativas */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A373] via-[#B8860B] to-[#73520E] text-black font-extrabold flex items-center justify-center text-sm shadow-lg shadow-amber-500/20 shrink-0">
            N
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold font-display tracking-wider text-[#F4F4F6] text-base">
                NAVILLE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4A373]/12 text-[#D4A373] border border-[#D4A373]/30">
                Torre de Controle
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E98] font-medium">
              Painel Executivo de Barbearias e Infraestrutura SaaS
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-[#262630] text-xs font-mono font-bold text-[#34D399] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
            <span>{biMetrics.activeTenantsCount} Barbearias Ativas</span>
          </div>
        </div>

        {/* Centro: Pílulas de Navegação Rápida (Abas Principais) */}
        <nav className="flex items-center p-1 rounded-full bg-black/70 border border-[#262630] overflow-x-auto max-w-full shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-[#D4A373] to-[#B8860B] text-black shadow-lg shadow-amber-500/20 font-extrabold'
                : 'text-[#8E8E98] hover:text-white'
            }`}
          >
            <ChartLineUp className="w-3.5 h-3.5" weight="bold" />
            <span>Visão Geral</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'tenants'
                ? 'bg-gradient-to-r from-[#D4A373] to-[#B8860B] text-black shadow-lg shadow-amber-500/20 font-extrabold'
                : 'text-[#8E8E98] hover:text-white'
            }`}
          >
            <Storefront className="w-3.5 h-3.5" />
            <span>Barbearias ({tenants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-gradient-to-r from-[#D4A373] to-[#B8860B] text-black shadow-lg shadow-amber-500/20 font-extrabold'
                : 'text-[#8E8E98] hover:text-white'
            }`}
          >
            <CurrencyDollar className="w-3.5 h-3.5" />
            <span>Métricas SaaS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evolution')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'evolution'
                ? 'bg-gradient-to-r from-[#D4A373] to-[#B8860B] text-black shadow-lg shadow-amber-500/20 font-extrabold'
                : 'text-[#8E8E98] hover:text-white'
            }`}
          >
            <ChatCenteredDots className="w-3.5 h-3.5" />
            <span>Motor WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-[#D4A373] to-[#B8860B] text-black shadow-lg shadow-amber-500/20 font-extrabold'
                : 'text-[#8E8E98] hover:text-white'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Auditoria e Logs</span>
            {unresolvedErrorsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#F87171] animate-ping" />
            )}
          </button>
        </nav>

        {/* Lado Direito: Live Poll, Alternador de Ambiente e Perfil */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Status PocketBase */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono border ${
              isPocketBaseOnline
                ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            title={isPocketBaseOnline ? 'PocketBase Online na porta 8090' : 'Usando LocalStorage'}
          >
            <Database className="w-3 h-3" />
            <span>PocketBase (8090)</span>
          </div>

          {/* Botão Live Poll */}
          <button
            type="button"
            onClick={handleLivePoll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-zinc-800 border border-[#262630] text-[#8E8E98] hover:text-white text-xs font-mono transition cursor-pointer"
            title={`Última atualização: ${lastRefreshedAt}`}
          >
            <ArrowsClockwise className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#D4A373]' : ''}`} />
            <span className="hidden xl:inline">{lastRefreshedAt}</span>
          </button>

          {/* Alternador de Ambiente */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/60 border border-[#262630]">
            {(['production', 'staging'] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase font-bold transition ${
                  environment === env
                    ? 'bg-[#D4A373] text-black shadow-sm'
                    : 'text-[#8E8E98] hover:text-white'
                }`}
              >
                {env === 'production' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#262630] mx-0.5" />

          {/* Perfil Executivo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#B8860B] via-[#D4A373] to-amber-200 text-black font-extrabold flex items-center justify-center text-xs shadow-md">
              LS
            </div>
            <div className="hidden xl:block text-left">
              <span className="text-xs font-bold text-[#F4F4F6] block leading-tight">Leonardo Soares</span>
              <span className="text-[10px] text-[#8E8E98] block leading-tight">Super Administrador Master</span>
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
              className="w-10 h-10 rounded-xl bg-[#141418] hover:bg-zinc-800 border border-[#262630] flex items-center justify-center text-[#8E8E98] hover:text-white transition cursor-pointer shrink-0 shadow-lg"
              title="Voltar ao Painel da Barbearia"
            >
              <ArrowLeft className="w-4 h-4" weight="bold" />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#F4F4F6] tracking-tight">
              {activeTab === 'overview' && 'Torre de Controle Executiva'}
              {activeTab === 'tenants' && 'Gestão de Barbearias'}
              {activeTab === 'metrics' && 'Inteligência Financeira e Indicadores SaaS'}
              {activeTab === 'evolution' && 'Cluster de WhatsApp e Motor Anti-Ban'}
              {activeTab === 'logs' && 'Auditoria e Diagnóstico Técnico'}
            </h1>
            <p className="text-xs text-[#8E8E98] mt-0.5">
              Monitoramento em tempo real de faturamento, infraestrutura WhatsApp e governança das barbearias.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNewTenant && (
            <button
              type="button"
              onClick={onNewTenant}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#D4A373] to-[#B8860B] hover:from-[#e5bd47] hover:to-[#c49215] text-black text-xs font-extrabold flex items-center gap-2 transition active:scale-95 shadow-xl shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Nova Barbearia</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. GRID SUPERIOR DE 4 KPIS COM MICRO-GRÁFICOS             */}
      {/* ========================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: MRR RECORRENTE COM SPARKLINE CURVA DOURADA */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-[#262630] flex flex-col justify-between hover:border-[#D4A373]/40 transition shadow-xl group relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between text-[#8E8E98]">
              <span className="text-xs font-bold text-zinc-300 tracking-wide uppercase">
                Receita Mensal Recorrente (MRR)
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#D4A373]/12 text-[#D4A373] border border-[#D4A373]/30">
                Anual Projetado: {formatCurrency(biMetrics.arr)}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F4F4F6] tracking-tight">
                {formatCurrency(biMetrics.mrr)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#34D399]">
                <TrendUp className="w-3.5 h-3.5" weight="bold" />
                <span>+18.4% em relação ao mês anterior</span>
              </div>
            </div>
          </div>

          {/* Micro-gráfico Sparkline em SVG suave com gradiente dourado */}
          <div className="mt-4 pt-3 border-t border-[#262630]/60 flex items-center justify-between">
            <div className="h-10 w-28 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 35">
                <defs>
                  <linearGradient id="goldSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4A373" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#D4A373" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 28 Q 20 22 40 25 T 70 12 T 100 4 L 100 35 L 0 35 Z"
                  fill="url(#goldSparkGrad)"
                />
                <path
                  d="M 0 28 Q 20 22 40 25 T 70 12 T 100 4"
                  fill="none"
                  stroke="#D4A373"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#8E8E98] block uppercase font-bold">Expansão de Cadeiras</span>
              <span className="text-xs font-mono font-bold text-[#D4A373]">
                +{formatCurrency(biMetrics.expansionRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: TOTAL DE BARBEARIAS COM BARRAS DE AQUISIÇÃO */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-[#262630] flex flex-col justify-between hover:border-[#D4A373]/40 transition shadow-xl group">
          <div>
            <div className="flex items-center justify-between text-[#8E8E98]">
              <span className="text-xs font-bold text-zinc-300 tracking-wide uppercase">
                Rede de Barbearias
              </span>
              <div className="w-5 h-5 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] flex items-center justify-center text-[10px] font-bold">
                ✓
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F4F4F6] tracking-tight">
                {biMetrics.activeTenantsCount} ativas
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#8E8E98]">
                <span>Total de {biMetrics.totalTenantsCount} cadastradas</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras Verticais de 7 Meses */}
          <div className="mt-4 pt-2 border-t border-[#262630]/60">
            <div className="flex items-end justify-between gap-1.5 h-10">
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
                    className={`w-full rounded-t-sm transition-all ${
                      b.active
                        ? 'bg-gradient-to-t from-[#B8860B] to-[#D4A373] shadow-md shadow-amber-500/30'
                        : 'bg-zinc-800'
                    }`}
                  />
                  <span className={`text-[8px] font-mono ${b.active ? 'text-[#D4A373] font-bold' : 'text-zinc-500'}`}>
                    {b.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI 3: GMV TOTAL PROCESSADO COM SPLINE CURVA ESMERALDA */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-[#262630] flex flex-col justify-between hover:border-[#34D399]/40 transition shadow-xl group">
          <div>
            <div className="flex items-center justify-between text-[#8E8E98]">
              <span className="text-xs font-bold text-zinc-300 tracking-wide uppercase">
                Faturamento Bruto da Rede (GMV)
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#34D399] tracking-tight">
                {formatCurrency(biMetrics.gmvTotal)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#34D399]">
                <TrendUp className="w-3.5 h-3.5" weight="bold" />
                <span>+8.2% de volume líquido</span>
              </div>
            </div>
          </div>

          {/* Spline curva Bezier SVG com nós circulares */}
          <div className="mt-4 pt-2 border-t border-[#262630]/60">
            <div className="h-10 relative flex items-end">
              <svg className="w-full h-8 overflow-visible" viewBox="0 0 200 35">
                <defs>
                  <linearGradient id="gmvSplineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 5 28 C 30 25, 60 22, 90 18 C 120 12, 150 16, 175 8 C 185 5, 195 4, 195 4 L 195 35 L 5 35 Z"
                  fill="url(#gmvSplineGrad)"
                />
                <path
                  d="M 5 28 C 30 25, 60 22, 90 18 C 120 12, 150 16, 175 8 C 185 5, 195 4, 195 4"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="5" cy="28" r="2.5" fill="#34D399" />
                <circle cx="90" cy="18" r="2.5" fill="#34D399" />
                <circle cx="175" cy="8" r="2.5" fill="#34D399" />
                <circle cx="195" cy="4" r="3" fill="#34D399" stroke="#141418" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* KPI 4: EVOLUTION CLUSTER HEALTH & DISPAROS ANTI-BAN */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-[#262630] flex flex-col justify-between hover:border-[#D4A373]/40 transition shadow-xl group">
          <div>
            <div className="flex items-center justify-between text-[#8E8E98]">
              <span className="text-xs font-bold text-zinc-300 tracking-wide uppercase flex items-center gap-1.5">
                <WhatsAppIcon variant="official" size={14} />
                <span>Motor de WhatsApp (Evolution)</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 font-bold">
                v2.3.7
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F4F4F6] tracking-tight flex items-center gap-2">
                <span>{biMetrics.openWhatsAppCount}/{biMetrics.totalTenantsCount}</span>
                <span className="text-xs font-sans text-[#34D399] font-bold">Conectadas</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#8E8E98]">
                {biMetrics.evolutionMessagesCount} mensagens enviadas este mês
              </div>
            </div>
          </div>

          {/* Mini-Cards dos Planos Ativas */}
          <div className="mt-4 pt-2 border-t border-[#262630]/60">
            <div className="flex items-center gap-1.5">
              {(['starter', 'pro', 'enterprise'] as const).map((planKey) => (
                <button
                  key={planKey}
                  type="button"
                  onClick={() => setSelectedPlanCard(planKey)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition text-center uppercase tracking-wider ${
                    selectedPlanCard === planKey
                      ? 'bg-gradient-to-r from-[#D4A373] to-[#B8860B] text-black shadow-md'
                      : 'bg-black/50 text-[#8E8E98] hover:text-white border border-[#262630]'
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
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#141418] border border-[#262630] text-xs">
          {/* Lado Esquerdo: Filtros Ativas + Dropdowns */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-8 px-2.5 rounded-xl bg-black/60 border border-[#262630] text-[#F4F4F6] font-semibold flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4A373]" />
              <span>Filtros</span>
              <span className="w-4 h-4 rounded-full bg-[#D4A373] text-black text-[10px] font-extrabold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            </div>

            {/* Dropdown Barbearia */}
            <select
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="h-8 px-3 rounded-xl bg-black/50 border border-[#262630] text-[#F4F4F6] text-xs focus:outline-none focus:border-[#D4A373] cursor-pointer"
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
              className="h-8 px-3 rounded-xl bg-black/50 border border-[#262630] text-[#F4F4F6] text-xs focus:outline-none focus:border-[#D4A373] cursor-pointer"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Ativas</option>
              <option value="trial">Em Teste (Período Grátis)</option>
              <option value="blocked">Inadimplentes / Bloqueadas</option>
            </select>

            {/* Dropdown Plano */}
            <select
              value={tablePlanFilter}
              onChange={(e) => setTablePlanFilter(e.target.value as any)}
              className="h-8 px-3 rounded-xl bg-black/50 border border-[#262630] text-[#F4F4F6] text-xs focus:outline-none focus:border-[#D4A373] cursor-pointer"
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
              className="h-8 px-3 rounded-xl bg-black/50 border border-[#262630] text-[#F4F4F6] text-xs focus:outline-none focus:border-[#D4A373] cursor-pointer"
            >
              <option value="all">WhatsApp: Todos</option>
              <option value="open">Conectado (Ativa)</option>
              <option value="close">Desconectado (Inativo)</option>
            </select>
          </div>

          {/* Lado Direito: Seletor de Período + Input de Busca Universal */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center p-0.5 rounded-xl bg-black/50 border border-[#262630] shrink-0">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: '30d', label: '30 Dias' },
                { id: 'mes', label: 'Este Mês' },
                { id: 'ano', label: 'Este Ano' },
                { id: 'vitalicio', label: 'Histórico Completo' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id as SaaSTelemetryPeriod)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    period === item.id
                      ? 'bg-[#D4A373] text-black shadow-md'
                      : 'text-[#8E8E98] hover:text-white'
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
                placeholder="Buscar por barbearia, proprietário ou cidade..."
                className="h-8 w-48 sm:w-60 pl-3 pr-8 rounded-xl bg-black/50 border border-[#262630] text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4A373]"
              />
              <MagnifyingGlass className="w-3.5 h-3.5 text-[#8E8E98] absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 5. SPLIT MASTER-DETAIL CONTAINER (PADRÃO FINANCEIRO)      */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <section className="rounded-2xl bg-[#1B1B22] border border-[#262630] shadow-2xl overflow-hidden">
          {/* Header do Container Master-Detail */}
          <div className="px-5 py-3 border-b border-[#262630] flex flex-wrap items-center justify-between gap-3 bg-[#141418]">
            <div className="flex items-center gap-2">
              <Storefront className="w-4 h-4 text-[#D4A373]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Carteira de Estabelecimentos
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-[#8E8E98] font-mono border border-[#262630]">
                {filteredHealthRecords.length} de {tenants.length}
              </span>
            </div>

            {/* Abas Rápidas de Status */}
            <div className="flex items-center p-0.5 rounded-full bg-black/60 border border-[#262630]">
              <button
                type="button"
                onClick={() => setTableStatusFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  tableStatusFilter === 'all'
                    ? 'bg-zinc-700 text-white'
                    : 'text-[#8E8E98] hover:text-white'
                }`}
              >
                Todas ({tenants.length})
              </button>

              <button
                type="button"
                onClick={() => setTableStatusFilter('trial')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  tableStatusFilter === 'trial'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-[#8E8E98] hover:text-white'
                }`}
              >
                Em Teste ({tenants.filter((t) => t.status === 'trial').length})
              </button>

              <button
                type="button"
                onClick={() => setTableStatusFilter('blocked')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  tableStatusFilter === 'blocked'
                    ? 'bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/40'
                    : 'text-[#8E8E98] hover:text-white'
                }`}
              >
                Inadimplentes ({tenants.filter((t) => t.status === 'blocked').length})
              </button>

              <button
                type="button"
                onClick={() => setTableStatusFilter('active')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                  tableStatusFilter === 'active'
                    ? 'bg-gradient-to-r from-[#D4A373] to-[#B8860B] text-black font-extrabold'
                    : 'text-[#8E8E98] hover:text-white'
                }`}
              >
                Ativas ({tenants.filter((t) => t.status === 'active').length})
              </button>
            </div>
          </div>

          {/* Corpo Dividido: Master (Esquerda, 5 cols) + Detail (Direita, 7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
            {/* MASTER LIST (ESQUERDA) */}
            <div className="lg:col-span-5 p-3.5 border-b lg:border-b-0 lg:border-r border-[#262630] space-y-2 overflow-y-auto max-h-[620px] bg-black/20">
              {filteredHealthRecords.length === 0 ? (
                <div className="py-16 text-center text-[#8E8E98] space-y-1">
                  <Storefront className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                  <p className="text-xs font-semibold text-zinc-300">Nenhum estabelecimento encontrado</p>
                  <p className="text-[11px] text-zinc-500">Ajuste os filtros de status ou busca acima.</p>
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
                      className={`p-3.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 border ${
                        isSelected
                          ? 'bg-[#D4A373]/12 border-[#D4A373] text-white shadow-xl shadow-amber-500/10 scale-[1.01]'
                          : 'bg-[#141418] hover:bg-zinc-800/80 border-[#262630]'
                      }`}
                    >
                      {/* Avatar e Informações */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md ${
                            isSelected
                              ? 'bg-gradient-to-br from-[#D4A373] to-[#997C22] text-black font-extrabold'
                              : 'bg-zinc-800 text-zinc-300 border border-white/5'
                          }`}
                        >
                          {r.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-bold text-xs truncate ${
                                isSelected ? 'text-[#D4A373] font-extrabold' : 'text-white'
                              }`}
                            >
                              {r.name}
                            </span>
                            {r.plan === 'enterprise' && (
                              <Crown className="w-3.5 h-3.5 text-[#D4A373]" weight="fill" />
                            )}
                          </div>

                          <div className="text-[10px] text-[#8E8E98] font-mono truncate mt-0.5 flex items-center gap-1.5">
                            <span className="text-[#D4A373]">/b/{r.slug}</span>
                            <span>·</span>
                            <span className="text-zinc-500">{r.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* GMV e Badges */}
                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-mono font-bold text-white text-xs">
                          {formatCurrency(r.gmvMonthly)}
                        </div>

                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dot WhatsApp */}
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isWhatsAppOpen ? 'bg-[#34D399] animate-pulse' : 'bg-[#F87171]'
                            }`}
                            title={isWhatsAppOpen ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                          />

                          {raw?.is_vitalicio && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/40">
                              Vitalício
                            </span>
                          )}
                          {r.status === 'blocked' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/40">
                              Bloqueada
                            </span>
                          ) : r.status === 'trial' ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Em Teste
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
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
            <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-[#141418]">
              {selectedRecord ? (
                <div className="space-y-6">
                  {/* Cabeçalho do Tenant Selecionado */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#262630]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4A373]">
                          Raio-X do Estabelecimento
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-white/5">
                          Plano {selectedRecord.plan === "starter" ? "Iniciante" : selectedRecord.plan === "pro" ? "Profissional" : "Corporativo"}
                        </span>
                      </div>

                      <h2 className="text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
                        <span>{selectedRecord.name}</span>
                        {selectedRecord.status === 'blocked' ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30 font-sans font-semibold">
                            Suspenso / Inadimplente
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 font-sans font-semibold">
                            Regular / Em Dia
                          </span>
                        )}
                      </h2>
                    </div>

                    {/* Dados do Proprietário */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-[#262630] shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-[#D4A373] text-black font-extrabold flex items-center justify-center text-xs">
                        {selectedRecord.ownerName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block leading-tight">
                          {selectedRecord.ownerName}
                        </span>
                        <span className="text-[10px] text-[#8E8E98] font-mono block leading-tight">
                          {selectedRecord.ownerPhone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de 4 Micro-Chips de Métricas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Chip 1: GMV Mensal */}
                    <div className="p-4 rounded-xl bg-black/40 border border-[#262630] space-y-1">
                      <div className="flex items-center justify-between text-[#8E8E98]">
                        <span className="text-[10px] uppercase font-bold">Faturamento Balcão (GMV)</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#34D399]" />
                      </div>
                      <div className="text-lg font-extrabold font-mono text-[#34D399]">
                        {formatCurrency(selectedRecord.gmvMonthly)}
                      </div>
                      <span className="text-[10px] text-zinc-500 block">Movimentação no mês</span>
                    </div>

                    {/* Chip 2: Mensalidade SaaS SaaS (MRR) */}
                    <div className="p-4 rounded-xl bg-black/40 border border-[#262630] space-y-1">
                      <div className="flex items-center justify-between text-[#8E8E98]">
                        <span className="text-[10px] uppercase font-bold">Mensalidade SaaS SaaS</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#D4A373]" />
                      </div>
                      <div className="text-lg font-extrabold font-mono text-[#D4A373]">
                        {selectedRawTenant.is_vitalicio ? 'R$ 0,00' : formatCurrency(selectedRecord.mrrContribution)}
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        {selectedRawTenant.is_vitalicio ? 'Isenção Vitalícia / Beta Tester' : 'Assinatura mensal recorrente'}
                      </span>
                    </div>

                    {/* Chip 3: Cadeiras com Stepper */}
                    <div className="p-4 rounded-xl bg-black/40 border border-[#262630] space-y-1">
                      <div className="flex items-center justify-between text-[#8E8E98]">
                        <span className="text-[10px] uppercase font-bold">Cadeiras de Barbeiro</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustSeats(-1)}
                            className="w-4 h-4 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center text-xs"
                            title="Remover cadeira"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustSeats(1)}
                            className="w-4 h-4 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center text-xs"
                            title="Adicionar cadeira"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-lg font-extrabold font-mono text-white">
                        {selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1} cadeira(s)
                      </div>
                      <span className="text-[10px] text-zinc-500 block">
                        Limite máximo configurado
                      </span>
                    </div>

                    {/* Chip 4: Ajustar Plano e Módulos */}
                    <div
                      onClick={() => onEditTenantPlan && onEditTenantPlan(selectedRawTenant)}
                      className="p-4 rounded-xl border-2 border-dashed border-[#262630] hover:border-[#D4A373]/40 bg-black/20 hover:bg-black/40 flex flex-col items-center justify-center text-center cursor-pointer transition group"
                    >
                      <Crown className="w-5 h-5 text-[#D4A373] group-hover:scale-110 transition" />
                      <span className="text-[11px] font-bold text-zinc-300 group-hover:text-[#D4A373] mt-1">
                        Ajustar Plano e Módulos
                      </span>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* MATRIZ DE RECURSOS & GOVERNANÇA (VITALÍCIO & GATEWAYS)     */}
                  {/* ========================================================= */}
                  <div className="p-5 rounded-2xl bg-black/40 border border-[#D4A373]/30 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262630]">
                      <div>
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-[#D4A373]" />
                          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                            Matriz de Recursos & Governança de Gateways
                          </h3>
                          {selectedRawTenant.is_vitalicio ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/40">
                              Parceiro Vitalício Ativo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Assinante SaaS Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8E8E98] mt-0.5">
                          Controle granular e independente de Feature Flags por barbearia e isolamento arquitetural de Gateways.
                        </p>
                      </div>

                      {selectedRawTenant.is_vitalicio && (
                        <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right">
                          <span className="text-[10px] font-bold text-[#D4A373] uppercase tracking-wider block">
                            Isenção SaaS Naville
                          </span>
                          <span className="text-xs font-mono text-zinc-300">Stripe B2B Desativado</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* 1. Toggle: Isenção de Mensalidade (Vitalício / Beta Tester) */}
                      <div className={`p-4 rounded-xl border transition ${selectedRawTenant.is_vitalicio ? 'bg-[#D4A373]/10 border-[#D4A373]/50' : 'bg-[#141418] border-[#262630]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className={`w-4 h-4 ${selectedRawTenant.is_vitalicio ? 'text-[#D4A373]' : 'text-zinc-500'}`} weight="fill" />
                              <span className="text-xs font-bold text-white">Isenção de Mensalidade (Vitalício / Beta Tester)</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              Isenta permanentemente a barbearia da mensalidade SaaS da Naville (bloqueia faturas e avisos de atraso). Não desbloqueia módulos automaticamente.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleVitalicio}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.is_vitalicio ? 'text-[#D4A373]' : 'text-zinc-600 hover:text-zinc-400'}`}
                            title="Alternar Isenção de Mensalidade"
                          >
                            {selectedRawTenant.is_vitalicio ? (
                              <ToggleRight className="w-8 h-8 text-[#D4A373]" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-zinc-600" />
                            )}
                          </button>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 font-mono">Gateway SaaS (Stripe):</span>
                          <span className={`font-bold font-mono ${selectedRawTenant.is_vitalicio ? 'text-[#D4A373]' : 'text-emerald-400'}`}>
                            {selectedRawTenant.is_vitalicio ? 'Isento / Ignorado' : 'Cobrança Ativa'}
                          </span>
                        </div>
                      </div>

                      {/* 2. Input Numérico / Stepper: Cadeiras / Barbeiros Permitidos */}
                      <div className="p-4 rounded-xl bg-[#141418] border border-[#262630] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <UsersThree className="w-4 h-4 text-[#D4A373]" />
                            <span className="text-xs font-bold text-white">Cadeiras / Barbeiros Permitidos</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateLimiteProfissionais((selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1) - 1)}
                              disabled={(selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1) <= 1}
                              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
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
                              className="w-12 text-center py-1 rounded-lg bg-black/60 border border-white/10 font-mono font-extrabold text-sm text-[#D4A373] focus:outline-none focus:border-[#D4A373]"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateLimiteProfissionais((selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1) + 1)}
                              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
                              title="Aumentar cota"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Trava de limite de profissionais ativos. Se atingido, o backend bloqueia com código 400 e solicita contato com suporte.
                        </p>
                        <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 font-mono">Limite Máximo Cadastrado:</span>
                          <span className="text-white font-mono font-bold">
                            {(selectedRawTenant.limite_profissionais || selectedRawTenant.max_barbeiros || 1)} profissional(is)
                          </span>
                        </div>
                      </div>

                      {/* 3. Toggle: Clube de Assinaturas (Mercado Pago) */}
                      <div className={`p-4 rounded-xl border transition ${selectedRawTenant.recurso_clube_ativo ? 'bg-sky-500/10 border-sky-500/40' : 'bg-[#141418] border-[#262630]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Crown className={`w-4 h-4 ${selectedRawTenant.recurso_clube_ativo ? 'text-sky-400' : 'text-zinc-500'}`} weight="fill" />
                              <span className="text-xs font-bold text-white">Clube de Assinaturas (Mercado Pago)</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              Permite ao dono cobrar assinaturas de clientes finais. O dinheiro cai 100% no Mercado Pago do dono sem comissão da Naville.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleRecursoClube}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.recurso_clube_ativo ? 'text-sky-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                            title="Alternar Clube de Assinaturas"
                          >
                            {selectedRawTenant.recurso_clube_ativo ? (
                              <ToggleRight className="w-8 h-8 text-sky-400" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-zinc-600" />
                            )}
                          </button>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 font-mono">Gateway do Dono (Mercado Pago):</span>
                          <span className={`font-bold font-mono ${selectedRawTenant.recurso_clube_ativo ? 'text-sky-400' : 'text-zinc-500'}`}>
                            {selectedRawTenant.recurso_clube_ativo ? '100% Direto ao Dono (0% Taxa Naville)' : 'Desativado'}
                          </span>
                        </div>
                      </div>

                      {/* 4. Toggle: Fluxo Financeiro / Caixa */}
                      <div className={`p-4 rounded-xl border transition ${selectedRawTenant.recurso_financeiro_avancado !== false ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-[#141418] border-[#262630]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Wallet className={`w-4 h-4 ${selectedRawTenant.recurso_financeiro_avancado !== false ? 'text-emerald-400' : 'text-zinc-500'}`} weight="fill" />
                              <span className="text-xs font-bold text-white">Fluxo Financeiro / Caixa</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              Libera no painel do dono os módulos de PDV Balcão, Sangrias de Caixa, Controle de Gastos e DRE de despesas.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleRecursoFinanceiro}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.recurso_financeiro_avancado !== false ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                            title="Alternar Fluxo Financeiro"
                          >
                            {selectedRawTenant.recurso_financeiro_avancado !== false ? (
                              <ToggleRight className="w-8 h-8 text-emerald-400" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-zinc-600" />
                            )}
                          </button>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 font-mono">Módulos PDV & Caixa:</span>
                          <span className={`font-bold font-mono ${selectedRawTenant.recurso_financeiro_avancado !== false ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {selectedRawTenant.recurso_financeiro_avancado !== false ? 'Habilitado' : 'Oculto no Painel'}
                          </span>
                        </div>
                      </div>

                      {/* 5. Toggle: WhatsApp Engine (Nativo) */}
                      <div className={`p-4 rounded-xl border transition md:col-span-2 ${selectedRawTenant.whatsapp_ativo !== false ? 'bg-[#34D399]/10 border-[#34D399]/40' : 'bg-[#141418] border-[#262630]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <ChatDots className={`w-4 h-4 ${selectedRawTenant.whatsapp_ativo !== false ? 'text-[#34D399]' : 'text-zinc-500'}`} weight="fill" />
                              <span className="text-xs font-bold text-white">WhatsApp Engine (Nativo)</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              Motor nativo de disparos via Evolution API v2, confirmação de agendamento, lembrete 2h antes e sistema humanizado anti-ban.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleWhatsappAtivo}
                            className={`shrink-0 text-2xl transition cursor-pointer ${selectedRawTenant.whatsapp_ativo !== false ? 'text-[#34D399]' : 'text-zinc-600 hover:text-zinc-400'}`}
                            title="Alternar Motor WhatsApp"
                          >
                            {selectedRawTenant.whatsapp_ativo !== false ? (
                              <ToggleRight className="w-8 h-8 text-[#34D399]" weight="fill" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-zinc-600" />
                            )}
                          </button>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500 font-mono">Instância Evolution API:</span>
                          <span className={`font-bold font-mono ${selectedRawTenant.whatsapp_ativo !== false ? 'text-[#34D399]' : 'text-zinc-500'}`}>
                            {selectedRawTenant.whatsapp_ativo !== false ? 'Instância Ativa & Conectável' : 'Desabilitado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Telemetria Operacional & WhatsApp Evolution Cluster */}
                  <div className="p-4 rounded-xl bg-black/30 border border-[#262630] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                        API de WhatsApp e Motor Anti-Ban
                      </span>
                      <span className="text-[11px] text-[#8E8E98] font-mono">
                        Instância: <strong className="text-white">naville_barbearia_{selectedRecord.tenantId}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-lg bg-[#1B1B22] border border-[#262630]">
                        <span className="text-[10px] text-[#8E8E98] block uppercase font-bold">Sessão WhatsApp (Baileys)</span>
                        <span className={`font-bold mt-0.5 block ${selectedRawTenant.whatsappStatus === 'open' ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                          {selectedRawTenant.whatsappStatus === 'open' ? '● Conectado e Operacional' : '○ Desconectado'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#1B1B22] border border-[#262630]">
                        <span className="text-[10px] text-[#8E8E98] block uppercase font-bold">Atraso Humanizado Anti-Ban</span>
                        <span className="font-mono font-bold text-white mt-0.5 block">35 segundos dinâmico</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#1B1B22] border border-[#262630]">
                        <span className="text-[10px] text-[#8E8E98] block uppercase font-bold">Simulação de Digitação</span>
                        <span className="font-bold text-[#34D399] mt-0.5 block">4 segundos ativo</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#1B1B22] border border-[#262630]">
                        <span className="text-[10px] text-[#8E8E98] block uppercase font-bold">Disparos no Mês</span>
                        <span className="font-mono font-bold text-[#D4A373] mt-0.5 block">
                          {selectedRecord.evolutionMessagesCount} mensagens
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Ações Rápidas de Governança */}
                  <div className="pt-4 border-t border-[#262630] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Kill Switch Toggle */}
                      <button
                        type="button"
                        onClick={handleToggleBlock}
                        className={`h-10 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                          selectedRawTenant.status === 'blocked'
                            ? 'bg-[#34D399]/20 hover:bg-[#34D399]/30 text-[#34D399] border-[#34D399]/40'
                            : 'bg-[#F87171]/20 hover:bg-[#F87171]/30 text-[#F87171] border-[#F87171]/40'
                        }`}
                      >
                        {selectedRawTenant.status === 'blocked' ? (
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

                      {/* Contato WhatsApp */}
                      <button
                        type="button"
                        onClick={() => {
                          window.open(`https://wa.me/55${selectedRecord.ownerPhone.replace(/\D/g, '')}`, '_blank');
                        }}
                        className="w-10 h-10 rounded-xl bg-black/60 hover:bg-zinc-800 border border-[#262630] text-[#34D399] flex items-center justify-center transition cursor-pointer shrink-0"
                        title="Conversar com o Responsável no WhatsApp"
                      >
                        <WhatsAppIcon variant="official" size={18} />
                      </button>

                      {/* Link público /b/:slug */}
                      <button
                        type="button"
                        onClick={() => {
                          window.open(`/b/${selectedRecord.slug}`, '_blank');
                        }}
                        className="h-10 px-3 rounded-xl bg-black/60 hover:bg-zinc-800 border border-[#262630] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                        title="Abrir página pública de agendamento"
                      >
                        <Globe className="w-4 h-4 text-[#D4A373]" />
                        <span>/b/{selectedRecord.slug}</span>
                      </button>
                    </div>

                    {/* Botão Primário: Acessar Painel da Barbearia como Dono (Impersonation) */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTenant(selectedRecord.tenantId);
                        onNavigateTenantAdmin(selectedRecord.tenantId);
                      }}
                      className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-[#D4A373] to-[#B8860B] hover:from-[#e5bd47] hover:to-[#c49215] text-black text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-xl shadow-amber-500/20 cursor-pointer"
                    >
                      <span>Acessar Painel da Barbearia</span>
                      <ArrowRight className="w-4 h-4" weight="bold" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-[#8E8E98]">
                  Selecione um estabelecimento na lista à esquerda para inspecionar os detalhes.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 6. SUB-VISÕES (QUANDO CLICADO NAS DEMAIS PÍLULAS DA NAV)   */}
      {/* ========================================================= */}
      {activeTab === 'tenants' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-[#141418] border border-[#262630] space-y-4 shadow-xl hover:border-[#D4A373]/40 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#D4A373] text-black font-extrabold flex items-center justify-center text-xs">
                      {t.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{t.name}</h3>
                      <span className="text-[10px] text-[#D4A373] font-mono">/b/{t.slug}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.status === 'active'
                        ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                        : 'bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/40'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-black/40 p-3 rounded-xl border border-[#262630]">
                  <div>
                    <span className="text-[10px] text-[#8E8E98] block">Plano</span>
                    <span className="font-bold text-white uppercase">{t.plan}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8E8E98] block">Cadeiras</span>
                    <span className="font-bold text-white">{t.max_barbeiros || 1} profissionais</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8E8E98] block">WhatsApp</span>
                    <span className="font-bold text-[#34D399]">
                      {t.whatsappStatus === 'open' ? '● Conectado' : '○ Desconectado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8E8E98] block">Mensalidade SaaS</span>
                    <span className="font-mono font-bold text-[#D4A373]">
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
                    className="flex-1 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition text-center"
                  >
                    Acessar Painel da Barbearia
                  </button>
                  {onEditTenantPlan && (
                    <button
                      type="button"
                      onClick={() => onEditTenantPlan(t)}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-white/5"
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
          <div className="p-6 rounded-2xl bg-[#141418] border border-[#262630] space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ChartLineUp className="w-5 h-5 text-[#D4A373]" />
              <span>Projeções Financeiras da Plataforma SaaS</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-[#262630]">
                <span className="text-xs text-[#8E8E98] block uppercase">Receita Recorrente Anualizada (ARR)</span>
                <span className="text-2xl font-mono font-extrabold text-[#D4A373] mt-1 block">
                  {formatCurrency(biMetrics.arr)}
                </span>
                <span className="text-[11px] text-[#34D399] mt-1 block">+12.8% em relação ao ano anterior</span>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-[#262630]">
                <span className="text-xs text-[#8E8E98] block uppercase">Taxa de Cancelamento (Churn)</span>
                <span className="text-2xl font-mono font-extrabold text-[#34D399] mt-1 block">
                  {biMetrics.churnRate.toFixed(1)}%
                </span>
                <span className="text-[11px] text-[#8E8E98] mt-1 block">Abaixo da meta de tolerância de 5%</span>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-[#262630]">
                <span className="text-xs text-[#8E8E98] block uppercase">Valor Vitalício por Barbearia (LTV)</span>
                <span className="text-2xl font-mono font-extrabold text-white mt-1 block">
                  R$ 3.240,00
                </span>
                <span className="text-[11px] text-[#D4A373] mt-1 block">Tempo médio estimado de permanência: 24 meses</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'evolution' && (
        <section className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#141418] border border-[#262630] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <WhatsAppIcon variant="official" size={18} />
                  <span>Cluster de WhatsApp Evolution v2 (Produção VPS)</span>
                </h3>
                <p className="text-xs text-[#8E8E98]">
                  Monitoramento em tempo real dos contêineres Docker, sessões WhatsApp e motor de mensagens humanizadas.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                ● 6 Contêineres Saudáveis e Ativos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-[#262630]">
                <span className="text-[10px] text-[#8E8E98] uppercase font-bold block">API de WhatsApp (Evolution)</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">v2.3.7 (Porta 8080)</span>
                <span className="text-[10px] text-[#34D399] block mt-1">✓ Instâncias ativas e operacionais</span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-[#262630]">
                <span className="text-[10px] text-[#8E8E98] uppercase font-bold block">Banco de Dados PostgreSQL 15</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">Porta 5432</span>
                <span className="text-[10px] text-[#34D399] block mt-1">✓ Conexão estável e segura</span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-[#262630]">
                <span className="text-[10px] text-[#8E8E98] uppercase font-bold block">Servidor de Filas Redis 7</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">Porta 6379</span>
                <span className="text-[10px] text-[#34D399] block mt-1">✓ Sessões e filas ativas</span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-[#262630]">
                <span className="text-[10px] text-[#8E8E98] uppercase font-bold block">Proxy Seguro Caddy (SSL/TLS)</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">Portas 80/443</span>
                <span className="text-[10px] text-[#34D399] block mt-1">✓ Roteamento por slug (/b/:slug) ativo</span>
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
    </div>
  );
};
