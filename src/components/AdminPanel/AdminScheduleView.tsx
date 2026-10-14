import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Lock,
  MessageSquare,
  TrendingUp,
  Users,
  Search,
  LayoutGrid,
  List,
  BarChart3,
  Monitor,
  Smartphone,
  Sparkles,
  Scissors,
  Plus
} from 'lucide-react';
import { Barber, Booking, BookingStatus, TimeBlock } from '../../types';
import { formatCurrency, formatDatePtBR, formatDuration, timeToMinutes } from '../../utils/formatters';
import { generateWhatsAppDirectLink } from '../../services/webhookService';
import { generateDailyTimeSlots } from '../../utils/doubleBooking';

interface AdminScheduleViewProps {
  barbers: Barber[];
  bookings: Booking[];
  blocks: TimeBlock[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onUpdateStatus: (bookingId: string, status: BookingStatus) => void;
  onOpenBlockModal: () => void;
}

export const AdminScheduleView: React.FC<AdminScheduleViewProps> = ({
  barbers,
  bookings,
  blocks,
  selectedDate,
  onSelectDate,
  onUpdateStatus,
  onOpenBlockModal,
}) => {
  // Filters & Tabs
  const [filterBarberId, setFilterBarberId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [adminTab, setAdminTab] = useState<'timeline' | 'list' | 'metrics'>('list');
  const [devicePreview, setDevicePreview] = useState<'responsive' | 'mobile' | 'desktop'>('responsive');

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
    <div
      className={`space-y-5 sm:space-y-6 text-left mx-auto transition-all duration-200 ${
        devicePreview === 'mobile' ? 'max-w-md' : 'w-full'
      }`}
    >
      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-[#D4AF37] border border-amber-500/30">
              Painel de Gestão
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {formatDatePtBR(selectedDate)}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
            Controle da Barbearia
          </h2>
          <p className="text-xs text-zinc-400">
            Design responsivo consistente para qualquer tamanho de celular ou monitor.
          </p>
        </div>

        {/* Action Controls & Device Preview Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle (Responsive vs Mobile simulator) */}
          <div className="hidden lg:flex items-center p-1 bg-zinc-900 border border-white/5 rounded-xl text-xs">
            <button
              onClick={() => setDevicePreview('responsive')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
                devicePreview === 'responsive'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ajuste automático à tela"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Auto</span>
            </button>
            <button
              onClick={() => setDevicePreview('mobile')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
                devicePreview === 'mobile'
                  ? 'bg-[#D4AF37] text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Simular visual de celular (Mobile-First)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Celular</span>
            </button>
          </div>

          <button
            onClick={onOpenBlockModal}
            className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/30 text-[#D4AF37] hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-sm min-h-[40px]"
          >
            <Lock className="w-4 h-4" />
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
            <Users className="w-3.5 h-3.5 text-zinc-500" />
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Faturamento
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
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
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
            <AlertOctagon className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-zinc-200 tabular-nums leading-none my-1">
            {stats.noShow + stats.cancelled}
          </div>
          <div className="text-[11px] text-zinc-400 truncate">
            {stats.noShow} faltas / {stats.cancelled} canc.
          </div>
        </div>
      </div>

      {/* Sub-view switcher: Lista / Grade de Cadeiras / Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#18181B] border border-white/5 p-2 rounded-2xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar touch-pan-x">
          <button
            onClick={() => setAdminTab('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap min-h-[36px] ${
              adminTab === 'list'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista de Clientes</span>
          </button>

          <button
            onClick={() => setAdminTab('timeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap min-h-[36px] ${
              adminTab === 'timeline'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grade das Cadeiras</span>
          </button>

          <button
            onClick={() => setAdminTab('metrics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap min-h-[36px] ${
              adminTab === 'metrics'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Desempenho</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Barber selector */}
          <select
            value={filterBarberId}
            onChange={(e) => setFilterBarberId(e.target.value)}
            className="h-9 px-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] max-w-[150px] truncate"
          >
            <option value="all">Todos Barbeiros</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status selector */}
          {adminTab === 'list' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] max-w-[140px] truncate"
            >
              <option value="all">Todos Status</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Concluídos</option>
              <option value="no_show">Faltas</option>
              <option value="cancelled">Cancelados</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: LISTA OPERACIONAL (Consistent card layout on all mobile screens) */}
      {adminTab === 'list' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nome, telefone ou serviço..."
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#18181B] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                Limpar
              </button>
            )}
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
                const waLink = generateWhatsAppDirectLink(
                  booking.customerPhone,
                  `Olá, ${booking.customerName}! Tudo pronto para seu atendimento hoje às ${booking.startTime} com ${booking.barberName} na Barbearia LS?`
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
                        <span className="flex items-center gap-1 font-medium text-zinc-300">
                          <User className="w-3 h-3 text-amber-500/80 shrink-0" />
                          {booking.barberName}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="flex items-center gap-1 font-mono text-zinc-400">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
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

                    {/* Bottom Action Bar: Evenly spaced touch actions (Mobile-friendly >= 40px) */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      {/* WhatsApp trigger */}
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 px-3 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition border border-emerald-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 flex-1 min-w-0"
                        title="Conversar no WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span className="truncate">WhatsApp</span>
                      </a>

                      {/* Action buttons when confirmed */}
                      {booking.status === 'confirmed' ? (
                        <>
                          <button
                            onClick={() => onUpdateStatus(booking.id, 'completed')}
                            className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm flex-1 min-w-0"
                            title="Marcar como Concluído"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">Concluir</span>
                          </button>

                          <button
                            onClick={() => onUpdateStatus(booking.id, 'no_show')}
                            className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition border border-orange-500/20 flex items-center justify-center cursor-pointer shrink-0"
                            title="Marcar Falta (No-Show)"
                          >
                            <AlertOctagon className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onUpdateStatus(booking.id, 'cancelled')}
                            className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition border border-red-500/20 flex items-center justify-center cursor-pointer shrink-0"
                            title="Cancelar e Liberar Horário"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-zinc-500 italic pr-2">
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
                                    <Lock className="w-3 h-3 text-amber-400" />
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
                                  <Plus className="w-3 h-3" /> Livre
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
                <Scissors className="w-4 h-4 text-amber-400" />
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
                <Clock className="w-4 h-4 text-amber-400" />
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Cabelo + Barba (1h)
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
    </div>
  );
};
