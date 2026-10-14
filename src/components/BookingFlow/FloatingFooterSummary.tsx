import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { formatCurrency, formatDuration } from '../../utils/formatters';

interface FloatingFooterSummaryProps {
  currentStep: number;
  totalSteps: number;
  selectedServicesCount: number;
  totalDurationMinutes: number;
  totalPrice: number;
  canProceed: boolean;
  onNext: () => void;
}

export const FloatingFooterSummary: React.FC<FloatingFooterSummaryProps> = ({
  currentStep,
  selectedServicesCount,
  totalDurationMinutes,
  totalPrice,
  canProceed,
  onNext,
}) => {
  // If on the final confirmation step, hide floating summary since the big button is on the ticket
  if (currentStep === 5) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-lg border-t border-white/10 p-3 sm:p-4 shadow-2xl pb-safe">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Left info: services, duration & total */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>
              {selectedServicesCount === 0
                ? 'Nenhum serviço'
                : `${selectedServicesCount} ${selectedServicesCount === 1 ? 'serviço' : 'serviços'}`}
            </span>
            {totalDurationMinutes > 0 && (
              <>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="flex items-center gap-1 text-zinc-300">
                  <Clock className="w-3 h-3 text-[#D4AF37]" />
                  {formatDuration(totalDurationMinutes)}
                </span>
              </>
            )}
          </div>
          <div className="text-base sm:text-lg font-extrabold text-white mt-0.5 tabular-nums">
            {formatCurrency(totalPrice)}
          </div>
        </div>

        {/* Right action button */}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`h-12 px-5 sm:px-6 rounded-xl font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-lg ${
            canProceed
              ? 'bg-[#D4AF37] text-black hover:bg-[#E5C158] shadow-amber-500/20'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
