import React, { useState, useMemo } from 'react';
import {
  Plus,
  Receipt,
  CurrencyDollar,
  TrendUp,
  TrendDown,
  WarningCircle,
  CheckCircle,
  Clock,
  Trash,
  PencilSimple,
  ArrowsClockwise,
  MagnifyingGlass,
  Check,
  CreditCard,
  Barcode,
  Money,
  SlidersHorizontal,
  CalendarBlank,
  ChartPieSlice,
  ChartLineUp,
  ChartLine,
  ChartBar,
  Info
} from '@phosphor-icons/react';
import { Booking, Expense, ExpenseCategory, ExpenseStatus } from '../../types';
import { EXPENSE_CATEGORIES_META } from '../../data/mockData';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';
import { NewExpenseModal } from './NewExpenseModal';

interface ExpensesManagementViewProps {
  expenses: Expense[];
  bookings: Booking[];
  tenantId: string;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onTogglePaid: (expenseId: string) => void;
}

export const ExpensesManagementView: React.FC<ExpensesManagementViewProps> = ({
  expenses,
  bookings,
  tenantId,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onTogglePaid,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExpenseStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');

  // Month selector (Default to current month: YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Filter expenses by selected month (based on dueDate)
  const monthExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!selectedMonth) return true;
      return exp.dueDate.startsWith(selectedMonth);
    });
  }, [expenses, selectedMonth]);

  // Filtered expenses based on search, status, and category
  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter((exp) => {
      const matchesSearch =
        exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.supplier && exp.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [monthExpenses, searchQuery, statusFilter, categoryFilter]);

  // Financial KPIs
  const financials = useMemo(() => {
    // 1. Gross Revenue from Bookings in this month
    const monthBookings = bookings.filter((b) => {
      if (!selectedMonth) return true;
      return b.date.startsWith(selectedMonth) && (b.status === 'completed' || b.status === 'confirmed');
    });

    const grossRevenue = monthBookings.reduce((acc, b) => acc + b.totalPrice, 0);

    // 2. Total Expenses in this month
    const totalExpenses = monthExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    const paidExpenses = monthExpenses
      .filter((exp) => exp.status === 'paid')
      .reduce((acc, exp) => acc + exp.amount, 0);
    const pendingExpenses = monthExpenses
      .filter((exp) => exp.status === 'pending' || exp.status === 'overdue')
      .reduce((acc, exp) => acc + exp.amount, 0);

    // 3. Net Profit & Margin
    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // 4. Pending / Overdue Count
    const pendingCount = monthExpenses.filter(
      (exp) => exp.status === 'pending' || exp.status === 'overdue'
    ).length;

    // 5. Category breakdown
    const categoryTotals: Record<ExpenseCategory, number> = {
      produtos: 0,
      descartaveis: 0,
      custos_fixos: 0,
      manutencao: 0,
      marketing: 0,
      copa_cortesia: 0,
      taxas_software: 0,
      outros: 0,
    };

    monthExpenses.forEach((exp) => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return {
      grossRevenue,
      totalExpenses,
      paidExpenses,
      pendingExpenses,
      netProfit,
      profitMargin,
      pendingCount,
      categoryTotals,
    };
  }, [monthExpenses, bookings, selectedMonth]);

  // Chart visual states
  const [chartViewMode, setChartViewMode] = useState<'daily' | 'cumulative' | 'categories'>('daily');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Timeline Data para o Gráfico de Linha Diário do Mês Selecionado
  const timelineData = useMemo(() => {
    const parts = (selectedMonth || currentMonthStr).split('-');
    const year = parseInt(parts[0], 10) || 2026;
    const month = parseInt(parts[1], 10) || 10;
    const daysInMonth = new Date(year, month, 0).getDate();

    const points: {
      day: number;
      dateStr: string;
      label: string;
      revenue: number;
      expenses: number;
      balance: number;
      cumRevenue: number;
      cumExpenses: number;
      cumProfit: number;
      hasActivity: boolean;
      expenseDetails: string[];
    }[] = [];

    let runningRevenue = 0;
    let runningExpenses = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;

      const dayBookings = bookings.filter((b) => {
        return b.date === dateStr && (b.status === 'completed' || b.status === 'confirmed');
      });
      const dayRevenue = dayBookings.reduce((acc, b) => acc + b.totalPrice, 0);

      const dayExpensesList = monthExpenses.filter((e) => e.dueDate === dateStr);
      const dayExpenses = dayExpensesList.reduce((acc, e) => acc + e.amount, 0);

      runningRevenue += dayRevenue;
      runningExpenses += dayExpenses;

      points.push({
        day: d,
        dateStr,
        label: `${dayStr}/${String(month).padStart(2, '0')}`,
        revenue: dayRevenue,
        expenses: dayExpenses,
        balance: dayRevenue - dayExpenses,
        cumRevenue: runningRevenue,
        cumExpenses: runningExpenses,
        cumProfit: runningRevenue - runningExpenses,
        hasActivity: dayRevenue > 0 || dayExpenses > 0,
        expenseDetails: dayExpensesList.map((e) => `${e.description} (${formatCurrency(e.amount)})`),
      });
    }

    const maxDailyVal = Math.max(
      ...points.map((p) => Math.max(p.revenue, p.expenses)),
      50
    );

    const maxCumVal = Math.max(
      ...points.map((p) => Math.max(p.cumRevenue, p.cumExpenses, Math.abs(p.cumProfit))),
      100
    );

    const busiestExpenseDay = [...points].sort((a, b) => b.expenses - a.expenses)[0];
    const busiestRevenueDay = [...points].sort((a, b) => b.revenue - a.revenue)[0];

    return {
      points,
      daysInMonth,
      maxDailyVal,
      maxCumVal,
      busiestExpenseDay,
      busiestRevenueDay,
    };
  }, [selectedMonth, currentMonthStr, bookings, monthExpenses]);

  const handleOpenNew = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border border-white/5 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CurrencyDollar className="w-3.5 h-3.5" weight="bold" />
              <span>Gestão Financeira & DRE</span>
            </span>
            <span className="text-xs text-zinc-400 font-mono">Fluxo de Caixa da Barbearia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight mt-1.5">
            Controle de Gastos & Despesas
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl">
            Acompanhe contas a pagar, custos fixos, descartáveis e apure o lucro líquido real cruzando com o faturamento dos cortes.
          </p>
        </div>

        {/* Action Button & Month Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-[#D4AF37] cursor-pointer"
          />

          <button
            onClick={handleOpenNew}
            className="h-10 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" weight="bold" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Faturamento Bruto */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendUp className="w-4 h-4 text-emerald-400" /> Faturamento
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Agendamentos</span>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-400 tabular-nums my-1">
            {formatCurrency(financials.grossRevenue)}
          </div>
          <div className="text-[11px] text-zinc-400 truncate">
            Receita bruta confirmada no mês
          </div>
        </div>

        {/* Total de Despesas */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <TrendDown className="w-4 h-4 text-red-400" /> Despesas Totais
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Mês</span>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-red-400 tabular-nums my-1">
            {formatCurrency(financials.totalExpenses)}
          </div>
          <div className="text-[11px] text-zinc-400 truncate">
            {formatCurrency(financials.paidExpenses)} pagas · {formatCurrency(financials.pendingExpenses)} a pagar
          </div>
        </div>

        {/* Lucro Líquido Real */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
              <CurrencyDollar className="w-4 h-4 text-[#D4AF37]" /> Lucro Líquido
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                financials.netProfit >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border-red-500/30'
              }`}
            >
              {financials.profitMargin.toFixed(0)}% margem
            </span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-display font-extrabold tabular-nums my-1 ${
              financials.netProfit >= 0 ? 'text-[#D4AF37]' : 'text-red-400'
            }`}
          >
            {formatCurrency(financials.netProfit)}
          </div>
          <div className="text-[11px] text-zinc-400 truncate">
            Receita − Todas as despesas
          </div>
        </div>

        {/* Contas a Pagar / Pendentes */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> A Pagar no Mês
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              {financials.pendingCount} conta(s)
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-amber-400 tabular-nums my-1">
            {formatCurrency(financials.pendingExpenses)}
          </div>
          <div className="text-[11px] text-zinc-400 truncate">
            {financials.pendingCount > 0 ? 'Aguardando baixa / pagamento' : 'Tudo em dia!'}
          </div>
        </div>
      </div>

      {/* Módulo de Gráfico de Linha / Fluxo Financeiro (Clean, Elegante e Sem Poluição Visual) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[#18181B] border border-white/5 space-y-4 shadow-xl">
        {/* Header do Gráfico */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
              <ChartLineUp className="w-5 h-5" weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-bold font-display text-white">
                  Evolução do Fluxo Financeiro
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 font-bold uppercase">
                  {chartViewMode === 'daily'
                    ? 'Visão Diária'
                    : chartViewMode === 'cumulative'
                    ? 'Curva Acumulada'
                    : 'Raio-X de Gastos'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {chartViewMode === 'categories'
                  ? 'Distribuição limpa de gastos por categoria (sem poluição visual)'
                  : 'Acompanhe as entradas e saídas ao longo de todos os dias do mês'}
              </p>
            </div>
          </div>

          {/* Switcher de Visualização */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-white/10 self-start md:self-center">
            <button
              type="button"
              onClick={() => setChartViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                chartViewMode === 'daily'
                  ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ChartLine className="w-3.5 h-3.5" weight="bold" />
              <span>Linha Diária</span>
            </button>

            <button
              type="button"
              onClick={() => setChartViewMode('cumulative')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                chartViewMode === 'cumulative'
                  ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendUp className="w-3.5 h-3.5" weight="bold" />
              <span>Acumulado</span>
            </button>

            <button
              type="button"
              onClick={() => setChartViewMode('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                chartViewMode === 'categories'
                  ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ChartPieSlice className="w-3.5 h-3.5" weight="bold" />
              <span>Por Categoria</span>
            </button>
          </div>
        </div>

        {/* Legenda & Status das Linhas */}
        {chartViewMode !== 'categories' && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                <span className="text-zinc-300 font-medium">
                  {chartViewMode === 'daily' ? 'Faturamento Diário' : 'Faturamento Acumulado'}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(financials.grossRevenue)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/30" />
                <span className="text-zinc-300 font-medium">
                  {chartViewMode === 'daily' ? 'Despesas no Dia' : 'Despesas Acumuladas'}
                </span>
                <span className="font-mono font-bold text-rose-400">
                  {formatCurrency(financials.totalExpenses)}
                </span>
              </div>
            </div>

            {/* Dica de Interatividade */}
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Passe o mouse ou toque nos pontos para inspecionar cada dia
            </span>
          </div>
        )}

        {/* ÁREA DO GRÁFICO DE LINHA */}
        {(chartViewMode === 'daily' || chartViewMode === 'cumulative') && (() => {
          const W = 800;
          const H = 200;
          const padL = 55;
          const padR = 25;
          const padT = 20;
          const padB = 30;
          const plotW = W - padL - padR;
          const plotH = H - padT - padB;

          const isCum = chartViewMode === 'cumulative';
          const maxVal = Math.max(isCum ? timelineData.maxCumVal : timelineData.maxDailyVal, 50) * 1.15;

          const revCoords = timelineData.points.map((pt, i) => {
            const x = padL + (i / (timelineData.daysInMonth - 1)) * plotW;
            const val = isCum ? pt.cumRevenue : pt.revenue;
            const y = padT + plotH - (Math.max(0, val) / maxVal) * plotH;
            return { x, y, val, pt };
          });

          const expCoords = timelineData.points.map((pt, i) => {
            const x = padL + (i / (timelineData.daysInMonth - 1)) * plotW;
            const val = isCum ? pt.cumExpenses : pt.expenses;
            const y = padT + plotH - (Math.max(0, val) / maxVal) * plotH;
            return { x, y, val, pt };
          });

          const buildPath = (coords: { x: number; y: number }[]) => {
            if (coords.length === 0) return '';
            if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
            let p = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
            for (let i = 0; i < coords.length - 1; i++) {
              const p0 = coords[i];
              const p1 = coords[i + 1];
              const cpX1 = p0.x + (p1.x - p0.x) / 3;
              const cpY1 = p0.y;
              const cpX2 = p1.x - (p1.x - p0.x) / 3;
              const cpY2 = p1.y;
              p += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
            }
            return p;
          };

          const revLinePath = buildPath(revCoords);
          const expLinePath = buildPath(expCoords);
          const baseY = padT + plotH;
          const revAreaPath = `${revLinePath} L ${revCoords[revCoords.length - 1].x.toFixed(1)} ${baseY} L ${revCoords[0].x.toFixed(1)} ${baseY} Z`;
          const expAreaPath = `${expLinePath} L ${expCoords[expCoords.length - 1].x.toFixed(1)} ${baseY} L ${expCoords[0].x.toFixed(1)} ${baseY} Z`;

          const activeIdx = hoveredPointIndex !== null ? hoveredPointIndex : null;
          const activePoint = activeIdx !== null ? timelineData.points[activeIdx] : null;

          // Eixo Y ticks
          const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

          // Eixo X ticks (dias)
          const xDaySteps = [1, 5, 10, 15, 20, 25, timelineData.daysInMonth];

          const handleSvgInteraction = (clientX: number, target: SVGSVGElement) => {
            const rect = target.getBoundingClientRect();
            const svgX = ((clientX - rect.left) / rect.width) * W;
            const ratio = Math.max(0, Math.min(1, (svgX - padL) / plotW));
            const idx = Math.round(ratio * (timelineData.daysInMonth - 1));
            setHoveredPointIndex(idx);
          };

          return (
            <div className="space-y-3">
              {/* Card de Inspeção Rápida no Hover */}
              <div className="min-h-[46px] p-2.5 rounded-2xl bg-zinc-900/80 border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                {activePoint ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-lg border border-white/10">
                        Dia {String(activePoint.day).padStart(2, '0')}
                      </span>
                      <span className="text-zinc-400">
                        {formatDatePtBR(activePoint.dateStr)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <TrendUp className="w-3.5 h-3.5" />
                        <span>Faturamento:</span>
                        <strong className="font-mono text-white">
                          +{formatCurrency(isCum ? activePoint.cumRevenue : activePoint.revenue)}
                        </strong>
                      </span>

                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <TrendDown className="w-3.5 h-3.5" />
                        <span>Despesas:</span>
                        <strong className="font-mono text-white">
                          -{formatCurrency(isCum ? activePoint.cumExpenses : activePoint.expenses)}
                        </strong>
                      </span>

                      <span className="font-semibold flex items-center gap-1">
                        <span className="text-zinc-400">Saldo:</span>
                        <strong
                          className={`font-mono ${
                            (isCum ? activePoint.cumProfit : activePoint.balance) >= 0
                              ? 'text-[#D4AF37]'
                              : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(isCum ? activePoint.cumProfit : activePoint.balance)}
                        </strong>
                      </span>
                    </div>

                    {activePoint.expenseDetails.length > 0 && (
                      <div className="w-full text-[11px] text-zinc-400 pt-1 border-t border-white/5 flex items-center gap-1 truncate">
                        <Receipt className="w-3 h-3 text-[#D4AF37] shrink-0" />
                        <span className="truncate">
                          Contas do dia: {activePoint.expenseDetails.join(' · ')}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full text-zinc-500 text-xs">
                    <span>
                      Passe o cursor sobre a curva para inspecionar os lançamentos diários detalhados.
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      {timelineData.busiestExpenseDay?.expenses > 0 && (
                        <span>
                          Pico de saídas: <strong className="text-rose-400">Dia {timelineData.busiestExpenseDay.day}</strong> ({formatCurrency(timelineData.busiestExpenseDay.expenses)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Render do Gráfico SVG em Linha */}
              <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-950/70 border border-white/5 p-2 sm:p-3">
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className="w-full h-44 sm:h-56 select-none cursor-crosshair overflow-visible"
                  onMouseMove={(e) => handleSvgInteraction(e.clientX, e.currentTarget)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                  onTouchMove={(e) => {
                    if (e.touches[0]) handleSvgInteraction(e.touches[0].clientX, e.currentTarget);
                  }}
                  onTouchEnd={() => setHoveredPointIndex(null)}
                >
                  <defs>
                    <linearGradient id="expRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>

                    <linearGradient id="expDespGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines Horizontais & Escala Y */}
                  {yTicks.map((val, idx) => {
                    const y = padT + plotH - (val / maxVal) * plotH;
                    return (
                      <g key={idx}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={padL + plotW}
                          y2={y}
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padL - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill="#71717A"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {val >= 1000 ? `R$${(val / 1000).toFixed(1)}k` : `R$${Math.round(val)}`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Eixo X - Dias do Mês */}
                  {xDaySteps.map((dayNum) => {
                    const idx = Math.min(dayNum - 1, timelineData.daysInMonth - 1);
                    const x = padL + (idx / (timelineData.daysInMonth - 1)) * plotW;
                    return (
                      <g key={dayNum}>
                        <line
                          x1={x}
                          y1={padT + plotH}
                          x2={x}
                          y2={padT + plotH + 4}
                          stroke="rgba(255,255,255,0.2)"
                        />
                        <text
                          x={x}
                          y={padT + plotH + 16}
                          textAnchor="middle"
                          fill="#71717A"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {String(dayNum).padStart(2, '0')}
                        </text>
                      </g>
                    );
                  })}

                  {/* Áreas Sob a Curva */}
                  <path d={revAreaPath} fill="url(#expRevGrad)" />
                  <path d={expAreaPath} fill="url(#expDespGrad)" />

                  {/* Linhas Suaves */}
                  <path
                    d={revLinePath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={expLinePath}
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Pontos nas datas com movimento */}
                  {revCoords.map((coord, i) => {
                    if (coord.pt.revenue <= 0 && !isCum) return null;
                    return (
                      <circle
                        key={`rev-pt-${i}`}
                        cx={coord.x}
                        cy={coord.y}
                        r="3"
                        fill="#10B981"
                        stroke="#18181B"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {expCoords.map((coord, i) => {
                    if (coord.pt.expenses <= 0 && !isCum) return null;
                    return (
                      <circle
                        key={`exp-pt-${i}`}
                        cx={coord.x}
                        cy={coord.y}
                        r="3.5"
                        fill="#F43F5E"
                        stroke="#18181B"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Cursor Vertical Interativo no Hover */}
                  {activeIdx !== null && (
                    <g>
                      <line
                        x1={revCoords[activeIdx].x}
                        y1={padT}
                        x2={revCoords[activeIdx].x}
                        y2={baseY}
                        stroke="#D4AF37"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.7"
                      />
                      <circle
                        cx={revCoords[activeIdx].x}
                        cy={revCoords[activeIdx].y}
                        r="5.5"
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                      <circle
                        cx={expCoords[activeIdx].x}
                        cy={expCoords[activeIdx].y}
                        r="5.5"
                        fill="#F43F5E"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>
              </div>
            </div>
          );
        })()}

        {/* VISÃO POR CATEGORIA (LIMPA, ELEGANTE E EM TONS DE OURO / SEM CORES BERRANTES) */}
        {chartViewMode === 'categories' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {financials.totalExpenses > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(financials.categoryTotals)
                  .filter(([_, total]) => total > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([catKey, total], rank) => {
                    const percent = (total / financials.totalExpenses) * 100;
                    const meta = EXPENSE_CATEGORIES_META[catKey as ExpenseCategory];
                    const isSelected = categoryFilter === catKey;

                    return (
                      <div
                        key={catKey}
                        onClick={() => {
                          setCategoryFilter(isSelected ? 'all' : (catKey as ExpenseCategory));
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                            : 'bg-zinc-900/70 border-white/5 hover:border-amber-500/30 hover:bg-zinc-900'
                        }`}
                        title="Clique para filtrar lançamentos desta categoria"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-[#D4AF37] border border-white/10">
                              #{rank + 1}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {meta.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-xs text-white">
                              {formatCurrency(total)}
                            </span>
                            <span className="text-[10px] text-zinc-400 ml-1.5 font-mono">
                              ({percent.toFixed(0)}%)
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Elegante Dourada */}
                        <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-[#D4AF37] transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Nenhuma despesa cadastrada para este mês.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#18181B] border border-white/5">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar despesa por descrição, fornecedor ou detalhe..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
          />
          <MagnifyingGlass className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
            >
              Limpar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ExpenseStatus)}
            className="h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendentes (A Pagar)</option>
            <option value="paid">Já Pagas</option>
            <option value="overdue">Vencidas</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | ExpenseCategory)}
            className="h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] max-w-[170px] truncate"
          >
            <option value="all">Todas Categorias</option>
            {Object.values(EXPENSE_CATEGORIES_META).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="p-5 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D4AF37]" />
            <span>Lançamentos do Mês ({filteredExpenses.length})</span>
          </h3>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            Nenhuma despesa encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Vencimento</th>
                  <th className="pb-3 font-semibold">Descrição / Fornecedor</th>
                  <th className="pb-3 font-semibold">Categoria</th>
                  <th className="pb-3 font-semibold">Forma / Tipo</th>
                  <th className="pb-3 font-semibold">Valor</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredExpenses.map((exp) => {
                  const meta = EXPENSE_CATEGORIES_META[exp.category] || EXPENSE_CATEGORIES_META.outros;
                  const isPaid = exp.status === 'paid';

                  return (
                    <tr key={exp.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDatePtBR(exp.dueDate)}
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-white text-xs">{exp.description}</div>
                        {exp.supplier && (
                          <span className="text-[10px] text-zinc-400 block">
                            Favorecido: {exp.supplier}
                          </span>
                        )}
                        {exp.notes && (
                          <span className="text-[10px] text-zinc-500 italic block truncate max-w-xs">
                            {exp.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bgColor} ${meta.borderColor} ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-zinc-300 uppercase text-[10px] font-semibold">
                          <span>{exp.paymentMethod}</span>
                          {exp.isRecurring && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-mono"
                              title="Despesa fixa mensal recorrente"
                            >
                              Recorrente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-bold text-white tabular-nums text-sm whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : exp.status === 'overdue'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle className="w-3 h-3" weight="fill" />
                              <span>Pago</span>
                            </>
                          ) : exp.status === 'overdue' ? (
                            <>
                              <WarningCircle className="w-3 h-3" weight="fill" />
                              <span>Vencida</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" weight="bold" />
                              <span>Pendente</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Paid Button */}
                          <button
                            onClick={() => onTogglePaid(exp.id)}
                            className={`h-7 px-2.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              isPaid
                                ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                                : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white'
                            }`}
                            title={isPaid ? 'Reabrir conta como pendente' : 'Marcar como Paga (dar baixa)'}
                          >
                            <Check className="w-3 h-3" />
                            <span>{isPaid ? 'Pago' : 'Dar Baixa'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEdit(exp)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            title="Editar despesa"
                          >
                            <PencilSimple className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => onDeleteExpense(exp.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova / Editar Despesa */}
      <NewExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingExpense}
        tenantId={tenantId}
        onSave={(data) => {
          if (editingExpense) {
            onUpdateExpense({
              ...editingExpense,
              ...data,
            });
          } else {
            onAddExpense(data);
          }
        }}
      />
    </div>
  );
};
