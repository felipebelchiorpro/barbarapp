import React from 'react';
import { Check, Clock, Sparkles, Scissors } from 'lucide-react';
import { Service } from '../../types';
import { formatCurrency, formatDuration } from '../../utils/formatters';

interface StepServicesProps {
  services: Service[];
  selectedServiceIds: string[];
  onToggleService: (service: Service) => void;
}

export const StepServices: React.FC<StepServicesProps> = ({
  services,
  selectedServiceIds,
  onToggleService,
}) => {
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const currentTotalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const currentTotalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const slotsCount = Math.ceil((currentTotalDuration || 30) / 30);

  return (
    <div className="space-y-3.5 sm:space-y-4 text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          1. Escolha o que vai fazer hoje
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
          Selecione os serviços desejados. O valor e o tempo se adaptam automaticamente — procedimentos de 1 hora reservam 2 horários na agenda.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900 border border-white/10 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
          <Scissors className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <strong className="text-zinc-200 block font-semibold">Sem complicação de estilo</strong>
          <span className="text-zinc-400 leading-relaxed block mt-0.5">
            Corte na tesoura, máquina, disfarçado ou clássico: <strong className="text-amber-300">é tudo o mesmo valor</strong> e leva 30 minutos na cadeira.
          </span>
        </div>
      </div>

      {/* Live Variable Price & Slots Calculator Bar */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-[#D4AF37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-[#D4AF37] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-zinc-200 font-bold">
              {selectedServices.length === 1
                ? selectedServices[0].name
                : `${selectedServices.length} serviços selecionados (${selectedServices.map((s) => s.name).join(' + ')})`}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Tempo: <strong className="text-zinc-200">{formatDuration(currentTotalDuration)}</strong>{' '}
              {slotsCount > 1 ? (
                <span className="text-amber-400 font-semibold">
                  · Ocupará {slotsCount} horários consecutivos
                </span>
              ) : (
                <span>· 1 horário de 30 min</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Variável</span>
          <span className="text-base font-extrabold text-[#D4AF37] font-mono tabular-nums">
            {formatCurrency(currentTotalPrice)}
          </span>
        </div>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 gap-2.5">
        {services.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id);
          const isCombo = service.durationMinutes === 60;

          return (
            <div
              key={service.id}
              onClick={() => onToggleService(service)}
              className={`group relative p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer border text-left flex items-center justify-between gap-3 select-none active:scale-[0.99] min-h-[88px] sm:min-h-[82px] ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border-[#D4AF37] shadow-lg shadow-amber-500/5 ring-1 ring-[#D4AF37]'
                  : 'bg-[#18181B] border-white/5 hover:border-white/15 hover:bg-[#1E1E1E]'
              }`}
            >
              {service.imageUrl && (
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-white/10 shrink-0 hidden xs:block"
                />
              )}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate group-hover:text-amber-200 transition-colors font-display">
                    {service.name}
                  </h3>
                  {isCombo && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#D4AF37] bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 whitespace-nowrap">
                      <Sparkles className="w-2.5 h-2.5" /> 1 Hora (2 Horários)
                    </span>
                  )}
                  {service.popular && !isCombo && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap">
                      Mais pedido
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                  {service.description}
                </p>

                {/* Duration & Price */}
                <div className="flex items-center gap-2 mt-2 text-xs font-medium">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <strong>{formatDuration(service.durationMinutes)}</strong>
                  </span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="font-extrabold text-white tabular-nums text-xs sm:text-sm">
                    {formatCurrency(service.price)}
                  </span>
                </div>
              </div>

              {/* Checkbox Trigger */}
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-sm'
                      : 'border-white/20 bg-zinc-800/80 group-hover:border-white/40'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
