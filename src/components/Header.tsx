import React from 'react';
import { Scissors, ShieldCheck, Activity, Smartphone, ArrowLeft, MessageCircle, Download } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentView: 'client' | 'admin';
  onNavigate: (view: 'client' | 'admin') => void;
  onOpenWebhooks: () => void;
  onOpenQRCode: () => void;
  webhookCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenWebhooks,
  onOpenQRCode,
  webhookCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 px-3.5 sm:px-6 py-2.5 sm:py-3 w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            onClick={() => onNavigate(currentView === 'admin' ? 'client' : 'client')}
            className="flex items-center gap-2 group cursor-pointer text-left min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#997715] flex items-center justify-center text-black shadow-sm shrink-0">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-display text-sm sm:text-base font-extrabold tracking-wider text-white group-hover:text-[#D4AF37] transition-colors uppercase truncate block">
                Barbearia LS
              </span>
              {currentView === 'admin' && (
                <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase block -mt-0.5">
                  Painel de Gestão
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Right Actions: Distinct for Client vs Admin */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentView === 'admin' ? (
            /* ADMIN VIEW CONTROLS */
            <>
              {/* Webhook logs */}
              <button
                onClick={onOpenWebhooks}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-[#D4AF37] hover:border-amber-500/30 transition min-h-[36px] cursor-pointer"
                title="Logs de Disparos WhatsApp"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Webhooks</span>
                {webhookCount > 0 && (
                  <span className="text-[10px] font-mono px-1 bg-emerald-500/20 text-emerald-300 rounded font-bold">
                    {webhookCount}
                  </span>
                )}
              </button>

              {/* QR Code generator */}
              <button
                onClick={onOpenQRCode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#D4AF37] hover:bg-amber-500/20 transition min-h-[36px] cursor-pointer"
                title="Abrir no celular via QR Code"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">QR Celular</span>
              </button>

              {/* Download ZIP button */}
              <a
                href="/barbearia-ls-projeto.zip"
                download="barbearia-ls-projeto.zip"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-amber-500/30 transition min-h-[36px] cursor-pointer"
                title="Baixar Código-Fonte em ZIP"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Baixar .ZIP</span>
              </a>

              {/* Back to Client Booking */}
              <button
                onClick={() => onNavigate('client')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition min-h-[36px] cursor-pointer border border-white/10"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">Agendamento</span>
              </button>
            </>
          ) : (
            /* CLIENT VIEW CONTROLS - ULTRA CLEAN, ZERO OVERFLOW */
            <>
              {/* Mobile phone access button with QR Code */}
              <button
                onClick={onOpenQRCode}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/40 text-[#D4AF37] hover:bg-amber-500/25 transition min-h-[36px] cursor-pointer shadow-sm active:scale-95"
                title="Abrir no Celular via QR Code ou Link"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="inline">Abrir no Celular</span>
              </button>

              {/* Direct WhatsApp help link */}
              <a
                href="https://api.whatsapp.com/send?phone=5511999999999&text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20o%20agendamento%20na%20Barbearia%20LS"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xs:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/25 transition text-xs font-medium min-h-[36px]"
                title="Dúvidas no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Contato</span>
              </a>

              {/* PWA Install Button (only shows when installable) */}
              <PWAInstallButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
};
