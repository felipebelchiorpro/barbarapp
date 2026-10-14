import React from 'react';
import { Calendar, Clock, User, Phone, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Barber, Service } from '../../types';
import { formatCurrency, formatDatePtBR, formatDuration } from '../../utils/formatters';

interface StepConfirmationProps {
  services: Service[];
  barber: Barber | null;
  isAnyBarber: boolean;
  date: string;
  startTime: string;
  endTime: string;
  totalDurationMinutes: number;
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  customerNotes: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onBackToStep: (stepNumber: number) => void;
}

export const StepConfirmation: React.FC<StepConfirmationProps> = ({
  services,
  barber,
  isAnyBarber,
  date,
  startTime,
  endTime,
  totalDurationMinutes,
  totalPrice,
  customerName,
  customerPhone,
  customerNotes,
  isSubmitting,
  onConfirm,
  onBackToStep,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          5. Resumo do Agendamento
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Revise todos os detalhes antes de concluir.
        </p>
      </div>

      {/* Ticket / Receipt Card */}
      <div className="relative bg-[#18181B] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Top gold brand bar */}
        <div className="bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] p-3 text-black text-center">
          <span className="font-display font-black text-xs sm:text-sm tracking-widest uppercase">
            Comprovante Oficial de Reserva
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Services list */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Serviços Selecionados
              </span>
              <button
                onClick={() => onBackToStep(1)}
                className="text-xs font-semibold text-[#D4AF37] hover:underline"
              >
                Alterar
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold text-white">{service.name}</span>
                    <span className="text-zinc-500 text-xs ml-2">({formatDuration(service.durationMinutes)})</span>
                  </div>
                  <span className="font-mono text-zinc-300 font-medium">
                    {formatCurrency(service.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Barber & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
            {/* Barber info */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {barber?.avatarUrl ? (
                  <img
                    src={barber.avatarUrl}
                    alt={barber.name}
                    className="w-10 h-10 rounded-xl object-cover border border-amber-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-[#D4AF37] flex items-center justify-center font-bold">
                    *
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Profissional</span>
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {isAnyBarber ? 'Primeiro Disponível' : barber?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onBackToStep(2)}
                className="text-xs font-medium text-zinc-400 hover:text-[#D4AF37]"
              >
                Mudar
              </button>
            </div>

            {/* Date & Time info */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#D4AF37] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Data e Horário</span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                    <span>{formatDatePtBR(date)}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-[#D4AF37] font-extrabold tabular-nums">{startTime} às {endTime}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onBackToStep(3)}
                className="text-xs font-medium text-zinc-400 hover:text-[#D4AF37]"
              >
                Mudar
              </button>
            </div>
          </div>

          {/* Customer info */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-semibold text-white">{customerName}</span>
                <span className="text-zinc-600">·</span>
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-zinc-300 font-medium tabular-nums">{customerPhone}</span>
              </div>
              {customerNotes && (
                <p className="text-[11px] text-zinc-400 italic">
                  Obs: {customerNotes}
                </p>
              )}
            </div>
            <button
              onClick={() => onBackToStep(4)}
              className="text-xs font-medium text-zinc-400 hover:text-[#D4AF37]"
            >
              Editar
            </button>
          </div>

          {/* Perforated Divider */}
          <div className="relative py-2">
            <div className="border-b-2 border-dashed border-white/10" />
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0D0D0D]" />
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0D0D0D]" />
          </div>

          {/* Totals Section */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-zinc-400 block">
                Valor Total do Atendimento
              </span>
              <span className="text-xs text-zinc-500">
                Tempo total: {formatDuration(totalDurationMinutes)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-display font-extrabold text-[#D4AF37] tabular-nums">
                {formatCurrency(totalPrice)}
              </span>
              <span className="block text-[10px] text-zinc-500">Pagamento no local</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Action Button */}
      <button
        onClick={onConfirm}
        disabled={isSubmitting}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] text-black font-display font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Processando Agendamento...
          </span>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>Confirmar Agendamento</span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
        <span>Cancelamento gratuito até 2 horas antes do horário.</span>
      </div>
    </div>
  );
};
