import React, { useState, useMemo } from 'react';
import {
  CalendarBlank as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle as CheckCircle2,
  XCircle,
  WarningOctagon as AlertOctagon,
  LockKey as Lock,
  TrendUp as TrendingUp,
  UsersThree as Users,
  MagnifyingGlass as Search,
  SquaresFour as LayoutGrid,
  List,
  ChartBar as BarChart3,
  Sparkle as Sparkles,
  Scissors,
  Plus,
  Bell,
  List as Menu,
  CreditCard
} from '@phosphor-icons/react';
import {
  Barber,
  Booking,
  BookingStatus,
  TimeBlock,
  EvolutionApiConfig,
  TenantConfig,
  Service,
  Invoice,
  InvoiceNinjaConfig,
  SubscriptionPlan,
  Expense,
  CustomerProfile,
  CashTransaction,
  ClientSubscriptionPlan,
} from '../../types';
import {
  DEFAULT_INVOICE_NINJA_CONFIG,
  SAAS_PLANS,
  INITIAL_EXPENSES,
  INITIAL_CUSTOMERS,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_CLIENT_SUBSCRIPTION_PLANS,
} from '../../data/mockData';
import { formatCurrency, formatDatePtBR, formatDuration, timeToMinutes } from '../../utils/formatters';
import { generateWhatsAppDirectLink } from '../../services/webhookService';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { generateDailyTimeSlots } from '../../utils/doubleBooking';
import { WhatsAppConnectionCard } from './WhatsAppConnectionCard';
import { WhatsAppAutomationView } from './WhatsAppAutomationView';
import { BarbersManagementView } from './BarbersManagementView';
import { ServicesManagementView } from './ServicesManagementView';
import { TenantBillingView } from './TenantBillingView';
import { ExpensesManagementView } from './ExpensesManagementView';
import { CustomersManagementView } from './CustomersManagementView';
import { CashRegisterPdvView } from './CashRegisterPdvView';
import { ClientClubManagementView } from './ClientClubManagementView';
import { ModuleUpgradeLockCard } from './ModuleUpgradeLockCard';
import { SchedulingSettingsView } from './SchedulingSettingsView';
import { EstablishmentSpaceProfileView } from './EstablishmentSpaceProfileView';
import { AdminSidebar, AdminTab } from './AdminSidebar';

interface AdminScheduleViewProps {
  barbers: Barber[];
  services: Service[];
  bookings: Booking[];
  blocks: TimeBlock[];
  selectedDate: string;
  evolutionConfig: EvolutionApiConfig;
  tenantConfig: TenantConfig;
  invoices?: Invoice[];
  plans?: SubscriptionPlan[];
  invoiceNinjaConfig?: InvoiceNinjaConfig;
  expenses?: Expense[];
  customers?: CustomerProfile[];
  cashTransactions?: CashTransaction[];
  onPayInvoiceSimulated?: (invoiceId: string) => void;
  onAddExpense?: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onUpdateExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onToggleExpensePaid?: (expenseId: string) => void;
  onAddCustomer?: (customer: Omit<CustomerProfile, 'id' | 'createdAt'>) => void;
  onUpdateCustomer?: (customer: CustomerProfile) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onAddCashTransaction?: (tx: Omit<CashTransaction, 'id' | 'timestamp'>) => void;
  onSelectDate: (date: string) => void;
  onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
  onOpenBlockModal: () => void;
  onUpdateEvolutionConfig: (config: EvolutionApiConfig) => void;
  onAddBarber: (newBarber: Omit<Barber, 'id'>) => boolean;
  onUpdateBarber: (barber: Barber) => void;
  onDeleteBarber: (barberId: string) => void;
  onToggleBarberActive: (barberId: string) => boolean;
  onAddService: (newService: Omit<Service, 'id'>) => void;
  onUpdateService: (service: Service) => void;
  onDeleteService: (serviceId: string) => void;
  onToggleServiceActive: (serviceId: string) => void;
  onNavigateClient?: () => void;
  // Módulo de Clube de Assinaturas de Clientes
  clientPlans?: ClientSubscriptionPlan[];
  onAddClientPlan?: (plan: Omit<ClientSubscriptionPlan, 'id' | 'createdAt'>) => void;
  onUpdateClientPlan?: (plan: ClientSubscriptionPlan) => void;
  onDeleteClientPlan?: (planId: string) => void;
  onUpdateTenantConfig?: (tenant: TenantConfig) => void;
}


