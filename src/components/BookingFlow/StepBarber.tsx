import React from 'react';
import { Star, Check, Users } from 'lucide-react';
import { Barber } from '../../types';

interface StepBarberProps {
  barbers: Barber[];
  selectedBarberId: string; // 'any' or barber id
  onSelectBarber: (barberId: string) => void;
}

export const StepBarber: React.FC<StepBarberProps> = ({
  barbers,
  selectedBarberId,
  onSelectBarber,
}) => {
  const hasMultipleBarbers = barbers.length > 1;

  return (
    <div className="space-y-3.5 sm:space-y-4 text-left">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          2. Escolha o Profissional
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
          {hasMultipleBarbers
            ? 'Você pode optar pelo primeiro barbeiro disponível ou escolher seu especialista de preferência.'
            : 'Atendimento exclusivo e personalizado com nosso profissional de referência.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {/* "Any Barber Available" Card - Only shown when there are multiple barbers */}
        {hasMultipleBarbers && (
          <div
            onClick={() => onSelectBarber('any')}
            className={`group p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer border text-left flex items-center justify-between gap-3 min-h-[68px] select-none active:scale-[0.99] ${
              selectedBarberId === 'any'
                ? 'bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-lg shadow-amber-500/5'
                : 'bg-[#18181B] border-white/5 hover:border-white/15 hover:bg-[#1E1E1E]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-200 transition-colors font-display truncate">
                  Qualquer profissional disponível
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Maior disponibilidade de horários hoje
                </p>
              </div>
            </div>

            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                  selectedBarberId === 'any'
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-sm'
                    : 'border-white/20 bg-zinc-800/80 group-hover:border-white/40'
                }`}
              >
                {selectedBarberId === 'any' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>
        )}

        {/* Individual Barbers */}
        {barbers.map((barber) => {
          // If only 1 barber, always consider it selected or check if it matches
          const isSelected = selectedBarberId === barber.id || (!hasMultipleBarbers && selectedBarberId === 'any');

          return (
            <div
              key={barber.id}
              onClick={() => onSelectBarber(barber.id)}
              className={`group p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer border text-left flex items-start justify-between gap-3 select-none active:scale-[0.99] ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-lg shadow-amber-500/5'
                  : 'bg-[#18181B] border-white/5 hover:border-white/15 hover:bg-[#1E1E1E]'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                {/* Barber Avatar */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-zinc-800">
                  <img
                    src={barber.avatarUrl}
                    alt={barber.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-amber-200 transition-colors font-display">
                      {barber.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="tabular-nums font-bold">{barber.rating.toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                    {barber.role}
                  </p>

                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {barber.bio}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {barber.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Radio Checkbox */}
              <div className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-sm'
                      : 'border-white/20 bg-zinc-800/80 group-hover:border-white/40'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
