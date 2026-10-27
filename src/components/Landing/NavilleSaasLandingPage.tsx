import React from 'react';
import {
  Scissors,
  Crown,
  ShieldCheck,
  Sparkle,
  CalendarCheck,
  DeviceMobile,
  CurrencyDollar,
  ArrowRight,
  CheckCircle,
  Clock,
  Storefront,
  UsersThree,
  LockKey,
  ChartLineUp,
  Lightning,
} from '@phosphor-icons/react';
import { SubscriptionPlan, TenantConfig } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { formatCurrency } from '../../utils/formatters';

interface NavilleSaasLandingPageProps {
  tenants: TenantConfig[];
  plans: SubscriptionPlan[];
  onNavigateToLogin: () => void;
  onNavigateToSuperAdmin: () => void;
  onOpenTenantLink: (slug: string, subView?: 'client' | 'admin' | 'barber') => void;
}

export const NavilleSaasLandingPage: React.FC<NavilleSaasLandingPageProps> = ({
  tenants,
  plans,
  onNavigateToLogin,
  onNavigateToSuperAdmin,
  onOpenTenantLink,
}) => {
  const activeTenants = tenants.filter((t) => t.status !== 'blocked');

  return (
    <div className="min-h-screen bg-[#09090C] text-[#F4F4F6] flex flex-col selection:bg-[#D4AF37] selection:text-black overflow-x-hidden">
      {/* Ambient Gold Luxury Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[420px] bg-[#D4AF37]/[0.07] rounded-full blur-[130px]" />
        <div className="absolute top-[45%] -right-40 w-[480px] h-[480px] bg-amber-500/[0.04] rounded-full blur-[140px]" />
      </div>

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#09090C]/85 border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7B1C] flex items-center justify-center text-black shadow-lg shadow-[#D4AF37]/20">
              <Scissors size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-tight text-white">
                  NAVILLE <span className="text-[#D4AF37]">BARBER</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  SaaS Pro 2.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Plataforma Oficial de Gestão, Agendamento & Automação para Barbearias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-200 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <LockKey size={16} className="text-[#D4AF37]" />
              <span>Entrar na Barbearia</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToSuperAdmin}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:brightness-110 text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Crown size={16} weight="fill" />
              <span>Painel Master</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkle size={14} weight="fill" />
            <span>Tecnologia Exclusiva para Barbearias de Alto Padrão</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
            Transforme sua Barbearia em uma{' '}
            <span className="bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11] bg-clip-text text-transparent">
              Máquina de Agendamentos e Fidelização
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Link exclusivo da sua barbearia (<code className="text-[#D4AF37] font-mono">/b/sua-barbearia</code>), confirmação e pós-corte automáticos no WhatsApp com motor Anti-Ban, Modo Cadeira PWA para barbeiros, PDV e Clube VIP.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href="#planos"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:brightness-110 text-black font-extrabold text-sm tracking-wide uppercase shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition-all"
            >
              <span>Ver Planos e Começar Agora</span>
              <ArrowRight size={18} weight="bold" />
            </a>

            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#141419] hover:bg-[#1C1C24] border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Storefront size={18} className="text-[#D4AF37]" />
              <span>Já sou Cliente / Acessar Painel</span>
            </button>
          </div>

          {/* Highlight Metrics Bar */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto text-left">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121216]/90 border border-white/[0.07]">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <WhatsAppIcon variant="official" size={20} />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white">WhatsApp Anti-Ban</div>
              <p className="text-xs text-zinc-400 mt-1">
                Confirmação na hora, lembrete 2h antes e mensagem de charme 30 min após o corte.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#121216]/90 border border-white/[0.07]">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-3">
                <CalendarCheck size={20} weight="fill" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white">Agendamento 24h</div>
              <p className="text-xs text-zinc-400 mt-1">
                Seu cliente agenda em 30 segundos pelo link próprio da barbearia sem precisar baixar app.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#121216]/90 border border-white/[0.07]">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
                <DeviceMobile size={20} weight="fill" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white">Modo Cadeira PWA</div>
              <p className="text-xs text-zinc-400 mt-1">
                Acesso individual para cada barbeiro finalizar cortes, lançar extras e ver sua comissão.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#121216]/90 border border-white/[0.07]">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                <ChartLineUp size={20} weight="fill" />
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white">PDV & Clube VIP</div>
              <p className="text-xs text-zinc-400 mt-1">
                Frente de caixa completo, comanda digital, controle de estoque e assinaturas recorrentes.
              </p>
            </div>
          </div>
        </section>

        {/* ACTIVE BARBERSHOPS DIRECTORY (IF ANY REAL TENANTS EXIST) */}
        {activeTenants.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">
                  Unidades Credenciadas
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-white mt-0.5">
                  Barbearias Ativas na Plataforma
                </h2>
              </div>
              <p className="text-xs text-zinc-400">
                Acesse diretamente o link de agendamento, painel do proprietário ou modo cadeira do barbeiro:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="p-5 rounded-2xl bg-[#121217] border border-[#D4AF37]/25 hover:border-[#D4AF37]/60 transition-all shadow-xl flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {tenant.logoUrl ? (
                        <img
                          src={tenant.logoUrl}
                          alt={tenant.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#D4AF37]/40"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-extrabold text-lg">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-white">{tenant.name}</h3>
                        <p className="text-xs text-zinc-400">
                          {tenant.cidade || 'Unidade Oficial'} ·{' '}
                          <span className="font-mono text-[#D4AF37]">/b/{tenant.slug}</span>
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Online
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => onOpenTenantLink(tenant.slug, 'client')}
                      className="py-2 px-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <CalendarCheck size={14} weight="bold" />
                      <span>Agendar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTenantLink(tenant.slug, 'admin')}
                      className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Crown size={14} className="text-[#D4AF37]" />
                      <span>Dono</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTenantLink(tenant.slug, 'barber')}
                      className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Scissors size={14} className="text-amber-400" />
                      <span>Barbeiro</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HOW SLUG ARCHITECTURE WORKS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-white/[0.06]">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
              Ecossistema Multi-Acesso por Slug
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1">
              Três Ambientes Integrados para cada Barbearia
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Ao cadastrar uma barbearia, o sistema gera automaticamente os links exclusivos do Cliente, do Proprietário e da equipe de Barbeiros:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[#121216] border border-white/[0.07] space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] font-mono text-xs font-bold">
                navillebarber.pro/b/sua-barbearia
              </div>
              <h3 className="text-lg font-bold text-white">1. Página do Cliente (Agendamento)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Visual Dark Luxury com as fotos, serviços e barbeiros da sua unidade. O cliente escolhe o serviço, profissional, data e horário e recebe a confirmação imediata no WhatsApp.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121216] border border-white/[0.07] space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold">
                navillebarber.pro/b/sua-barbearia/admin
              </div>
              <h3 className="text-lg font-bold text-white">2. Painel do Proprietário (Gestão)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Controle total da agenda, conexão via QR Code do WhatsApp, automações (Confirmação, Lembrete 2h, Pós-Corte 30 min e Reativação), PDV, Despesas, Estoque e Clube VIP.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121216] border border-white/[0.07] space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-500/15 text-sky-400 font-mono text-xs font-bold">
                navillebarber.pro/b/sua-barbearia/barbeiro
              </div>
              <h3 className="text-lg font-bold text-white">3. Modo Cadeira (App do Barbeiro)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Painel rápido para celular ou notebook onde o barbeiro vê sua fila do dia, adiciona bebidas/produtos na comanda e finaliza o corte (disparando o Pós-Corte 30 minutos depois).
              </p>
            </div>
          </div>
        </section>

        {/* PRICING PLANS SECTION */}
        <section id="planos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.06]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
              Planos & Investimento
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white mt-1">
              Escolha o Plano Ideal para sua Barbearia
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Sem taxa de adesão e sem comissão por corte. Valor fixo mensal com WhatsApp Anti-Ban incluso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const isRec = Boolean(plan.recommended);
              return (
                <div
                  key={plan.id}
                  className={`p-6 sm:p-7 rounded-3xl flex flex-col justify-between relative transition-all ${
                    isRec
                      ? 'bg-gradient-to-b from-[#1B1B22] to-[#121217] border-2 border-[#D4AF37] shadow-2xl shadow-[#D4AF37]/10'
                      : 'bg-[#121216] border border-white/10'
                  }`}
                >
                  {isRec && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-extrabold text-[10px] uppercase tracking-widest shadow-md">
                      Mais Escolhido
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1.5 min-h-[34px]">{plan.description}</p>

                    <div className="my-6 pb-6 border-b border-white/10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-display font-extrabold text-white">
                          {formatCurrency(plan.basePrice)}
                        </span>
                        <span className="text-xs text-zinc-400">/mês</span>
                      </div>
                      <span className="text-[11px] text-[#D4AF37] font-medium block mt-1">
                        Inclui até {plan.includedSeats} {plan.includedSeats === 1 ? 'profissional' : 'profissionais'}
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-300 mb-6">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle
                            size={16}
                            weight="fill"
                            className="text-[#D4AF37] shrink-0 mt-0.5"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isRec
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black hover:brightness-110 shadow-lg'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    Começar com {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.07] py-8 px-4 sm:px-6 lg:px-8 bg-[#070709]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-zinc-300">NAVILLE BARBER PRO</span>
            <span>·</span>
            <span>Plataforma SaaS Multi-Tenant para Barbearias</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="hover:text-[#D4AF37] transition cursor-pointer"
            >
              Login Barbearia
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onNavigateToSuperAdmin}
              className="hover:text-[#D4AF37] transition cursor-pointer"
            >
              Super Admin
            </button>
            <span>·</span>
            <span>© {new Date().getFullYear()} Naville Barber</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
