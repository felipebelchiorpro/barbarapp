import React, { useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Barber, Booking, TimeBlock } from '../../types';
import { calculateSlotAvailability, generateDailyTimeSlots } from '../../utils/doubleBooking';
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
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
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
  onSelectDate,
  onSelectTime,
}) => {
  // Number of 30-min slots required by the selected services (e.g., 30m = 1 slot, 60m = 2 slots)
  const slotsNeeded = Math.ceil((totalDurationMinutes || 30) / 30);

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

  // Standard daily hours: 09:00 to 20:00 (every 30 mins)
  const allSlots = useMemo(() => generateDailyTimeSlots(9, 20, 30), []);

  // Calculate slot statuses based on total duration (30 min, 60 min, etc.)
  const evaluatedSlots = useMemo(() => {
    return allSlots.map((time) => {
      return calculateSlotAvailability(
        selectedDate,
        time,
        totalDurationMinutes || 30,
        selectedBarberId,
        barbers,
        bookings,
        blocks
      );
    });
  }, [selectedDate, totalDurationMinutes, selectedBarberId, barbers, bookings, blocks, allSlots]);

  // Ensure an available slot is selected whenever date or duration changes
  useEffect(() => {
    const isCurrentValid = evaluatedSlots.some((s) => s.time === selectedTime && s.available);
    if (!isCurrentValid) {
      const firstAvailable = evaluatedSlots.find((s) => s.available);
      if (firstAvailable) {
        onSelectTime(firstAvailable.time);
      }
    }
  }, [evaluatedSlots, selectedTime, onSelectTime]);

  const selectedSlot = evaluatedSlots.find((s) => s.time === selectedTime);

  return (
    <div className="space-y-4 sm:space-y-5 text-left">
      {/* Step Header with dynamic summary */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          3. Escolha o Horário
        </h2>
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-300">
          <span className="flex items-center gap-1">
            Tempo estimado: <strong className="text-amber-400">{formatDuration(totalDurationMinutes || 30)}</strong>
          </span>
          <span className="text-zinc-600">·</span>
          <span>
            {slotsNeeded > 1 ? (
              <span className="text-amber-300 font-semibold">
                Ocupa {slotsNeeded} horários consecutivos na agenda
              </span>
            ) : (
              <span className="text-zinc-400">1 horário (30 min)</span>
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

      {/* Time Slots Grid: Only clean start times (09:00, 09:30, etc.) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Horários Disponíveis
          </label>
          <span className="text-[11px] text-zinc-400 font-medium">
            {evaluatedSlots.filter((s) => s.available).length} opções livres
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {evaluatedSlots.map((slot) => {
            const isSelected = selectedTime === slot.time;
            const isAvailable = slot.available;

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
                className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl transition-all border text-center relative min-h-[48px] select-none active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-extrabold shadow-lg shadow-amber-500/20 ring-2 ring-amber-400 scale-[1.02] z-10'
                    : isCovered
                    ? 'bg-amber-500/15 border-dashed border-amber-500/60 text-amber-300 font-semibold'
                    : isAvailable
                    ? 'bg-[#18181B] border-white/10 text-white hover:border-[#D4AF37]/50 hover:bg-[#1E1E1E]'
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
                      : 'text-zinc-600'
                  }`}
                >
                  {slot.time}
                </span>
                {isCovered && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/90 leading-none mt-0.5">
                    +30 min
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
                  Horário: {selectedSlot.time} às {selectedSlot.endTime}
                </div>
                <div className="text-zinc-400 text-xs mt-0.5">
                  {slotsNeeded > 1
                    ? `Atendimento de ${formatDuration(totalDurationMinutes)} (reserva 2 horários de 30 min na agenda)`
                    : `Atendimento de ${formatDuration(totalDurationMinutes)} (1 horário de 30 min)`}
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
              <span>Extensão (+30 min)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span>Livre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700" />
            <span>Ocupado / Indisponível</span>
          </div>
        </div>
      </div>
    </div>
  );
};
