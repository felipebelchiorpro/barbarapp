import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WarningCircle, ArrowsClockwise, House, ShieldCheck } from '@phosphor-icons/react';
import { logSystemError } from '../services/systemErrorLogService';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
  activeTenantId?: string | null;
  activeTenantName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Erro inesperado na renderização do componente.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 1. Registra o incidente silenciosamente na telemetria técnica do Super Admin
    logSystemError({
      barbearia_id: this.props.activeTenantId || null,
      barbearia_nome: this.props.activeTenantName,
      nivel: 'critico',
      modulo: 'sistema_geral',
      mensagem_erro: `React Boundary Crash: ${error.message || 'Erro de renderização'}`,
      detalhes_tecnicos: {
        errorName: error.name || 'ComponentCrashError',
        stackTrace: error.stack,
        componentStack: errorInfo.componentStack || undefined,
      },
      showToast: true,
      toastMessage: 'Não foi possível concluir a ação no momento. Tente novamente em instantes.',
    }).catch(() => {});
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isSuperAdminRoute =
        typeof window !== 'undefined' &&
        (window.location.pathname.includes('super-admin') ||
          window.location.search.includes('superadmin'));

      return (
        <div className="min-h-[480px] w-full flex items-center justify-center p-6 bg-[#0E0E10] text-zinc-200">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#161618] border border-amber-500/20 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <WarningCircle className="w-8 h-8" weight="duotone" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                Naville Plataforma
              </span>
              <h2 className="text-xl font-bold font-display text-white">
                Instabilidade Temporária
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Não foi possível concluir o carregamento desta seção no momento. O incidente foi
                registrado automaticamente para análise do suporte técnico.
              </p>
              {this.state.errorMessage && (
                <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-500/20 text-left font-mono text-[11px] text-red-300 break-words">
                  {this.state.errorMessage}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
              >
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                <span>Tentar Novamente</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer border border-white/5"
              >
                <House className="w-4 h-4" weight="regular" />
                <span>Voltar ao Início</span>
              </button>

              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('naville_tenants_v2_prod');
                    localStorage.removeItem('barbearia_ls_invoices_v1');
                    localStorage.removeItem('naville_invoices_v2_prod');
                  } catch (_) {}
                  window.location.reload();
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-medium transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/5"
                title="Limpar dados em cache deste navegador e sincronizar novamente com o servidor"
              >
                <span>Limpar Cache</span>
              </button>
            </div>

            {isSuperAdminRoute && (
              <div className="pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    window.location.href = '/super-admin?tab=diagnostics';
                  }}
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" weight="bold" />
                  <span>Acessar Central de Diagnóstico do Super Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
