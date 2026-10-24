import React, { useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { Barber, Booking, TimeBlock, Service, TenantConfig } from '../../types';
import { checkContiguousSlots } from '../../utils/doubleBooking';
import { formatCurrency, formatDuration, timeToMinutes } from '../../utils/formatters';

interface StepDateTimeProps {
  selectedDate: string;
  selectedTime: string;
  totalDurationMinutes: number;
  totalPrice: number;
  selectedBarberId: string;
  barbers: Barber[];
  bookings: Booking[];
  blocks: TimeBlock[];
  selectedServices?: Service[];
  tenantConfig?: TenantConfig;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onSelectServices?: (services: Service[]) => void;
  onSelectBarber?: (barberId: string) => void;
}

export const StepDateTime: React.FC<StepDateTimeProps> = ({
  selectedDate,
  selectedTime,
  totalDurationMinutes,
  totalPrice,
  selectedBarberId,
  barbers,
  bookings,
  blocks,
  selectedServices = [],
  tenantConfig,
  onSelectDate,
  onSelectTime,
  onSelectServices,
  onSelectBarber,
}) => {
  const slotInterval = tenantConfig?.tempo_padrao_slot || 30;
  const bufferMinutes = tenantConfig?.tempo_respiro_entre_cortes || 0;
  const effectiveTotalMinutes = totalDurationMinutes || 30;
  const slotsNeeded = Math.ceil(effectiveTotalMinutes / slotInterval);

  // Generate next 14 days
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const weekdayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNumber = d.getDate();
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      let label = weekdayName;
      if (i === 0) label = 'Hoje';
      else if (i === 1) label = 'Amanhã';

      days.push({
        dateStr,
        weekdayName,
        dayNumber,
        monthName,
        label,
        isSunday: d.getDay() === 0,
      });
    }
    return days;
  }, []);

  // Motor de validação de slots contínuos e alternativas inteligentes
  const contiguousResult = useMemo(() => {
    return checkContiguousSlots(
      selectedBarberId,
      selectedDate,
      effectiveTotalMinutes,
      barbers,
      bookings,
      blocks,
      {
        slotIntervalMinutes: slotInterval,
        bufferMinutes: bufferMinutes,
        allowManualOverlap: false,
        selectedServices,
        shopClosingTime: tenantConfig?.horario_fechamento || '20:00',
        shopOpeningHour: 9,
        shopClosingHour: 20,
      }
    );
  }, [
    selectedBarberId,
    selectedDate,
    effectiveTotalMinutes,
    barbers,
    bookings,
    blocks,
    slotInterval,
    bufferMinutes,
    selectedServices,
    tenantConfig?.horario_fechamento,
  ]);

  const evaluatedSlots = contiguousResult.slots;

  // Auto-seleciona o primeiro horário disponível válido ao trocar de data/serviço
  useEffect(() => {
    const isCurrentValid = evaluatedSlots.some((s) => s.time === selectedTime && s.available);
    if (!isCurrentValid) {
      const firstAvailable = evaluatedSlots.find((s) => s.available);
      if (firstAvailable) {
        onSelectTime(firstAvailable.time);
      } else {
        onSelectTime('');
      }
    }
  }, [evaluatedSlots, selectedTime, onSelectTime]);

  const selectedSlot = evaluatedSlots.find((s) => s.time === selectedTime);
  const primaryService = selectedServices[0];

  return (
    <div className="space-y-4 sm:space-y-5 text-left">
      {/* Step Header with dynamic summary */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          3. Escolha o Horário
        </h2>
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-300">
          <span className="flex items-center gap-1">
            Tempo estimado: <strong className="text-amber-400">{formatDuration(effectiveTotalMinutes)}</strong>
            {bufferMinutes > 0 && (
              <span className="text-[10px] text-zinc-400">(+{bufferMinutes}m intervalo)</span>
            )}
          </span>
          <span className="text-zinc-600">·</span>
          <span>
            {slotsNeeded > 1 ? (
              <span className="text-amber-300 font-semibold">
                Ocupa {slotsNeeded} horários consecutivos ({slotInterval}m cada)
              </span>
            ) : (
              <span className="text-zinc-400">1 horário ({slotInterval} min)</span>
            )}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="flex items-center gap-1">
            Valor: <strong className="text-[#D4AF37] font-mono text-sm">{formatCurrency(totalPrice)}</strong>
          </span>
        </div>
      </div>

      {/* Horizontal Date Picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
          Selecione o Dia
        </label>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar touch-pan-x">
          {calendarDays.map((item) => {
            const isSelected = item.dateStr === selectedDate;

            return (
              <button
                key={item.dateStr}
                onClick={() => onSelectDate(item.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[62px] sm:min-w-[68px] h-[72px] sm:h-[78px] rounded-2xl p-1.5 transition-all shrink-0 border select-none active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-amber-500/20 font-bold scale-[1.02]'
                    : 'bg-[#18181B] border-white/5 text-zinc-300 hover:border-white/20 hover:bg-[#1E1E1E]'
                }`}
              >
                <span className={`text-[10px] font-medium tracking-tight uppercase ${isSelected ? 'text-black/80 font-bold' : 'text-zinc-400'}`}>
                  {item.label}
                </span>
                <span className={`text-lg sm:text-xl font-display font-black leading-none mt-1 ${isSelected ? 'text-black' : 'text-white'}`}>
                  {item.dayNumber}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wide mt-0.5 ${isSelected ? 'text-black/70' : 'text-zinc-400'}`}>
                  {item.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ⚠️ ALERTA EDUCATIVO & ALTERNATIVAS INTELIGENTES QUANDO NÃO HOUVER JANELA CONTÍGUA */}
      {!contiguousResult.hasContiguousSlot && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1E1A14] to-[#161412] border border-amber-500/30 space-y-3.5 shadow-xl animate-in fade-in">
          {/* Header do Alerta */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-200 leading-snug">
                Não encontramos um horário livre com tempo suficiente para fazer todos os serviços juntos nesta data.
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                O seu combo precisa de <strong className="text-amber-300">{formatDuration(effectiveTotalMinutes)} contínuos</strong> na agenda.
                {contiguousResult.isolatedCount > 0 ? (
                  <span> Há <strong className="text-white">{contiguousResult.isolatedCount} horários de 30 min</strong> livres hoje, mas nenhum com espaço consecutivo suficiente.</span>
                ) : (
                  <span> Todos os horários deste profissional já estão preenchidos para esta data.</span>
                )}
              </p>
            </div>
          </div>

          {/* Cards de Resolução Automática em 1 Toque */}
          {contiguousResult.alternatives.hasAlternatives && (
            <div className="pt-2 border-t border-amber-500/15 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Sugestões para você não perder seu horário:
              </span>

              {/* OPÇÃO 1: Dividir ou escolher apenas o serviço principal hoje */}
              {contiguousResult.alternatives.singleServiceOption && onSelectServices && (
                <button
                  type="button"
                  onClick={() => {
                    const opt = contiguousResult.alternatives.singleServiceOption;
                    if (opt) {
                      onSelectServices([opt.service]);
                      if (opt.sampleTimes[0]) {
                        onSelectTime(opt.sampleTimes[0]);
                      }
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-[#1C1A16] border border-amber-500/30 hover:border-amber-400/80 hover:bg-amber-500/10 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                        Fazer apenas o {contiguousResult.alternatives.singleServiceOption.service.name} hoje?
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Libera instantaneamente <strong className="text-amber-300">{contiguousResult.alternatives.singleServiceOption.availableSlotsCount} horários</strong> hoje ({contiguousResult.alternatives.singleServiceOption.service.durationMinutes} min)
                        {contiguousResult.alternatives.singleServiceOption.sampleTimes.length > 0 && (
                          <span className="text-zinc-500"> (ex: {contiguousResult.alternatives.singleServiceOption.sampleTimes.slice(0, 3).join(', ')})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                    Escolher <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              )}

              {/* OPÇÃO 2: Ver outro barbeiro da casa com a janela livre hoje */}
              {contiguousResult.alternatives.otherBarberOption && onSelectBarber && (
                <button
                  type="button"
                  onClick={() => {
                    const opt = contiguousResult.alternatives.otherBarberOption;
                    if (opt) {
                      onSelectBarber(opt.barber.id);
                      onSelectTime(opt.firstAvailableTime);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-[#151D18] border border-emerald-500/30 hover:border-emerald-400/80 hover:bg-emerald-500/15 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                        O profissional {contiguousResult.alternatives.otherBarberOption.barber.name} tem horário hoje às {contiguousResult.alternatives.otherBarberOption.firstAvailableTime}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Janela completa de {formatDuration(effectiveTotalMinutes)} disponível ({contiguousResult.alternatives.otherBarberOption.totalAvailableSlots} horários livres)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                    Mudar <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              )}

              {/* OPÇÃO 3: Ver próximo dia com horários livres para ambos */}
              {contiguousResult.alternatives.nextAvailableDateOption && (
                <button
                  type="button"
                  onClick={() => {
                    const opt = contiguousResult.alternatives.nextAvailableDateOption;
                    if (opt) {
                      onSelectDate(opt.dateStr);
                      onSelectTime(opt.firstAvailableTime);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-[#18181B] border border-white/10 hover:border-[#D4AF37]/60 hover:bg-[#1E1E1E] transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                        Próxima data com horário disponível para ambos:
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        <strong className="text-[#D4AF37]">{contiguousResult.alternatives.nextAvailableDateOption.formattedDate}</strong> a partir das <strong className="text-white">{contiguousResult.alternatives.nextAvailableDateOption.firstAvailableTime}</strong>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
                    Ir para Data <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Time Slots Grid: Only clean start times (09:00, 09:30, etc.) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Horários Disponíveis
          </label>
          <div className="flex items-center gap-2 text-[11px]">
            {contiguousResult.isolatedCount > 0 && slotsNeeded > 1 && (
              <span className="text-amber-400/90 font-medium">
                {contiguousResult.isolatedCount} isolados (30m)
              </span>
            )}
            <span className="text-zinc-400 font-medium">
              {contiguousResult.availableCount} livres para o combo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {evaluatedSlots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            const isAvailable = slot.available;
            const isIsolated = slot.isIsolated;

            // If selected service takes multiple slots (e.g. 1 hour = 2 slots), check if this slot is covered
            const isCovered =
              !isSelected &&
              Boolean(selectedSlot?.available) &&
              timeToMinutes(slot.time) > timeToMinutes(selectedTime) &&
              timeToMinutes(slot.time) < timeToMinutes(selectedSlot?.endTime || selectedTime);

            return (
              <button
                key={slot.time}
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelectTime(slot.time)}
                title={
                  !isAvailable
                    ? slot.reason
                    : slotsNeeded > 1
                    ? `Iniciar às ${slot.time} (atendimento até ${slot.endTime} — ${slotsNeeded} horários)`
                    : `Horário ${slot.time}`
                }
                className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all border text-center relative min-h-[50px] select-none active:scale-95 ${
                  isSelected
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-extrabold shadow-lg shadow-amber-500/20 ring-2 ring-amber-400 scale-[1.02] z-10 cursor-pointer'
                    : isCovered
                    ? 'bg-amber-500/15 border-dashed border-amber-500/60 text-amber-300 font-semibold cursor-default'
                    : isAvailable
                    ? 'bg-[#18181B] border-white/10 text-white hover:border-[#D4AF37]/50 hover:bg-[#1E1E1E] cursor-pointer'
                    : isIsolated
                    ? 'bg-[#1E1A14]/70 border-amber-500/30 text-amber-300/80 cursor-not-allowed opacity-80'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-600 cursor-not-allowed line-through opacity-45'
                }`}
              >
                <span
                  className={`text-sm sm:text-base font-bold tabular-nums tracking-tight ${
                    isSelected
                      ? 'text-black'
                      : isCovered
                      ? 'text-amber-200 font-bold'
                      : isAvailable
                      ? 'text-white'
                      : isIsolated
                      ? 'text-amber-300 font-medium'
                      : 'text-zinc-600'
                  }`}
                >
                  {slot.time}
                </span>

                {isCovered && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/90 leading-none mt-0.5">
                    +{slotInterval}m
                  </span>
                )}

                {isIsolated && !isCovered && (
                  <span className="text-[8px] font-bold uppercase tracking-tight text-amber-400/90 leading-none mt-0.5">
                    {slot.freeDurationMinutes || slotInterval}m livre
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Slot Feedback Banner */}
        {selectedSlot && selectedSlot.available && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Horário confirmado: {selectedSlot.time} às {selectedSlot.endTime}
                </div>
                <div className="text-zinc-400 text-xs mt-0.5">
                  {slotsNeeded > 1
                    ? `Janela contínua de ${formatDuration(effectiveTotalMinutes)} (${slotsNeeded} slots consecutivos de ${slotInterval}m)`
                    : `Atendimento de ${formatDuration(effectiveTotalMinutes)} (1 horário de ${slotInterval}m)`}
                  {bufferMinutes > 0 && ` + ${bufferMinutes}m respiro`}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total do Atendimento</span>
                <span className="text-base font-extrabold text-[#D4AF37] font-mono">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
            <span>Horário Escolhido</span>
          </div>
          {slotsNeeded > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50 border border-amber-500" />
              <span>Extensão (+{slotInterval}m)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span>Livre ({formatDuration(effectiveTotalMinutes)})</span>
          </div>
          {slotsNeeded > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
              <span>Isolado (insuficiente para combo)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700" />
            <span>Ocupado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

