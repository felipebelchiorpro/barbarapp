import React from 'react';
import {
  CalendarCheck,
  SquaresFour,
  UsersThree,
  Scissors,
  ChartLineUp,
  LockKey,
  ArrowLeft,
  X,
  Sparkle,
  CheckCircle,
  Clock,
  CreditCard,
  Wallet,
  Receipt,
  AddressBook,
  Coins,
  Crown,
  SlidersHorizontal,
  ChatDots,
  Storefront,
} from '@phosphor-icons/react';
import { TenantModulesConfig } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';

const SidebarWhatsAppIcon: React.FC<{ className?: string; weight?: string }> = ({ className = '' }) => {
  const isSelected = className.includes('text-black');
  return <WhatsAppIcon variant={isSelected ? 'monochrome' : 'official'} size={20} className={className} />;
};

export type AdminTab = 'list' | 'timeline' | 'barbers' | 'services' | 'whatsapp' | 'whatsapp-automations' | 'metrics' | 'expenses' | 'billing' | 'clients' | 'pdv' | 'club' | 'settings' | 'space';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  todayBookingsCount: number;
  activeBarbersCount: number;
  maxBarbers: number;
  activeServicesCount: number;
  pendingExpensesCount?: number;
  totalCustomersCount?: number;
  clubMembersCount?: number;
  isWhatsAppConnected?: boolean;
  isTenantBlocked?: boolean;
  isVitalicio?: boolean;
  recursoClubeAtivo?: boolean;
  recursoFinanceiroAvancado?: boolean;
  whatsappAtivo?: boolean;
  enabledModules?: TenantModulesConfig;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNavigateClient: () => void;
  onOpenBlockModal: () => void;
}

