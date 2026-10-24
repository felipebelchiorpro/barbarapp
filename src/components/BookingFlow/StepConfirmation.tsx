import React from 'react';
import { Calendar, Clock, User, Phone, CheckCircle2, ShieldAlert, Crown, AlertTriangle } from 'lucide-react';
import { Barber, Service, ClientSubscriptionPlan } from '../../types';
import { formatCurrency, formatDatePtBR, formatDuration } from '../../utils/formatters';

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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
  activeCustomerPlan?: ClientSubscriptionPlan | null;
  isDayAllowedForPlan?: boolean;
  selectedDayOfWeek?: number;
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
  activeCustomerPlan,
  isDayAllowedForPlan,
  selectedDayOfWeek = 0,
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

      {/* VIP Recognition Banner */}
      {activeCustomerPlan && (
        isDayAllowedForPlan ? (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#D4AF37]/10 to-amber-500/5 border border-amber-500/30 flex items-center justify-between gap-3 text-left animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#D4AF37]">Membro VIP Reconhecido</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#D4AF37] text-black">
                    {activeCustomerPlan.nome}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Hoje ({WEEKDAY_NAMES[selectedDayOfWeek]}) é um dia coberto pelo seu plano! Serviços inclusos foram zerados.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-left flex items-start gap-3 animate-in fade-in">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                Aviso de Restrição de Dias do Plano
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed">
                Seu plano <strong className="text-amber-300">{activeCustomerPlan.nome}</strong> é válido apenas nos dias:{' '}
                <strong className="text-white">
                  {activeCustomerPlan.dias_permitidos.map((d) => WEEKDAY_SHORT[d]).join(', ')}
                </strong>
                . Para agendar nesta <strong className="text-white">{WEEKDAY_NAMES[selectedDayOfWeek]}</strong>, o valor avulso normal será cobrado.
              </p>
              <button
                type="button"
                onClick={() => onBackToStep(3)}
                className="text-[11px] text-[#D4AF37] underline font-bold hover:text-amber-200 mt-1 block cursor-pointer"
              >
                ← Escolher outro dia coberto pelo plano
              </button>
            </div>
          </div>
        )
      )}

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
              {services.map((service) => {
                const isCovered = Boolean(
                  activeCustomerPlan &&
                  isDayAllowedForPlan &&
                  activeCustomerPlan.servicos_inclusos.includes(service.id)
                );

                return (
                  <div
                    key={service.id}
                    className={`flex items-center justify-between text-xs sm:text-sm p-2 rounded-xl transition ${
                      isCovered ? 'bg-amber-500/10 border border-amber-500/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{service.name}</span>
                      <span className="text-zinc-500 text-xs">({formatDuration(service.durationMinutes)})</span>
                      {isCovered && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-emerald-400" />
                          Incluso no Plano VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCovered ? (
                        <>
                          <span className="line-through text-zinc-500 text-xs font-mono">
                            {formatCurrency(service.price)}
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">
                            R$ 0,00
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-zinc-300 font-medium">
                          {formatCurrency(service.price)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
            {totalPrice === 0 ? (
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-400 tabular-nums">
                  R$ 0,00
                </span>
                <span className="block text-[10px] text-emerald-400 font-bold">100% Incluso no Plano VIP</span>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-display font-extrabold text-[#D4AF37] tabular-nums">
                  {formatCurrency(totalPrice)}
                </span>
                <span className="block text-[10px] text-zinc-500">Pagamento no local</span>
              </div>
            )}
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
