import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick }) => {
  const steps = [
    { num: 1, title: 'Serviços' },
    { num: 2, title: 'Profissional' },
    { num: 3, title: 'Horário' },
    { num: 4, title: 'Identificação' },
    { num: 5, title: 'Resumo' },
  ];

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-800 -z-0" />
        
        {/* Active progress fill */}
        <div 
          className="absolute left-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#D4AF37] transition-all duration-300 -z-0"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((s) => {
          const isCompleted = s.num < currentStep;
          const isCurrent = s.num === currentStep;
          const isClickable = isCompleted;

          return (
            <button
              key={s.num}
              disabled={!isClickable && !isCurrent}
              onClick={() => isClickable && onStepClick(s.num)}
              className={`relative z-10 flex flex-col items-center group transition ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-xs font-bold transition-all shadow-sm ${
                  isCompleted
                    ? 'bg-[#D4AF37] text-black ring-2 ring-amber-400'
                    : isCurrent
                    ? 'bg-white text-black ring-4 ring-[#D4AF37]/30 scale-110'
                    : 'bg-zinc-900 border border-white/10 text-zinc-500'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
              </div>

              <span
                className={`text-[10px] font-medium tracking-tight mt-1 hidden sm:block ${
                  isCurrent
                    ? 'text-white font-bold'
                    : isCompleted
                    ? 'text-amber-400'
                    : 'text-zinc-500'
                }`}
              >
                {s.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
