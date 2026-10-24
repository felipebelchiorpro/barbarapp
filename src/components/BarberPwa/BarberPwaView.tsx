import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  Scissors,
  Receipt,
  Coins,
  Clock,
  CheckCircle,
  Play,
  Check,
  Plus,
  Trash,
  User,
  ShieldCheck,
  SignOut,
  Sparkle,
  DeviceMobile,
  ArrowRight,
  ArrowsClockwise,
  WarningCircle,
  CurrencyDollar,
  Storefront,
  EyeSlash,
  ChatCircleText,
} from '@phosphor-icons/react';
import {
  Booking,
  Barber,
  TenantConfig,
  AuthUser,
  AuthSession,
  BarberExtraItem,
  ChairOrder,
} from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';
import {
  DEFAULT_BARBER_EXTRAS,
  getSavedChairOrders,
  addExtraItemToChairOrder,
  removeExtraItemFromChairOrder,
  completeChairOrder,
  calculateBarberPerformance,
} from '../../services/authService';

interface BarberPwaViewProps {
  currentUser: AuthUser;
  tenant: TenantConfig;
  barbers: Barber[];
  bookings: Booking[];
  onUpdateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  onOpenLoginModal: () => void;
  isTenantBlocked?: boolean;
}

export const BarberPwaView: React.FC<BarberPwaViewProps> = ({
  currentUser,
  tenant,
  barbers,
  bookings,
  onUpdateBookingStatus,
  onOpenLoginModal,
  isTenantBlocked = false,
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'extras' | 'comissao' | 'perfil'>('agenda');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [chairOrders, setChairOrders] = useState<Record<string, ChairOrder>>(() => getSavedChairOrders());
  const [inProgressTimers, setInProgressTimers] = useState<Record<string, number>>({});
  const [extrasSuccessToast, setExtrasSuccessToast] = useState<string | null>(null);

  // Escuta atualizações de comandas da cadeira
  useEffect(() => {
    const handleOrdersUpdate = (e: any) => {
      setChairOrders(getSavedChairOrders());
    };
    window.addEventListener('naville:chair-orders-updated', handleOrdersUpdate);
    return () => window.removeEventListener('naville:chair-orders-updated', handleOrdersUpdate);
  }, []);

  // Identifica o profissional ativo correspondente ao usuário logado
  const resolvedBarber = useMemo(() => {
    if (currentUser.barber_id) {
      const match = barbers.find((b) => b.id === currentUser.barber_id);
      if (match) return match;
    }
    return barbers[0] || {
      id: 'barber-default',
      name: currentUser.name,
      nickname: currentUser.name.split(' ')[0],
      avatarUrl: currentUser.avatarUrl || '',
      role: 'Barbeiro Profissional',
    };
  }, [barbers, currentUser]);

  // FILTRAGEM ESTRITA DE ZERO TRUST: Apenas agendamentos atribuídos ao barbeiro logado
  const myBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesBarber = b.barberId === resolvedBarber.id || b.barberName === resolvedBarber.name;
      const matchesDate = b.date === selectedDate;
      return matchesBarber && matchesDate;
    });
  }, [bookings, resolvedBarber, selectedDate]);

  // Seletor automático do primeiro atendimento em progresso ou do dia
  useEffect(() => {
    if (!activeBookingId && myBookings.length > 0) {
      const inProgress = myBookings.find((b) => chairOrders[b.id]?.status === 'in_progress');
      if (inProgress) {
        setActiveBookingId(inProgress.id);
      } else {
        setActiveBookingId(myBookings[0].id);
      }
    }
  }, [myBookings, activeBookingId, chairOrders]);

  // Cálculo de comissões estrito (sem ver dados dos outros barbeiros ou da empresa)
  const performance = useMemo(() => {
    return calculateBarberPerformance(
      resolvedBarber.id,
      resolvedBarber.name,
      bookings,
      chairOrders,
      currentUser.commissionRate || 0.5
    );
  }, [resolvedBarber, bookings, chairOrders, currentUser.commissionRate]);

  // Iniciar atendimento na cadeira
  const handleStartService = (booking: Booking) => {
    onUpdateBookingStatus(booking.id, 'confirmed'); // Mantém confirmado ou em andamento
    // Inicializa a comanda se não existir
    addExtraItemToChairOrder(
      booking.id,
      booking.customerName,
      resolvedBarber.id,
      tenant.id,
      booking.totalPrice,
      {
        id: 'base-service',
        name: booking.services.map((s) => s.name).join(' + '),
        type: 'service',
        price: 0,
        category: 'Corte Base',
      }
    );
    setActiveBookingId(booking.id);
    setActiveTab('extras');
  };

  // Finalizar atendimento na cadeira
  const handleFinishService = (bookingId: string) => {
    completeChairOrder(bookingId);
    onUpdateBookingStatus(bookingId, 'completed');
    setExtrasSuccessToast('Atendimento concluído com sucesso e comanda enviada ao balcão!');
    setTimeout(() => setExtrasSuccessToast(null), 4000);
  };

  // Adicionar item extra com 1 toque
  const handleAddExtra = (item: BarberExtraItem) => {
    if (!activeBookingId) {
      alert('Selecione um cliente ativo na agenda para lançar extras.');
      return;
    }
    const currentBooking = myBookings.find((b) => b.id === activeBookingId) || bookings.find((b) => b.id === activeBookingId);
    if (!currentBooking) return;

    addExtraItemToChairOrder(
      activeBookingId,
      currentBooking.customerName,
      resolvedBarber.id,
      tenant.id,
      currentBooking.totalPrice,
      item
    );

    setExtrasSuccessToast(`+ ${item.name} (${formatCurrency(item.price)}) adicionado à comanda!`);
    setTimeout(() => setExtrasSuccessToast(null), 3000);
  };

  const currentOrder = activeBookingId ? chairOrders[activeBookingId] : null;
  const activeBooking = bookings.find((b) => b.id === activeBookingId);

  return (
    <div className="w-full max-w-lg mx-auto pb-24 text-left select-none animate-in fade-in">
      {/* 1. TOP APP BAR PWA MOBILE (FIXA NO TOPO) */}
      <header className="sticky top-0 z-30 p-3.5 sm:p-4 rounded-b-3xl bg-[#141416]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl flex items-center justify-between gap-3">
        {/* Avatar & Identificação do Barbeiro */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#8C6D1F] p-0.5 shadow-md">
              <img
                src={resolvedBarber.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'}
                alt={resolvedBarber.name}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#141416] animate-pulse"
              title="Disponível na Cadeira"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold font-display text-white truncate">
                {resolvedBarber.name}
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-amber-500/15 text-[#D4AF37] border border-amber-500/30">
                Cadeira
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
              <Storefront className="w-3 h-3 text-[#D4AF37]" />
              <span>{tenant.name}</span>
            </p>
          </div>
        </div>

        {/* Ações Rápidas: Alternar Perfil & Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLoginModal}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Alternar Papel / Usuário"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Trocar Perfil</span>
          </button>
        </div>
      </header>

      {/* KILL SWITCH ALERT BANNER (CASO A BARBEARIA ESTEJA BLOQUEADA) */}
      {isTenantBlocked && (
        <div className="m-3 p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-red-900/30 to-black border border-rose-500/40 text-rose-200 text-xs space-y-1 shadow-xl">
          <div className="flex items-center gap-2 font-bold text-rose-300">
            <WarningCircle className="w-4 h-4 text-rose-400" weight="fill" />
            <span>Acesso da Barbearia Suspenso</span>
          </div>
          <p className="text-[11px] text-rose-300/80 leading-relaxed">
            A assinatura da barbearia está em atraso. Entre em contato com o proprietário para regularizar o plano.
          </p>
        </div>
      )}

      {/* TOAST DE FEEDBACK DE EXTRAS */}
      {extrasSuccessToast && (
        <div className="mx-3 mt-3 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" weight="fill" />
          <span className="font-semibold">{extrasSuccessToast}</span>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      <main className="p-3.5 sm:p-4 space-y-4">
        {/* ============================================================== */}
        {/* TAB 1: MINHA AGENDA DE HOJE (CRONOLÓGICA & ATENDIMENTO RÁPIDO) */}
        {/* ============================================================== */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            {/* Header da Agenda com Navegação por Dias */}
            <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">
                    Minha Agenda Individual
                  </span>
                  <h2 className="text-base font-bold font-display text-white">
                    {formatDatePtBR(selectedDate)}
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-lg font-extrabold font-mono text-[#D4AF37] block">
                    {myBookings.length}
                  </span>
                  <span className="text-[10px] text-zinc-400 block -mt-0.5">atendimentos</span>
                </div>
              </div>

              {/* Seletor Rápido de Data (Hoje / Amanhã) */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                {[
                  { label: 'Hoje', daysOffset: 0 },
                  { label: 'Amanhã', daysOffset: 1 },
                  { label: 'Depois', daysOffset: 2 },
                ].map((item) => {
                  const d = new Date();
                  d.setDate(d.getDate() + item.daysOffset);
                  const dateStr = d.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={item.label}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        isSelected
                          ? 'bg-[#D4AF37] text-black shadow-md shadow-amber-500/20'
                          : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista dos Atendimentos do Barbeiro */}
            {myBookings.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#18181B] border border-white/5 text-center space-y-2">
                <Scissors className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-xs font-bold text-zinc-300">Nenhum atendimento para esta data</p>
                <p className="text-[11px] text-zinc-500">
                  Novos clientes que agendarem com você aparecerão automaticamente aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map((booking) => {
                  const order = chairOrders[booking.id];
                  const hasExtras = order && order.items.length > 0;
                  const isCompleted = booking.status === 'completed';
                  const isCurrentActive = activeBookingId === booking.id;

                  return (
                    <div
                      key={booking.id}
                      className={`p-4 rounded-2xl transition border ${
                        isCurrentActive
                          ? 'bg-gradient-to-r from-[#1E1C18] to-[#18181B] border-amber-500/40 shadow-lg'
                          : isCompleted
                          ? 'bg-[#18181B]/50 border-white/5 opacity-75'
                          : 'bg-[#18181B] border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Topo do Card: Horário & Status */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {booking.startTime} - {booking.endTime}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ({booking.totalMinutes}m)
                          </span>
                        </div>

                        <div>
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" weight="bold" />
                              <span>Concluído</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Confirmado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dados do Cliente e Serviços */}
                      <div className="py-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-white">
                            {booking.customerName}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {booking.services.map((s) => s.name).join(' + ')}
                          </p>
                          {booking.customerNotes && (
                            <p className="text-[11px] text-amber-300/80 italic mt-1">
                              "{booking.customerNotes}"
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-sm font-extrabold text-[#D4AF37] block">
                            {formatCurrency(order ? order.totalWithExtras : booking.totalPrice)}
                          </span>
                          {hasExtras && (
                            <span className="text-[9px] font-mono text-emerald-400 block">
                              +{order.items.length} extra(s)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação na Cadeira */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        {/* WhatsApp do Cliente */}
                        <a
                          href={`https://wa.me/55${booking.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá ${booking.customerName}! Sou o barbeiro ${resolvedBarber.name} da ${tenant.name}. Já estou preparando a cadeira para seu horário das ${booking.startTime}!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <WhatsAppIcon variant="official" size={16} />
                          <span className="text-[11px]">Avisar</span>
                        </a>

                        <div className="flex items-center gap-2">
                          {/* Lançar Extras */}
                          <button
                            onClick={() => {
                              setActiveBookingId(booking.id);
                              setActiveTab('extras');
                            }}
                            className="h-9 px-3 rounded-xl bg-[#1E1C18] hover:bg-[#D4AF37]/20 border border-amber-500/30 text-[#D4AF37] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" weight="bold" />
                            <span>Extras</span>
                          </button>

                          {/* Finalizar Corte */}
                          {!isCompleted && (
                            <button
                              onClick={() => handleFinishService(booking.id)}
                              className="h-9 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                            >
                              <Check className="w-3.5 h-3.5" weight="bold" />
                              <span>Finalizar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: COMANDA NA CADEIRA (LANÇAMENTO RÁPIDO DE EXTRAS & PRODUTOS) */}
        {/* ============================================================== */}
        {activeTab === 'extras' && (
          <div className="space-y-4">
            {/* Header com o Cliente Selecionado */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">
                Comanda em Andamento na Cadeira
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-display text-white">
                    {activeBooking?.customerName || 'Nenhum cliente selecionado'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {activeBooking?.services.map((s) => s.name).join(' + ') || 'Selecione na agenda'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-500 block uppercase font-bold">Subtotal Atual</span>
                  <span className="text-xl font-extrabold font-mono text-[#D4AF37]">
                    {formatCurrency(currentOrder?.totalWithExtras || activeBooking?.totalPrice || 0)}
                  </span>
                </div>
              </div>

              {/* Seletor de Cliente caso haja mais de 1 atendimento */}
              {myBookings.length > 1 && (
                <div className="pt-2 border-t border-white/5">
                  <label className="text-[10px] text-zinc-400 font-semibold block mb-1">
                    Trocar cliente da comanda:
                  </label>
                  <select
                    value={activeBookingId || ''}
                    onChange={(e) => setActiveBookingId(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    {myBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.startTime} - {b.customerName} ({b.services.map((s) => s.name).join(' + ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Catálogo com 1 Toque de Serviços Extras e Produtos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkle className="w-4 h-4 text-amber-400" />
                  Extras & Produtos de Cadeira
                </span>
                <span className="text-[11px] text-zinc-500">Toque para adicionar</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {DEFAULT_BARBER_EXTRAS.map((extra) => (
                  <button
                    key={extra.id}
                    onClick={() => handleAddExtra(extra)}
                    className="p-3 rounded-2xl bg-[#18181B] hover:bg-[#201D17] border border-white/5 hover:border-amber-500/40 text-left transition cursor-pointer active:scale-95 group flex flex-col justify-between min-h-[88px] shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 mb-1">
                        <span className="uppercase">{extra.category}</span>
                        <Plus className="w-3.5 h-3.5 text-amber-400 group-hover:scale-125 transition" weight="bold" />
                      </div>
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-white line-clamp-2 leading-snug">
                        {extra.name}
                      </span>
                    </div>

                    <div className="mt-2 text-right">
                      <span className="font-mono text-xs font-extrabold text-[#D4AF37]">
                        +{formatCurrency(extra.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Itens Adicionados na Comanda Atual */}
            {currentOrder && currentOrder.items.length > 0 && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Itens adicionados nesta cadeira:</span>
                  <span className="font-mono text-emerald-400">
                    +{formatCurrency(currentOrder.additionalTotal)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {currentOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[#18181B] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="font-medium text-zinc-300">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-zinc-200">
                          {formatCurrency(item.price)}
                        </span>
                        <button
                          onClick={() => removeExtraItemFromChairOrder(currentOrder.bookingId, item.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition cursor-pointer"
                          title="Remover da comanda"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Finalizar atendimento */}
                <button
                  onClick={() => handleFinishService(currentOrder.bookingId)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:from-[#e5bd47] hover:to-[#c49215] text-black text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-xl shadow-amber-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" weight="bold" />
                  <span>Concluir Corte e Enviar Comanda ao Balcão</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MINHAS COMISSÕES & DESEMPENHO (VISÃO ESTRITAMENTE RESTRITA) */}
        {/* ============================================================== */}
        {activeTab === 'comissao' && (
          <div className="space-y-4">
            {/* Aviso de Privacidade Rigoroso RLS */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <EyeSlash className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" weight="fill" />
              <div className="space-y-0.5">
                <span className="font-bold block">Privacidade e Isolamento Blindado (RLS)</span>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Você está visualizando estritamente suas próprias comissões e atendimentos. Dados globais de faturamento da empresa, despesas e números de outros profissionais são restritos à administração.
                </p>
              </div>
            </div>

            {/* Grid dos Cards de Desempenho Pessoal */}
            <div className="grid grid-cols-2 gap-3">
              {/* Comissão Hoje */}
              <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Minha Comissão Hoje</span>
                <div className="text-2xl font-extrabold font-mono text-[#D4AF37]">
                  {formatCurrency(performance.todayCommission)}
                </div>
                <span className="text-[10px] text-emerald-400 font-medium block">
                  {performance.todayServicesCount} atendimento(s) concluído(s)
                </span>
              </div>

              {/* Comissão no Mês */}
              <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Minha Comissão no Mês</span>
                <div className="text-2xl font-extrabold font-mono text-emerald-400">
                  {formatCurrency(performance.monthCommission)}
                </div>
                <span className="text-[10px] text-zinc-400 font-medium block">
                  {performance.monthServicesCount} serviços realizados
                </span>
              </div>
            </div>

            {/* Parâmetros do Barbeiro */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400 block">Taxa de Comissão Acordada</span>
                <strong className="text-white font-mono text-sm">
                  {Math.round(performance.commissionRate * 100)}% por serviço
                </strong>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-zinc-300 border border-white/10 font-mono">
                Repasse Quinzenal
              </span>
            </div>

            {/* Histórico dos Últimos Atendimentos Concluídos */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
                Últimos Atendimentos Pagos
              </span>

              {performance.recentCompletions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#18181B] border border-white/5 text-center text-xs text-zinc-500">
                  Nenhum atendimento concluído registrado hoje.
                </div>
              ) : (
                <div className="space-y-2">
                  {performance.recentCompletions.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#18181B] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{item.customerName}</span>
                        <span className="text-[10px] text-zinc-400">{item.serviceName}</span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 block">
                          +{formatCurrency(item.commission)}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          Total: {formatCurrency(item.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MEU PERFIL & CONFIGURAÇÕES DA CADEIRA */}
        {/* ============================================================== */}
        {activeTab === 'perfil' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-[#18181B] border border-white/10 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#8C6D1F] p-0.5 mx-auto shadow-lg">
                <img
                  src={resolvedBarber.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'}
                  alt={resolvedBarber.name}
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-white font-display">
                  {resolvedBarber.name}
                </h2>
                <p className="text-xs text-[#D4AF37] font-semibold">{resolvedBarber.role}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {tenant.name} · {tenant.cidade || 'São Paulo - SP'}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Avaliação</span>
                  <strong className="text-amber-400 font-bold">★ 4.98</strong>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Comissão</span>
                  <strong className="text-white font-bold">{Math.round((currentUser.commissionRate || 0.5) * 100)}%</strong>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase">Papel RBAC</span>
                  <strong className="text-emerald-400 font-bold uppercase">{currentUser.role}</strong>
                </div>
              </div>
            </div>

            {/* Ações de Sessão do Barbeiro */}
            <div className="space-y-2">
              <button
                onClick={onOpenLoginModal}
                className="w-full p-3.5 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/5 text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <SignOut className="w-4 h-4 text-amber-400" />
                  <span>Encerrar Sessão / Trocar Barbeiro</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 2. BARRA DE NAVEGAÇÃO INFERIOR PWA (THUMB ZONE REACHABILITY) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#141416]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-around max-w-lg mx-auto shadow-2xl">
        {/* Tab 1: Agenda */}
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'agenda' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <CalendarCheck className="w-5 h-5" weight={activeTab === 'agenda' ? 'fill' : 'regular'} />
          <span className="text-[10px] font-bold">Minha Agenda</span>
        </button>

        {/* Tab 2: Extras da Cadeira */}
        <button
          onClick={() => setActiveTab('extras')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer relative ${
            activeTab === 'extras' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Scissors className="w-5 h-5" weight={activeTab === 'extras' ? 'fill' : 'regular'} />
          <span className="text-[10px] font-bold">Lançar Extras</span>
          {currentOrder && currentOrder.items.length > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        {/* Tab 3: Minhas Comissões */}
        <button
          onClick={() => setActiveTab('comissao')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'comissao' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Coins className="w-5 h-5" weight={activeTab === 'comissao' ? 'fill' : 'regular'} />
          <span className="text-[10px] font-bold">Comissões</span>
        </button>

        {/* Tab 4: Perfil */}
        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'perfil' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <User className="w-5 h-5" weight={activeTab === 'perfil' ? 'fill' : 'regular'} />
          <span className="text-[10px] font-bold">Perfil</span>
        </button>
      </nav>
    </div>
  );
};
