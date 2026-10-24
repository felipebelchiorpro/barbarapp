import React, { useState, useEffect } from 'react';
import { Info, X, ShieldCheck } from '@phosphor-icons/react';

interface ToastItem {
  id: string;
  message: string;
  level?: 'critico' | 'aviso' | 'erro_api';
}

export const UserFriendlyToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: CustomEvent<{ message: string; level?: 'critico' | 'aviso' | 'erro_api' }>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = {
        id,
        message: e.detail.message,
        level: e.detail.level || 'aviso',
      };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };

    window.addEventListener('naville:user-friendly-toast' as any, handleToastEvent);
    return () => {
      window.removeEventListener('naville:user-friendly-toast' as any, handleToastEvent);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto p-4 rounded-xl bg-[#18181B]/95 backdrop-blur-md border border-amber-500/30 text-white shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5">
            <Info className="w-4 h-4" weight="bold" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-amber-400">
              <ShieldCheck className="w-3 h-3" weight="bold" />
              <span>Aviso do Sistema</span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
              {t.message}
            </p>
          </div>

          <button
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            className="text-zinc-500 hover:text-zinc-300 p-1 -mr-1 -mt-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