interface MenuItem {
  id: AdminTab;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  hasDot?: boolean;
  dotColor?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  todayBookingsCount,
  activeBarbersCount,
  maxBarbers,
  activeServicesCount,
  pendingExpensesCount = 0,
  totalCustomersCount = 0,
  clubMembersCount = 0,
  isWhatsAppConnected = false,
  isTenantBlocked = false,
  isVitalicio = false,
  recursoClubeAtivo = true,
  recursoFinanceiroAvancado = true,
  whatsappAtivo = true,
  enabledModules,
  isOpenMobile,
  onCloseMobile,
  onNavigateClient,
  onOpenBlockModal,
}) => {
  const menuSections: MenuSection[] = [
    {
      title: 'ATENDIMENTOS & CAIXA',
      items: [
        {
          id: 'list' as AdminTab,
          label: 'Agendamentos',
          icon: CalendarCheck,
          badge: todayBookingsCount > 0 ? String(todayBookingsCount) : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold',
        },
        {
          id: 'timeline' as AdminTab,
          label: 'Grade das Cadeiras',
          icon: SquaresFour,
        },
        {
          id: 'pdv' as AdminTab,
          label: 'PDV & Caixa do Dia',
          icon: Receipt,
        },
        {
          id: 'expenses' as AdminTab,
          label: 'Controle de Gastos',
          icon: Wallet,
          badge: pendingExpensesCount > 0 ? `${pendingExpensesCount} a pagar` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-semibold',
        },
      ],
    },
    {
      title: 'GESTÃO DA BARBEARIA',
      items: [
        {
          id: 'barbers' as AdminTab,
          label: 'Profissionais',
          icon: UsersThree,
          badge: `${activeBarbersCount}/${maxBarbers}`,
          badgeColor:
            activeBarbersCount >= maxBarbers
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold',
        },
        {
          id: 'services' as AdminTab,
          label: 'Serviços & Preços',
          icon: Scissors,
          badge: activeServicesCount > 0 ? String(activeServicesCount) : undefined,
          badgeColor: 'bg-white/10 text-zinc-300 border-white/10 font-bold',
        },
        {
          id: 'space' as AdminTab,
          label: 'Meu Espaço & Vitrine',
          icon: Storefront,
          badge: 'Vitrine',
          badgeColor: 'bg-amber-500/15 text-[#D4AF37] border-amber-500/30 font-semibold',
        },
        {
          id: 'clients' as AdminTab,
          label: 'Base de Clientes',
          icon: AddressBook,
          badge: totalCustomersCount > 0 ? String(totalCustomersCount) : undefined,
          badgeColor: 'bg-white/10 text-zinc-300 border-white/10 font-bold',
        },
        {
          id: 'club' as AdminTab,
          label: 'Clube de Assinaturas',
          icon: Crown,
          badge: clubMembersCount && clubMembersCount > 0 ? `${clubMembersCount} VIP` : 'Novo',
          badgeColor: 'bg-amber-500/20 text-[#D4AF37] border-amber-500/30 font-bold',
        },
        {
          id: 'metrics' as AdminTab,
          label: 'Desempenho',
          icon: ChartLineUp,
        },
      ],
    },
    {
      title: 'CONFIGURAÇÕES & INTEGRAÇÕES',
      items: [
        {
          id: 'settings' as AdminTab,
          label: 'Regras da Agenda',
          icon: SlidersHorizontal,
        },
        {
          id: 'whatsapp' as AdminTab,
          label: 'WhatsApp Conexão',
          icon: SidebarWhatsAppIcon,
          badge: isWhatsAppConnected ? 'Online' : 'Off',
          hasDot: true,
          dotColor: isWhatsAppConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500',
          badgeColor: isWhatsAppConnected
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : 'bg-zinc-800 text-zinc-400 border-zinc-700',
        },
        {
          id: 'whatsapp-automations' as AdminTab,
          label: 'Automações WhatsApp',
          icon: ChatDots,
          badge: 'Anti-Ban',
          badgeColor: 'bg-amber-500/20 text-[#D4AF37] border-amber-500/30 font-bold',
        },
        {
          id: 'billing' as AdminTab,
          label: 'Minha Assinatura',
          icon: CreditCard,
          badge: isTenantBlocked ? 'Inadimplente' : 'Ativo',
          hasDot: true,
          dotColor: isTenantBlocked ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400',
          badgeColor: isTenantBlocked
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-3.5 sm:p-4 bg-[#141416] text-left w-full select-none overflow-y-auto">
      {/* Top Section */}
      <div className="space-y-5">
        {/* Brand & Mobile Close Button */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#997715] flex items-center justify-center text-black shadow-md shrink-0">
              <Scissors className="w-5.5 h-5.5" weight="bold" />
            </div>
            <div>
              <span className="font-display text-sm font-extrabold tracking-wider text-white uppercase block leading-tight">
                Barbearia LS
              </span>
              <span className="text-[11px] text-amber-400 font-mono font-bold tracking-widest uppercase block mt-0.5">
                Painel do Barbeiro
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" weight="regular" />
          </button>
        </div>

        {/* Quick Action: Bloquear Horário */}
        <button
          onClick={() => {
            onOpenBlockModal();
            onCloseMobile();
          }}
          className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-amber-500/10 hover:from-amber-500/25 hover:to-amber-500/20 border border-amber-500/40 text-[#D4AF37] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition active:scale-95 shadow-sm hover:shadow-amber-500/10 cursor-pointer"
        >
          <LockKey className="w-4.5 h-4.5" weight="bold" />
          <span>Bloquear Horário / Almoço</span>
        </button>

        {/* Navigation Menu Groups */}
        <nav className="space-y-4">
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400/80 px-2.5 block">
                {section.title}
              </span>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = currentTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer gap-2 ${
                        isActive
                          ? 'bg-[#D4AF37] text-black font-bold shadow-lg shadow-amber-500/20 ring-1 ring-[#D4AF37]'
                          : 'text-zinc-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-5 h-5 shrink-0 ${isActive ? 'text-black' : 'text-zinc-400'}`}
                          weight={isActive ? 'bold' : 'regular'}
                        />
                        <span className="text-[13px] sm:text-[13.5px] truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 shrink-0 ${
                            isActive
                              ? 'bg-black/20 text-black border-black/30 font-bold'
                              : item.badgeColor
                          }`}
                        >
                          {item.hasDot && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isActive ? 'bg-black' : item.dotColor
                              }`}
                            />
                          )}
                          <span>{item.badge}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
        {/* Info do Plano */}
        <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-zinc-400 block font-semibold uppercase tracking-wider">Seu Plano</span>
            <span className="text-sm font-bold text-white">
              {maxBarbers === 1 ? '1 Barbeiro' : `${maxBarbers} Barbeiros`}
            </span>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-sm ${
              isTenantBlocked
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isTenantBlocked ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <span>{isTenantBlocked ? 'PAUSADO' : 'ATIVO'}</span>
          </span>
        </div>

        {/* Botão Ver Como Cliente */}
        <button
          onClick={() => {
            onNavigateClient();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition cursor-pointer"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-amber-400" weight="bold" />
          <span>Ver Como Cliente</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (expanded width on large screens) */}
      <aside className="hidden lg:block w-72 2xl:w-80 shrink-0 sticky top-16 h-[calc(100vh-4rem)] rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide over with dark backdrop) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[88vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