export const AdminScheduleView: React.FC<AdminScheduleViewProps> = ({
  barbers,
  services,
  bookings,
  blocks,
  selectedDate,
  evolutionConfig,
  tenantConfig,
  invoices = [],
  plans = SAAS_PLANS,
  invoiceNinjaConfig = DEFAULT_INVOICE_NINJA_CONFIG,
  expenses = INITIAL_EXPENSES,
  customers = INITIAL_CUSTOMERS,
  cashTransactions = INITIAL_CASH_TRANSACTIONS,
  clientPlans = INITIAL_CLIENT_SUBSCRIPTION_PLANS,
  onPayInvoiceSimulated,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onToggleExpensePaid,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddCashTransaction,
  onAddClientPlan,
  onUpdateClientPlan,
  onDeleteClientPlan,
  onUpdateTenantConfig,
  onSelectDate,
  onUpdateStatus,
  onOpenBlockModal,
  onUpdateEvolutionConfig,
  onAddBarber,
  onUpdateBarber,
  onDeleteBarber,
  onToggleBarberActive,
  onAddService,
  onUpdateService,
  onDeleteService,
  onToggleServiceActive,
  onNavigateClient,
}) => {
  // Filters & Tabs
  const [filterBarberId, setFilterBarberId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [adminTab, setAdminTab] = useState<AdminTab>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Generate 7-day quick date picker
  const quickDates = useMemo(() => {
    const dates = [];
    const base = new Date();
    for (let i = -1; i <= 7; i++) {
      const d = new Date();
      d.setDate(base.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      if (i === 0) label = 'Hoje';
      else if (i === 1) label = 'Amanhã';
      else if (i === -1) label = 'Ontem';

      dates.push({
        dateStr,
        label,
        dayNum: d.getDate(),
        month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      });
    }
    return dates;
  }, []);

  // Filtered Bookings for the selected date
  const dailyBookings = useMemo(() => {
    return bookings
      .filter((b) => b.date === selectedDate)
      .filter((b) => filterBarberId === 'all' || b.barberId === filterBarberId)
      .filter((b) => filterStatus === 'all' || b.status === filterStatus)
      .filter((b) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          b.customerName.toLowerCase().includes(q) ||
          b.customerPhone.includes(q) ||
          b.barberName.toLowerCase().includes(q) ||
          b.services.some((s) => s.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [bookings, selectedDate, filterBarberId, filterStatus, searchQuery]);

  // Blocks for this date
  const dailyBlocks = useMemo(() => {
    return blocks
      .filter((bl) => bl.date === selectedDate)
      .filter((bl) => filterBarberId === 'all' || bl.barberId === 'all' || bl.barberId === filterBarberId);
  }, [blocks, selectedDate, filterBarberId]);

  // Daily & General Statistics
  const stats = useMemo(() => {
    const totalDay = bookings.filter((b) => b.date === selectedDate);
    const confirmed = totalDay.filter((b) => b.status === 'confirmed').length;
    const completed = totalDay.filter((b) => b.status === 'completed').length;
    const cancelled = totalDay.filter((b) => b.status === 'cancelled').length;
    const noShow = totalDay.filter((b) => b.status === 'no_show').length;

    const activeRevenue = totalDay
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const completedRevenue = totalDay
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const ticketMedio = totalDay.length > 0 ? activeRevenue / (confirmed + completed || 1) : 0;

    // Services distribution count
    let cabeloCount = 0;
    let barbaCount = 0;
    let comboCount = 0;

    totalDay.forEach((b) => {
      b.services.forEach((s) => {
        if (s.id === 'cabelo-e-barba') comboCount++;
        else if (s.category === 'cabelo') cabeloCount++;
        else if (s.category === 'barba') barbaCount++;
      });
    });

    return {
      total: totalDay.length,
      confirmed,
      completed,
      cancelled,
      noShow,
      activeRevenue,
      completedRevenue,
      ticketMedio,
      cabeloCount,
      barbaCount,
      comboCount,
    };
  }, [bookings, selectedDate]);

  // 30-min Timeline Slots for Desktop Multi-Chair View (09:00 to 20:00)
  const timelineSlots = useMemo(() => generateDailyTimeSlots(9, 20, 30), []);

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6 w-full text-left">
      {/* Sidebar Navigation */}
      <AdminSidebar
        currentTab={adminTab}
        onSelectTab={(tab) => {
          setAdminTab(tab);
          setIsMobileMenuOpen(false);
        }}
        todayBookingsCount={stats.total}
        activeBarbersCount={barbers.filter((b) => b.active !== false).length}
        maxBarbers={tenantConfig.limite_profissionais ?? tenantConfig.max_barbeiros}
        activeServicesCount={services.filter((s) => s.active !== false).length}
        pendingExpensesCount={expenses.filter((e) => e.status === 'pending' || e.status === 'overdue').length}
        totalCustomersCount={customers.filter((c) => c.tenantId === tenantConfig.id).length}
        clubMembersCount={customers.filter((c) => c.tenantId === tenantConfig.id && c.status_assinatura === 'ativo').length}
        enabledModules={tenantConfig.enabledModules}
        isVitalicio={tenantConfig.is_vitalicio}
        recursoClubeAtivo={tenantConfig.recurso_clube_ativo ?? tenantConfig.enabledModules?.clube_assinaturas ?? false}
        recursoFinanceiroAvancado={tenantConfig.recurso_financeiro_avancado ?? tenantConfig.enabledModules?.expenses ?? true}
        whatsappAtivo={tenantConfig.whatsapp_ativo ?? tenantConfig.enabledModules?.whatsapp_auto ?? true}
        isWhatsAppConnected={evolutionConfig.autoSendEnabled}
        isTenantBlocked={tenantConfig.status === 'blocked'}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onNavigateClient={onNavigateClient || (() => {})}
        onOpenBlockModal={onOpenBlockModal}
      />

      {/* Main Content Area */}
      <div className="flex-1 w-full min-w-0 space-y-5">
        {/* Kill Switch Blocked Banner for Tenant */}
        {tenantConfig.status === 'blocked' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-900/20 to-zinc-900/40 border border-rose-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-rose-950/20">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertOctagon className="w-6 h-6" weight="regular" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Acesso Suspenso
                  </span>
                  <span className="text-xs font-semibold text-rose-200">
                    Sua assinatura está pausada. Regularize seu plano para reativar os agendamentos online.
                  </span>
                </div>
                <p className="text-xs text-rose-300/80 leading-relaxed">
                  A página pública de agendamentos para clientes está temporariamente bloqueada. Regularize suas pendências financeiras para restaurar o fluxo imediato.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setAdminTab('billing')}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <CreditCard className="w-4 h-4" weight="bold" />
                <span>Pagar Fatura com PIX</span>
              </button>

              <a
                href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Olá, gostaria de regularizar o plano da minha barbearia ${tenantConfig.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                <WhatsAppIcon variant="official" size={16} />
                <span>Falar com Suporte</span>
              </a>
            </div>
          </div>
        )}

        {/* Mobile menu trigger bar */}
        <div className="lg:hidden flex items-center justify-between p-3 rounded-2xl bg-[#141416] border border-white/5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Menu className="w-5 h-5 text-[#D4AF37]" weight="regular" />
            <span>Menu do Painel</span>
          </button>

          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-mono">
            {adminTab === 'list' && 'Agendamentos'}
            {adminTab === 'timeline' && 'Grade das Cadeiras'}
            {adminTab === 'barbers' && 'Profissionais'}
            {adminTab === 'services' && 'Serviços & Preços'}
            {adminTab === 'clients' && 'Base de Clientes'}
            {adminTab === 'whatsapp' && 'WhatsApp API'}
            {adminTab === 'pdv' && 'PDV & Caixa'}
            {adminTab === 'expenses' && 'Controle de Gastos'}
            {adminTab === 'metrics' && 'Desempenho'}
            {adminTab === 'billing' && 'Minha Assinatura'}
            {adminTab === 'space' && 'Meu Espaço & Vitrine'}
          </span>
        </div>

        {/* When Tab is 'list' or 'timeline' or 'metrics', show Date Navigation + KPIs */}
        {(adminTab === 'list' || adminTab === 'timeline' || adminTab === 'metrics') && (
          <>
            {/* Top Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-[#D4AF37] border border-amber-500/30">
                    {adminTab === 'list' ? 'Painel de Agendamentos' : adminTab === 'timeline' ? 'Visão por Cadeiras' : 'Relatório Operacional'}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {formatDatePtBR(selectedDate)}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
                  {adminTab === 'list' ? 'Controle da Barbearia' : adminTab === 'timeline' ? 'Grade das Cadeiras' : 'Desempenho e Métricas'}
                </h2>
                <p className="text-xs text-zinc-400">
                  {adminTab === 'list' && 'Gerencie agendamentos, WhatsApp e fluxo de atendimentos em tempo real.'}
                  {adminTab === 'timeline' && 'Visualize a ocupação das cadeiras por horário e profissional.'}
                  {adminTab === 'metrics' && 'Indicadores de faturamento, ticket médio e volume de serviços.'}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenBlockModal}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/30 text-[#D4AF37] hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <Lock className="w-4.5 h-4.5" weight="regular" />
                  <span>Bloquear Horário / Almoço</span>
                </button>
              </div>
            </div>

            {/* Quick Date Carousel (Touch friendly horizontal scroll) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold uppercase tracking-wider text-[11px]">Navegar por Dias</span>
                <span className="tabular-nums text-amber-400 font-bold">{selectedDate}</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar touch-pan-x">
                {quickDates.map((item) => {
                  const isSelected = item.dateStr === selectedDate;
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => onSelectDate(item.dateStr)}
                      className={`flex flex-col items-center justify-center min-w-[62px] sm:min-w-[66px] h-[64px] rounded-xl p-1.5 transition-all shrink-0 border select-none active:scale-95 ${
                        isSelected
                          ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold shadow-lg shadow-amber-500/20 scale-[1.02]'
                          : 'bg-[#18181B] border-white/5 text-zinc-300 hover:border-white/20 hover:bg-[#1E1E1E]'
                      }`}
                    >
                      <span className={`text-[10px] font-semibold uppercase ${isSelected ? 'text-black/80 font-bold' : 'text-zinc-400'}`}>
                        {item.label}
                      </span>
                      <span className={`text-base font-display font-black leading-none mt-0.5 ${isSelected ? 'text-black' : 'text-white'}`}>
                        {item.dayNum}
                      </span>
                      <span className={`text-[9px] uppercase font-bold tracking-wide ${isSelected ? 'text-black/70' : 'text-zinc-500'}`}>
                        {item.month}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KPI Cards Bar (Uniform card sizing and rhythm) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Atendimentos Hoje */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[96px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Atendimentos
                  </span>
                  <Users className="w-5 h-5 text-zinc-400" weight="regular" />
                </div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-white tabular-nums leading-none my-1">
                  {stats.total}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
                  <span className="text-amber-400 font-semibold">{stats.confirmed} agendados</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">{stats.completed} concl.</span>
                </div>
              </div>

              {/* Faturamento Previsto */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[96px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4.5 h-4.5 text-amber-400" weight="regular" /> Faturamento
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-[#D4AF37] tabular-nums leading-none my-1 truncate">
                  {formatCurrency(stats.activeRevenue)}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  <span className="text-emerald-400 font-medium">{formatCurrency(stats.completedRevenue)}</span> recebido
                </div>
              </div>

              {/* Ticket Médio */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[96px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Ticket Médio
                  </span>
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" weight="regular" />
                </div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-white tabular-nums leading-none my-1 truncate">
                  {formatCurrency(stats.ticketMedio)}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  Média: <strong>~35 min</strong> por cliente
                </div>
              </div>

              {/* Taxa de Comparecimento / Faltas */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[96px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Faltas / Cancel.
                  </span>
                  <AlertOctagon className="w-5 h-5 text-orange-400" weight="regular" />
                </div>
                <div className="text-2xl sm:text-3xl font-display font-extrabold text-zinc-200 tabular-nums leading-none my-1">
                  {stats.noShow + stats.cancelled}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {stats.noShow} faltas / {stats.cancelled} canc.
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 1: LISTA OPERACIONAL (Consistent card layout on all mobile screens) */}
        {adminTab === 'list' && (
          <div className="space-y-3">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente por nome, telefone ou serviço..."
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#18181B] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" weight="regular" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={filterBarberId}
                  onChange={(e) => setFilterBarberId(e.target.value)}
                  className="h-11 px-3 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] max-w-[150px] truncate"
                >
                  <option value="all">Todos Barbeiros</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-11 px-3 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] max-w-[140px] truncate"
                >
                  <option value="all">Todos Status</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="completed">Concluídos</option>
                  <option value="no_show">Faltas</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>
            </div>

          {/* Daily Blocks Notice */}
          {dailyBlocks.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-300">
                <Lock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>
                  <strong>{dailyBlocks.length}</strong> bloqueio(s) hoje: {dailyBlocks.map((b) => `${b.startTime}-${b.endTime} (${b.reason})`).join(', ')}
                </span>
              </div>
              <button
                onClick={onOpenBlockModal}
                className="text-[11px] text-[#D4AF37] underline font-semibold hover:text-amber-200"
              >
                Gerenciar
              </button>
            </div>
          )}

          {/* Bookings Feed - Cards with Identical Visual Rhythm */}
          {dailyBookings.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-[#18181B] border border-white/5 space-y-2">
              <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">Nenhum atendimento encontrado com os filtros atuais.</p>
              <p className="text-xs text-zinc-500">
                Selecione outra data ou alterne para o modo cliente para criar agendamentos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {dailyBookings.map((booking) => {
                // Link livre (sem mensagem pré-definida)
                const waFreeLink = generateWhatsAppDirectLink(booking.customerPhone);
                // Link de lembrete rápido do horário
                const waReminderLink = generateWhatsAppDirectLink(
                  booking.customerPhone,
                  `Olá, ${booking.customerName}! Passando para lembrar do seu horário hoje às ${booking.startTime} (${booking.services.map((s) => s.name).join(', ')}) com ${booking.barberName} na Barbearia LS.`
                );
                const isCombo = booking.services.some((s) => s.id === 'cabelo-e-barba' || s.durationMinutes === 60);

                return (
                  <div
                    key={booking.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      booking.status === 'completed'
                        ? 'bg-zinc-900/40 border-white/5 opacity-75'
                        : booking.status === 'cancelled'
                        ? 'bg-red-950/10 border-red-900/20 opacity-60'
                        : booking.status === 'no_show'
                        ? 'bg-amber-950/10 border-amber-900/20 opacity-60'
                        : 'bg-[#18181B] border-white/10 hover:border-white/20 shadow-sm'
                    }`}
                  >
                    {/* Top row: Time + Status Badge + Price (Universal layout across all phone widths) */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-black text-white font-mono">
                          {booking.startTime}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          às {booking.endTime}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ({formatDuration(booking.totalMinutes)})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            booking.status === 'confirmed'
                              ? 'bg-amber-500/20 text-[#D4AF37] border border-amber-500/30'
                              : booking.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : booking.status === 'cancelled'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}
                        >
                          {booking.status === 'confirmed'
                            ? 'Confirmado'
                            : booking.status === 'completed'
                            ? 'Concluído'
                            : booking.status === 'cancelled'
                            ? 'Cancelado'
                            : 'Falta'}
                        </span>

                        <span className="text-sm font-display font-extrabold text-[#D4AF37] font-mono">
                          {formatCurrency(booking.totalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Middle row: Customer, Barber & Services */}
                    <div className="py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white truncate">
                          {booking.customerName}
                        </h4>
                        {isCombo && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                            1h Combo
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                          <User className="w-4 h-4 text-amber-500/80 shrink-0" weight="regular" />
                          {booking.barberName}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="flex items-center gap-1.5 font-mono text-zinc-400">
                          <Phone className="w-4 h-4 text-emerald-400 shrink-0" weight="regular" />
                          {booking.customerPhone}
                        </span>
                      </div>

                      {/* Services pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {booking.services.map((s) => (
                          <span
                            key={s.id}
                            className="text-[11px] bg-white/5 text-zinc-300 px-2 py-0.5 rounded border border-white/5"
                          >
                            {s.name} ({formatDuration(s.durationMinutes)})
                          </span>
                        ))}
                      </div>

                      {booking.customerNotes && (
                        <p className="text-[11px] text-zinc-400 italic pt-0.5">
                          Obs: {booking.customerNotes}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Bar: Compacta e otimizada para celular ou computador */}
                    <div className="pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* WhatsApp Conversa Livre */}
                        <a
                          href={waFreeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8.5 px-3 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                          title="Abrir conversa no WhatsApp (sem mensagem pré-definida)"
                        >
                          <WhatsAppIcon variant="official" size={18} />
                          <span>WhatsApp</span>
                        </a>

                        {/* Avisar Horário (Lembrete) */}
                        <a
                          href={waReminderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-[#D4AF37] border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                          title="Enviar lembrete rápido do horário no WhatsApp"
                        >
                          <Bell className="w-4.5 h-4.5 shrink-0 text-amber-400" weight="regular" />
                          <span>Avisar Horário</span>
                        </a>
                      </div>

                      {/* Action buttons when confirmed */}
                      {booking.status === 'confirmed' ? (
                        <div className="flex items-center gap-1.5">
                          {/* Concluir Atendimento */}
                          <button
                            onClick={() => onUpdateStatus(booking.id, 'completed')}
                            className="h-8.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                            title="Marcar como Concluído"
                          >
                            <CheckCircle2 className="w-4.5 h-4.5 shrink-0" weight="regular" />
                            <span>Concluir</span>
                          </button>

                          {/* Marcar Falta (No-Show) */}
                          <button
                            onClick={() => onUpdateStatus(booking.id, 'no_show')}
                            className="h-8.5 w-8.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition border border-orange-500/20 flex items-center justify-center cursor-pointer text-xs"
                            title="Marcar Falta (No-Show)"
                          >
                            <AlertOctagon className="w-4.5 h-4.5" weight="regular" />
                          </button>

                          {/* Cancelar e Liberar Horário */}
                          <button
                            onClick={() => onUpdateStatus(booking.id, 'cancelled')}
                            className="h-8.5 w-8.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition border border-red-500/20 flex items-center justify-center cursor-pointer text-xs"
                            title="Cancelar e Liberar Horário"
                          >
                            <XCircle className="w-4.5 h-4.5" weight="regular" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 italic pr-1">
                          Atendimento finalizado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GRADE MULTI-CADEIRAS (Desktop / Tablet multi-barber view) */}
      {adminTab === 'timeline' && (
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium">
              Visão simultânea das cadeiras em blocos de 30 minutos (Cabelo = 1 bloco, Cabelo + Barba = 2 blocos / 1 hora)
            </span>
            <span className="text-zinc-500 font-mono">09:00 às 20:00</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#141414] shadow-2xl">
            <div className="min-w-[680px]">
              {/* Table Header: Barbers Columns */}
              <div className="grid grid-cols-12 bg-zinc-900/90 border-b border-white/10 sticky top-0 z-20">
                <div className="col-span-2 p-3 text-xs font-bold text-zinc-400 border-r border-white/10 uppercase tracking-wider text-center">
                  Horário
                </div>
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="col-span-3 p-3 border-r border-white/10 last:border-r-0 flex items-center gap-2"
                  >
                    <img
                      src={barber.avatarUrl}
                      alt={barber.name}
                      className="w-7 h-7 rounded-lg object-cover border border-amber-500/30"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {barber.name}
                      </span>
                      <span className="text-[10px] text-amber-400/90 block truncate">
                        {barber.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Rows: 30 min intervals */}
              <div className="divide-y divide-white/5">
                {timelineSlots.map((slotTime) => {
                  return (
                    <div key={slotTime} className="grid grid-cols-12 min-h-[48px]">
                      {/* Time Column */}
                      <div className="col-span-2 p-2.5 text-xs font-mono font-bold text-zinc-400 border-r border-white/10 flex items-center justify-center bg-zinc-900/40">
                        {slotTime}
                      </div>

                      {/* Barber Columns */}
                      {barbers.map((barber) => {
                        const slotMins = timeToMinutes(slotTime);
                        const matchBooking = bookings.find((b) => {
                          if (b.date !== selectedDate || b.barberId !== barber.id || b.status === 'cancelled') {
                            return false;
                          }
                          const bStart = timeToMinutes(b.startTime);
                          const bEnd = timeToMinutes(b.endTime);
                          return slotMins >= bStart && slotMins < bEnd;
                        });

                        const matchBlock = blocks.find((bl) => {
                          if (bl.date !== selectedDate) return false;
                          if (bl.barberId !== 'all' && bl.barberId !== barber.id) return false;
                          const blStart = timeToMinutes(bl.startTime);
                          const blEnd = timeToMinutes(bl.endTime);
                          return slotMins >= blStart && slotMins < blEnd;
                        });

                        const isStartOfBooking = matchBooking && matchBooking.startTime === slotTime;
                        const isStartOfBlock = matchBlock && matchBlock.startTime === slotTime;

                        return (
                          <div
                            key={barber.id}
                            className="col-span-3 p-1.5 border-r border-white/10 last:border-r-0 flex items-center justify-center relative min-h-[48px] bg-zinc-950/20"
                          >
                            {matchBooking ? (
                              <div
                                className={`w-full h-full p-2 rounded-xl text-left border transition-all ${
                                  matchBooking.status === 'completed'
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                    : matchBooking.status === 'no_show'
                                    ? 'bg-orange-950/30 border-orange-500/30 text-orange-200'
                                    : 'bg-amber-500/15 border-[#D4AF37]/50 text-white shadow-sm'
                                }`}
                              >
                                {isStartOfBooking ? (
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold truncate">
                                        {matchBooking.customerName}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-[#D4AF37]">
                                        {formatCurrency(matchBooking.totalPrice)}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-400 block truncate">
                                      {matchBooking.services.map((s) => s.name).join(' + ')} ({formatDuration(matchBooking.totalMinutes)})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 italic">
                                    ↑ Continuação ({matchBooking.customerName.split(' ')[0]})
                                  </span>
                                )}
                              </div>
                            ) : matchBlock ? (
                              <div className="w-full h-full p-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-left">
                                {isStartOfBlock ? (
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                                    <Lock className="w-4 h-4 text-amber-400" weight="regular" />
                                    <span className="truncate">{matchBlock.reason}</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-zinc-500 italic">↑ Bloqueado</span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={onOpenBlockModal}
                                className="w-full h-full rounded-xl hover:bg-white/5 text-zinc-700 hover:text-zinc-400 flex items-center justify-center transition text-xs group"
                                title="Horário livre - clique para bloquear se necessário"
                              >
                                <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-zinc-500">
                                  <Plus className="w-4 h-4" weight="regular" /> Livre
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MÉTRICAS & DISTRIBUIÇÃO */}
      {adminTab === 'metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Cabelo (30 min) */}
            <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Corte de Cabelo (30 min)
                </span>
                <Scissors className="w-5 h-5 text-amber-400" weight="regular" />
              </div>
              <div className="text-3xl font-display font-black text-white font-mono">
                {stats.cabeloCount}
              </div>
              <p className="text-xs text-zinc-500">
                Preço único e padrão de 30 minutos na cadeira.
              </p>
            </div>

            {/* Barba (30 min) */}
            <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Barba Completa (30 min)
                </span>
                <Clock className="w-5 h-5 text-amber-400" weight="regular" />
              </div>
              <div className="text-3xl font-display font-black text-white font-mono">
                {stats.barbaCount}
              </div>
              <p className="text-xs text-zinc-500">
                Toalha quente, hidratação e navalha.
              </p>
            </div>

            {/* Cabelo + Barba (60 min) */}
            <div className="p-4 rounded-2xl bg-[#18181B] border border-[#D4AF37]/30 space-y-2 bg-gradient-to-br from-amber-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" weight="regular" /> Cabelo + Barba (1h)
                </span>
              </div>
              <div className="text-3xl font-display font-black text-[#D4AF37] font-mono">
                {stats.comboCount}
              </div>
              <p className="text-xs text-zinc-400">
                Reserva automática de 1 hora inteira na grade.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GESTÃO DE PROFISSIONAIS (TRAVA POR PLANO / UPSELL) */}
      {adminTab === 'barbers' && (
        <BarbersManagementView
          barbers={barbers}
          services={services}
          tenantConfig={tenantConfig}
          onAddBarber={onAddBarber}
          onUpdateBarber={onUpdateBarber}
          onDeleteBarber={onDeleteBarber}
          onToggleActive={onToggleBarberActive}
          onUpdateTenantConfig={onUpdateTenantConfig}
        />
      )}

      {/* TAB 5: GESTÃO DE SERVIÇOS & PREÇOS (CRUD) */}
      {adminTab === 'services' && (
        <ServicesManagementView
          services={services}
          onAddService={onAddService}
          onUpdateService={onUpdateService}
          onDeleteService={onDeleteService}
          onToggleActive={onToggleServiceActive}
        />
      )}

      {/* TAB 6: CONEXÃO WHATSAPP (EVOLUTION API V2) */}
      {adminTab === 'whatsapp' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Notificações & Lembretes
                </span>
                <span className="text-xs text-zinc-400 font-mono">Evolution API v2</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
                Conexão com WhatsApp
              </h2>
              <p className="text-xs text-zinc-400">
                Gerencie sua instância, escaneie o QR Code e acompanhe o status de conexão dos disparos automáticos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAdminTab('whatsapp-automations')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all shadow-md self-start sm:self-auto"
            >
              <span>Configurar Mensagens & Anti-Ban</span>
              <span>→</span>
            </button>
          </div>

          <WhatsAppConnectionCard
            config={evolutionConfig}
            onUpdateConfig={onUpdateEvolutionConfig}
          />
        </div>
      )}

      {/* TAB 6.1: AUTOMAÇÕES DE WHATSAPP (ANTI-BAN & TEMPLATES) */}
      {adminTab === 'whatsapp-automations' && (
        <WhatsAppAutomationView
          barbeariaId={tenantConfig.id || 'kd2eakh5cijm61x'}
          isWhatsAppConnected={isWhatsAppConnected}
          onNavigateToConnection={() => setAdminTab('whatsapp')}
        />
      )}

      {/* TAB 7: MINHA ASSINATURA & FATURAMENTO (MÓDULO 3) */}
      {adminTab === 'billing' && (
        <TenantBillingView
          tenant={tenantConfig}
          plans={plans}
          invoices={invoices}
          config={invoiceNinjaConfig}
          onPayInvoiceSimulated={onPayInvoiceSimulated || (() => {})}
          onContactSupport={() => {
            window.open(
              `https://wa.me/5511999999999?text=${encodeURIComponent(
                `Olá, gostaria de falar sobre o faturamento da minha barbearia ${tenantConfig.name}`
              )}`,
              '_blank'
            );
          }}
        />
      )}

      {/* TAB 8: CONTROLE DE GASTOS & DRE */}
      {adminTab === 'expenses' && (
        tenantConfig.enabledModules?.expenses === false ? (
          <ModuleUpgradeLockCard
            moduleTitle="Controle de Gastos & DRE"
            moduleDescription="Tenha controle total de despesas fixas, produtos, descartáveis e apuração de lucro líquido real cruzado com os cortes da barbearia."
            requiredPlanName="Plano Pro Barbearia"
            features={[
              'DRE Simplificado (Receita Bruta − Despesas = Lucro Líquido Real)',
              'Raio-X de Gastos por categoria em barra percentual colorida',
              'Liquidação de contas a pagar com botão de 1-clique (Dar Baixa)',
              'Badge de alerta de pendências financeiras no menu lateral'
            ]}
            tenant={tenantConfig}
          />
        ) : (
          <ExpensesManagementView
            expenses={expenses}
            bookings={bookings}
            tenantId={tenantConfig.id}
            onAddExpense={onAddExpense || (() => {})}
            onUpdateExpense={onUpdateExpense || (() => {})}
            onDeleteExpense={onDeleteExpense || (() => {})}
            onTogglePaid={onToggleExpensePaid || (() => {})}
          />
        )
      )}

      {/* TAB 9: BASE DE CLIENTES & MINI CRM */}
      {adminTab === 'clients' && (
        tenantConfig.enabledModules?.clients === false ? (
          <ModuleUpgradeLockCard
            moduleTitle="Base de Clientes & CRM"
            moduleDescription="Gerencie sua carteira de clientes, preferências de corte, histórico de atendimentos e valor gasto acumulado (LTV)."
            requiredPlanName="Plano Pro Barbearia"
            features={[
              'Perfil completo do cliente com preferências de corte e lâmina',
              'Histórico de visitas e valor total gasto (Lifetime Value / LTV)',
              'Conversa direta no WhatsApp com 1-clique',
              'Identificação automática de clientes VIPs e recorrentes'
            ]}
            tenant={tenantConfig}
          />
        ) : (
          <CustomersManagementView
            customers={customers.filter((c) => c.tenantId === tenantConfig.id)}
            tenantId={tenantConfig.id}
            onAddCustomer={onAddCustomer || (() => {})}
            onUpdateCustomer={onUpdateCustomer || (() => {})}
            onDeleteCustomer={onDeleteCustomer || (() => {})}
          />
        )
      )}

      {/* TAB 10: PDV & FLUXO DE CAIXA DO DIA */}
      {adminTab === 'pdv' && (
        tenantConfig.enabledModules?.pdv === false ? (
          <ModuleUpgradeLockCard
            moduleTitle="PDV & Caixa do Dia"
            moduleDescription="Opere sua frente de caixa com baixas rápidas em clientes avulsos de balcão, vendas de pomadas e conciliação em PIX, Cartão e Dinheiro."
            requiredPlanName="Plano Pro Barbearia"
            features={[
              'Fechamento e saldo do caixa do dia em tempo real',
              'Baixa instantânea de corte com forma de pagamento (PIX, Dinheiro, Cartão)',
              'Venda rápida de balcão para pomadas, óleos e cosméticos',
              'Controle de sangrias (retiradas) e suprimentos de troco'
            ]}
            tenant={tenantConfig}
          />
        ) : (
          <CashRegisterPdvView
            transactions={cashTransactions.filter((tx) => tx.tenantId === tenantConfig.id)}
            barbers={barbers}
            services={services}
            tenantId={tenantConfig.id}
            customers={customers.filter((c) => c.tenantId === tenantConfig.id)}
            clientPlans={clientPlans.filter((p) => p.barbearia_id === tenantConfig.id)}
            onAddTransaction={onAddCashTransaction || (() => {})}
            onAddCustomer={onAddCustomer}
            onUpdateCustomer={onUpdateCustomer}
          />
        )
      )}

      {/* TAB 11: CLUBE DE ASSINATURAS & PLANOS RECORRENTES (MÓDULO CLUBE) */}
      {adminTab === 'club' && (
        tenantConfig.enabledModules?.clube_assinaturas === false ? (
          <ModuleUpgradeLockCard
            moduleTitle="Clube de Assinaturas & Recorrência"
            moduleDescription="Crie planos recorrentes mensais para seus clientes, defina dias da semana válidos (ex: Seg a Qua) e automatize benefícios com faturamento previsível."
            requiredPlanName="Plano Pro Barbearia"
            features={[
              'Criação de planos com dias permitidos e cotas mensais de corte',
              'Reconhecimento automático de clientes VIP no agendamento e PDV',
              'Zera automaticamente o valor de serviços inclusos nos dias permitidos',
              'Gestão de membros assinantes com alertas de renovação e WhatsApp direto'
            ]}
            tenant={tenantConfig}
          />
        ) : (
          <ClientClubManagementView
            plans={clientPlans.filter((p) => p.barbearia_id === tenantConfig.id)}
            customers={customers.filter((c) => c.tenantId === tenantConfig.id)}
            services={services}
            tenantId={tenantConfig.id}
            tenantPlan={tenantConfig.plan}
            onOpenUpgradeModal={() => setAdminTab('billing')}
            onAddPlan={onAddClientPlan || (() => {})}
            onUpdatePlan={onUpdateClientPlan || (() => {})}
            onDeletePlan={onDeleteClientPlan || (() => {})}
            onUpdateCustomer={onUpdateCustomer || (() => {})}
          />
        )
      )}

      {/* TAB 12: REGRAS DA AGENDA & SLOTS CONTÍGUOS */}
      {adminTab === 'settings' && (
        <SchedulingSettingsView
          tenant={tenantConfig}
          onUpdateTenantConfig={onUpdateTenantConfig || (() => {})}
        />
      )}

      {/* TAB 13: MEU ESPAÇO, FOTOS & VITRINE PÚBLICA */}
      {adminTab === 'space' && (
        <EstablishmentSpaceProfileView
          tenant={tenantConfig}
          onUpdateTenant={onUpdateTenantConfig || (() => {})}
          onPreviewPublicBooking={onNavigateClient}
        />
      )}
      </div>
    </div>
  );
};
