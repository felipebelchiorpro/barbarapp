import React from 'react';
import { Scissors, ShieldCheck, Activity, Smartphone, ArrowLeft, Crown, RotateCcw } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { WhatsAppIcon } from './WhatsAppIcon';

interface HeaderProps {
  currentView: 'client' | 'admin' | 'super-admin' | 'barber';
  onNavigate: (view: 'client' | 'admin' | 'super-admin' | 'barber') => void;
  onOpenWebhooks: () => void;
  onOpenQRCode: () => void;
  webhookCount: number;
  uiVersion?: 'v1' | 'v2';
  onToggleUiVersion?: (v: 'v1' | 'v2') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenWebhooks,
  onOpenQRCode,
  webhookCount,
  uiVersion = 'v2',
  onToggleUiVersion,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 px-3.5 sm:px-6 py-2.5 sm:py-3 w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 select-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#997715] flex items-center justify-center text-black shadow-sm shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-sm sm:text-base font-extrabold tracking-wider text-white uppercase truncate block">
              {currentView === 'super-admin' ? 'Naville' : 'Barbearia LS'}
            </span>
            {currentView === 'barber' && (
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase block -mt-0.5">
                Modo Cadeira · PWA Barbeiro
              </span>
            )}
            {currentView === 'admin' && (
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase block -mt-0.5">
                Painel da Barbearia · Naville
              </span>
            )}
            {currentView === 'super-admin' && (
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase block -mt-0.5">
                Super Administrador SaaS
              </span>
            )}
            {currentView === 'client' && (
              <span className="text-[9px] text-zinc-500 font-medium tracking-tight block -mt-0.5">
                Tecnologia Naville
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: Distinct for Client vs Admin vs Super Admin vs Barber */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentView === 'super-admin' ? (
            /* SUPER ADMIN VIEW CONTROLS */
            <>
              <button
                onClick={() => onNavigate('admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition min-h-[36px] cursor-pointer border border-white/10 shadow-sm"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">Painel da Barbearia</span>
                <span className="xs:hidden">Barbearia</span>
              </button>

              <button
                onClick={() => onNavigate('barber')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition min-h-[36px] cursor-pointer"
                title="PWA do Barbeiro (Modo Cadeira)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo Cadeira</span>
                <span className="sm:hidden">Cadeira</span>
              </button>

              <button
                onClick={() => onNavigate('client')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#D4AF37] hover:bg-amber-500/20 transition min-h-[36px] cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Agendamento</span>
                <span className="xs:hidden">Cliente</span>
              </button>
            </>
          ) : currentView === 'barber' ? (
            /* BARBER PWA VIEW CONTROLS - EXCLUSIVE FOR BARBER (NO ADMIN OR CLIENT BUTTONS) */
            <div className="flex items-center gap-2">
              <span className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cadeira Conectada
              </span>
              <PWAInstallButton />
            </div>
          ) : currentView === 'admin' ? (
            /* ADMIN VIEW CONTROLS */
            <>
              {/* Switch to Barber Chair Mode */}
              <button
                onClick={() => onNavigate('barber')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/40 text-[#D4AF37] hover:bg-amber-500/25 transition min-h-[36px] cursor-pointer shadow-sm active:scale-95"
                title="Abrir PWA do Barbeiro (Modo Cadeira)"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo Cadeira</span>
                <span className="sm:hidden">Cadeira</span>
              </button>

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
            /* CLIENT VIEW CONTROLS - ULTRA CLEAN, ZERO ESCAPE/ADMIN/BARBER BUTTONS */
            <div className="flex items-center gap-2">
              {/* Version Switcher Badge (v1.0 Clássica vs v2.0 Luxury) */}
              {onToggleUiVersion && (
                <button
                  onClick={() => onToggleUiVersion(uiVersion === 'v2' ? 'v1' : 'v2')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition min-h-[36px] bg-amber-500/10 border-amber-500/30 text-[#D4AF37] hover:bg-amber-500/20 active:scale-95 cursor-pointer shadow-sm"
                  title={uiVersion === 'v2' ? 'Voltar para a Versão 1.0 (Clássica)' : 'Experimentar a Nova Versão 2.0 (Luxury Suite)'}
                >
                  {uiVersion === 'v2' ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="hidden sm:inline">v2.0 Luxury</span>
                      <span className="sm:hidden">v2</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="hidden sm:inline">v1.0 Clássica</span>
                      <span className="sm:hidden">v1</span>
                    </>
                  )}
                </button>
              )}

              {/* Direct WhatsApp help link */}
              <a
                href="https://api.whatsapp.com/send?phone=5511999999999&text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20o%20agendamento%20na%20Barbearia%20LS"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/25 transition text-xs font-semibold min-h-[36px]"
                title="Dúvidas no WhatsApp"
              >
                <WhatsAppIcon variant="official" size={16} />
                <span>Contato</span>
              </a>

              {/* PWA Install Button (only shows when installable on device) */}
              <PWAInstallButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
