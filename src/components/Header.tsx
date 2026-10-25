import React from 'react';
import { Scissors, ShieldCheck, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { AuthSession } from '../types';

interface HeaderProps {
  currentView: 'client' | 'admin' | 'super-admin' | 'barber' | 'login';
  onNavigate: (view: 'client' | 'admin' | 'super-admin' | 'barber' | 'login') => void;
  onOpenWebhooks?: () => void;
  onOpenQRCode?: () => void;
  webhookCount?: number;
  brandName?: string;
  uiVersion?: 'v1' | 'v2';
  onToggleUiVersion?: (v: 'v1' | 'v2') => void;
  authSession?: AuthSession | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  brandName,
  authSession,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 px-3.5 sm:px-6 py-2.5 sm:py-3 w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 select-none">
          <img
            src="/naville_logo_white.png"
            alt="Naville"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0"
          />
          <div className="min-w-0">
            <span className="font-display text-sm sm:text-base font-extrabold tracking-wider text-white uppercase truncate block">
              {brandName || (currentView === 'super-admin' ? 'Naville' : 'Naville Barber')}
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
            {currentView === 'login' && (
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase block -mt-0.5">
                Portal de Acesso Seguro
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: Distinct for Client vs Admin vs Super Admin vs Barber */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentView === 'super-admin' ? (
            /* SUPER ADMIN VIEW CONTROLS */
            <div className="flex items-center gap-2">
              {authSession && (
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-900 border border-amber-500/30 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-semibold text-white">Super Admin</span>
                </div>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-red-200 border border-red-500/30 transition min-h-[36px] cursor-pointer"
                  title="Sair do Super Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          ) : currentView === 'barber' ? (
            /* BARBER PWA VIEW CONTROLS */
            <div className="flex items-center gap-2">
              <span className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cadeira Conectada
              </span>
              <PWAInstallButton />
              {/* Se o barbeiro for habilitado pelo dono, pode alternar para o painel de dono */}
              {authSession?.user?.canAccessAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25 transition min-h-[36px] cursor-pointer"
                  title="Acessar Painel do Dono"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Painel Dono</span>
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition min-h-[36px] cursor-pointer"
                  title="Encerrar sessão da cadeira"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>
          ) : currentView === 'admin' ? (
            /* ADMIN VIEW CONTROLS - SEM BOTÕES DE TESTE (WEBHOOKS, QR, SETINHA) */
            <div className="flex items-center gap-2">
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

              {/* Informações do Usuário Autenticado */}
              {authSession && (
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 text-xs">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-[#D4AF37] font-bold flex items-center justify-center text-[10px]">
                    {authSession.user.name.charAt(0)}
                  </div>
                  <span className="font-medium text-zinc-300 max-w-[120px] truncate">{authSession.user.name}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                    {authSession.user.role === 'owner' ? 'Dono' : authSession.user.role === 'superadmin' ? 'Master' : 'Barbeiro'}
                  </span>
                </div>
              )}

              {/* Botão de Logout Seguro */}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-red-200 border border-red-500/30 transition min-h-[36px] cursor-pointer"
                  title="Sair do painel administrativo"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          ) : currentView === 'login' ? (
            /* LOGIN VIEW CONTROLS */
            <button
              onClick={() => onNavigate('client')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition min-h-[36px] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Voltar ao Agendamento</span>
            </button>
          ) : (
            /* CLIENT VIEW - Acesso Profissional Seguro */
            <button
              onClick={() => onNavigate('login')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-amber-500/30 transition cursor-pointer min-h-[32px]"
              title="Acesso restrito para barbeiros e proprietários"
            >
              <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden xs:inline">Área Profissional</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
