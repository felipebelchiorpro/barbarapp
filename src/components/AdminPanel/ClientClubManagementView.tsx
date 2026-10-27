import React, { useState, useMemo } from 'react';
import {
  Crown,
  Plus,
  PencilSimple,
  Trash,
  CheckCircle,
  WarningCircle,
  Clock,
  CurrencyDollar,
  UsersThree,
  Calendar,
  Scissors,
  ArrowClockwise,
  Check,
  X,
  MagnifyingGlass,
  Sparkle,
  Coins,
  ShieldCheck,
  Funnel,
  Lock,
  CreditCard,
  Storefront,
  LinkSimple,
  ArrowSquareOut,
  UserPlus,
} from '@phosphor-icons/react';
import {
  ClientSubscriptionPlan,
  CustomerProfile,
  Service,
  ClientSubscriptionStatus,
  ClientBillingMethod,
  AssinaturaModalidade,
} from '../../types';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { WhatsAppIcon } from '../WhatsAppIcon';
import {
  getTodayDateString,
  addDaysToDate,
  isSubscriptionExpired,
  canTenantUseGatewayRecurrence,
} from '../../services/subscriptionValidator';

interface ClientClubManagementViewProps {
  plans: ClientSubscriptionPlan[];
  customers: CustomerProfile[];
  services: Service[];
  tenantId: string;
  tenantPlan?: 'starter' | 'pro' | 'enterprise' | 'partner';
  onOpenUpgradeModal?: () => void;
  onAddPlan: (newPlan: Omit<ClientSubscriptionPlan, 'id' | 'createdAt'>) => void;
  onUpdatePlan: (plan: ClientSubscriptionPlan) => void;
  onDeletePlan: (planId: string) => void;
  onUpdateCustomer: (customer: CustomerProfile) => void;
}

const WEEKDAYS = [
  { day: 1, label: 'Seg', name: 'Segunda-feira' },
  { day: 2, label: 'Ter', name: 'Terça-feira' },
  { day: 3, label: 'Qua', name: 'Quarta-feira' },
  { day: 4, label: 'Qui', name: 'Quinta-feira' },
  { day: 5, label: 'Sex', name: 'Sexta-feira' },
  { day: 6, label: 'Sáb', name: 'Sábado' },
  { day: 0, label: 'Dom', name: 'Domingo' },
];

export const ClientClubManagementView: React.FC<ClientClubManagementViewProps> = ({
  plans,
  customers,
  services,
  tenantId,
  tenantPlan = 'starter',
  onOpenUpgradeModal,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  onUpdateCustomer,
}) => {
  const today = getTodayDateString();
  const gatewayPermission = canTenantUseGatewayRecurrence(tenantPlan);

  // Sub-abas: 'plans' (Gestão dos Planos) ou 'members' (Lista de Assinantes)
  const [activeTab, setActiveTab] = useState<'plans' | 'members'>('plans');

  // Filtros na listagem de membros
  const [memberFilterStatus, setMemberFilterStatus] = useState<string>('all');
  const [memberFilterModality, setMemberFilterModality] = useState<string>('all');
  const [memberSearch, setMemberSearch] = useState<string>('');

  // Modal de Criação / Edição de Plano
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ClientSubscriptionPlan | null>(null);
  const [planFormData, setPlanFormData] = useState<{
    nome: string;
    descricao: string;
    preco_mensal: string;
    servicos_inclusos: string[];
    dias_permitidos: number[];
    isUnlimited: boolean;
    limite_cortes_mes: string;
    permite_barba: boolean;
    ativo: boolean;
    link_mercado_pago: string;
  }>({
    nome: '',
    descricao: '',
    preco_mensal: '',
    servicos_inclusos: [],
    dias_permitidos: [1, 2, 3, 4, 5, 6],
    isUnlimited: true,
    limite_cortes_mes: '0',
    permite_barba: false,
    ativo: true,
    link_mercado_pago: '',
  });

  // Modal Nível 1: Ativação Manual de Assinatura no Balcão
  const [isManualActivateModalOpen, setIsManualActivateModalOpen] = useState(false);
  const [manualCustomerId, setManualCustomerId] = useState<string>('');
  const [manualPlanId, setManualPlanId] = useState<string>('');
  const [manualStartDate, setManualStartDate] = useState<string>(today);

  // Modal de Troca de Plano do Membro
  const [editingMember, setEditingMember] = useState<CustomerProfile | null>(null);
  const [selectedChangePlanId, setSelectedChangePlanId] = useState<string>('');

  // Toast / feedback de ação rápida
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Helper de cálculo de status efetivo do membro
  const getCustomerEffectiveStatus = (c: CustomerProfile): 'ativo' | 'vencido' | 'cancelado' | 'sem_plano' => {
    if (!c.plano_assinatura_id || !c.status_assinatura || c.status_assinatura === 'sem_plano') {
      return 'sem_plano';
    }
    if (c.status_assinatura === 'cancelado') return 'cancelado';
    const dueDate = c.data_vencimento || c.data_renovacao;
    if (dueDate && isSubscriptionExpired(dueDate, today)) {
      return 'vencido';
    }
    if (c.status_assinatura === 'atrasado' || c.status_assinatura === 'vencido') {
      return 'vencido';
    }
    return 'ativo';
  };

  // Métricas do Clube de Assinaturas
  const stats = useMemo(() => {
    const activeSubscribers = customers.filter(
      (c) => getCustomerEffectiveStatus(c) === 'ativo'
    );
    const overdueSubscribers = customers.filter(
      (c) => getCustomerEffectiveStatus(c) === 'vencido'
    );

    // Receita Recorrente Mensal (MRR) estimada do Clube
    const mrr = activeSubscribers.reduce((sum, c) => {
      const plan = plans.find((p) => p.id === c.plano_assinatura_id);
      return sum + (plan?.preco_mensal || plan?.valor_mensal || 0);
    }, 0);

    const totalCutsUsed = customers.reduce(
      (sum, c) => sum + (c.cortes_utilizados_mes || 0),
      0
    );

    return {
      activeCount: activeSubscribers.length,
      overdueCount: overdueSubscribers.length,
      mrr,
      totalCutsUsed,
    };
  }, [customers, plans, today]);

  // Lista de Membros Filtrada
  const filteredMembers = useMemo(() => {
    return customers.filter((c) => {
      // 1. Busca
      const matchSearch =
        c.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        c.phone.includes(memberSearch);

      if (!matchSearch) return false;

      // 2. Status Efetivo
      const effStatus = getCustomerEffectiveStatus(c);
      if (memberFilterStatus === 'subscribers' && effStatus === 'sem_plano') return false;
      if (memberFilterStatus === 'active' && effStatus !== 'ativo') return false;
      if (memberFilterStatus === 'overdue' && effStatus !== 'vencido') return false;
      if (memberFilterStatus === 'cancelled' && effStatus !== 'cancelado') return false;
      if (memberFilterStatus === 'non_subscribers' && effStatus !== 'sem_plano') return false;

      // 3. Modalidade
      const mod = c.modalidade_assinatura || (c.forma_cobranca === 'cartao' ? 'recorrente_gateway' : 'manual');
      if (memberFilterModality === 'manual' && mod !== 'manual') return false;
      if (memberFilterModality === 'gateway' && mod !== 'recorrente_gateway') return false;

      return true;
    });
  }, [customers, memberFilterStatus, memberFilterModality, memberSearch, today]);

  // Handlers do Modal de Plano
  const handleOpenNewPlan = () => {
    setEditingPlan(null);
    setPlanFormData({
      nome: '',
      descricao: '',
      preco_mensal: '',
      servicos_inclusos: services.length > 0 ? [services[0].id] : [],
      dias_permitidos: [1, 2, 3, 4, 5, 6],
      isUnlimited: true,
      limite_cortes_mes: '0',
      permite_barba: false,
      ativo: true,
      link_mercado_pago: '',
    });
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: ClientSubscriptionPlan) => {
    setEditingPlan(plan);
    const isZeroOrNull = plan.limite_cortes_mes === null || plan.limite_cortes_mes === 0;
    setPlanFormData({
      nome: plan.nome,
      descricao: plan.descricao || '',
      preco_mensal: (plan.valor_mensal || plan.preco_mensal || 0).toFixed(2),
      servicos_inclusos: plan.servicos_inclusos ? [...plan.servicos_inclusos] : [],
      dias_permitidos: plan.dias_permitidos ? [...plan.dias_permitidos] : [1, 2, 3, 4, 5, 6],
      isUnlimited: isZeroOrNull,
      limite_cortes_mes: !isZeroOrNull ? String(plan.limite_cortes_mes) : '4',
      permite_barba: Boolean(plan.permite_barba),
      ativo: plan.ativo !== false,
      link_mercado_pago: plan.link_mercado_pago || '',
    });
    setIsPlanModalOpen(true);
  };

  const handleToggleDay = (dayIndex: number) => {
    setPlanFormData((prev) => {
      const exists = prev.dias_permitidos.includes(dayIndex);
      const nextDays = exists
        ? prev.dias_permitidos.filter((d) => d !== dayIndex)
        : [...prev.dias_permitidos, dayIndex].sort();
      return { ...prev, dias_permitidos: nextDays };
    });
  };

  const handleToggleService = (serviceId: string) => {
    setPlanFormData((prev) => {
      const exists = prev.servicos_inclusos.includes(serviceId);
      const nextServices = exists
        ? prev.servicos_inclusos.filter((id) => id !== serviceId)
        : [...prev.servicos_inclusos, serviceId];
      return { ...prev, servicos_inclusos: nextServices };
    });
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(planFormData.preco_mensal.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) return;
    if (planFormData.dias_permitidos.length === 0) return;
    if (planFormData.servicos_inclusos.length === 0) return;

    const limitVal = planFormData.isUnlimited
      ? 0
      : parseInt(planFormData.limite_cortes_mes, 10) || 0;

    const linkMp = gatewayPermission.allowed ? planFormData.link_mercado_pago.trim() : undefined;

    if (editingPlan) {
      onUpdatePlan({
        ...editingPlan,
        nome: planFormData.nome.trim(),
        valor_mensal: priceNum,
        preco_mensal: priceNum,
        descricao: planFormData.descricao.trim(),
        servicos_inclusos: planFormData.servicos_inclusos,
        dias_permitidos: planFormData.dias_permitidos,
        limite_cortes_mes: limitVal,
        permite_barba: planFormData.permite_barba,
        ativo: planFormData.ativo,
        link_mercado_pago: linkMp,
      });
      triggerFeedback(`Plano "${planFormData.nome}" atualizado com sucesso!`);
    } else {
      onAddPlan({
        barbearia_id: tenantId,
        nome: planFormData.nome.trim(),
        valor_mensal: priceNum,
        preco_mensal: priceNum,
        descricao: planFormData.descricao.trim(),
        servicos_inclusos: planFormData.servicos_inclusos,
        dias_permitidos: planFormData.dias_permitidos,
        limite_cortes_mes: limitVal,
        permite_barba: planFormData.permite_barba,
        ativo: planFormData.ativo,
        link_mercado_pago: linkMp,
      });
      triggerFeedback(`Novo plano "${planFormData.nome}" cadastrado com sucesso!`);
    }

    setIsPlanModalOpen(false);
  };

  // NÍVEL 1: Ação Rápida de Renovar (+30 dias)
  const handleRenewMember = (customer: CustomerProfile) => {
    const baseDate = customer.data_renovacao && customer.data_renovacao > today ? customer.data_renovacao : today;
    const nextDate = addDaysToDate(baseDate, 30);

    onUpdateCustomer({
      ...customer,
      status_assinatura: 'ativo',
      data_renovacao: nextDate,
      data_vencimento: nextDate,
      cortes_utilizados_mes: 0, // Zera a cota do novo ciclo de 30 dias
    });

    triggerFeedback(`Assinatura de ${customer.name} renovada com sucesso até ${nextDate}! Cota zerada.`);
  };

  // NÍVEL 1: Ação de Cancelar Assinatura
  const handleCancelMember = (customer: CustomerProfile) => {
    onUpdateCustomer({
      ...customer,
      status_assinatura: 'cancelado',
    });
    triggerFeedback(`Plano de ${customer.name} cancelado.`);
  };

  // NÍVEL 1: Ativação Manual de Assinatura via Modal
  const handleOpenManualActivate = (customer?: CustomerProfile) => {
    setManualCustomerId(customer ? customer.id : customers[0]?.id || '');
    setManualPlanId(plans[0]?.id || '');
    setManualStartDate(today);
    setIsManualActivateModalOpen(true);
  };

  const handleConfirmManualActivation = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === manualCustomerId);
    const plan = plans.find((p) => p.id === manualPlanId);
    if (!customer || !plan) return;

    const dueDate = addDaysToDate(manualStartDate, 30);

    onUpdateCustomer({
      ...customer,
      plano_assinatura_id: plan.id,
      status_assinatura: 'ativo',
      modalidade_assinatura: 'manual',
      data_inicio_plano: manualStartDate,
      data_renovacao: dueDate,
      data_vencimento: dueDate,
      forma_cobranca: 'dinheiro_balcao',
      cortes_utilizados_mes: 0,
    });

    setIsManualActivateModalOpen(false);
    triggerFeedback(`Assinatura manual ativada para ${customer.name} (${plan.nome})! Vencimento em ${dueDate}.`);
  };

  // Troca de Plano via Modal Simples
  const handleSaveChangePlan = () => {
    if (!editingMember) return;
    const plan = plans.find((p) => p.id === selectedChangePlanId);
    const nextDate = addDaysToDate(today, 30);

    onUpdateCustomer({
      ...editingMember,
      plano_assinatura_id: plan ? plan.id : null,
      status_assinatura: plan ? 'ativo' : 'sem_plano',
      modalidade_assinatura: plan ? 'manual' : undefined,
      data_inicio_plano: plan ? (editingMember.data_inicio_plano || today) : undefined,
      data_renovacao: plan ? nextDate : undefined,
      data_vencimento: plan ? nextDate : undefined,
      cortes_utilizados_mes: 0,
    });

    setEditingMember(null);
    triggerFeedback(plan ? `Plano alterado para ${plan.nome} com sucesso!` : 'Cliente desvinculado do clube.');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Toast de Feedback */}
      {actionFeedback && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" weight="bold" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 1. Header com Título & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-[#D4AF37] border border-amber-500/30 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" weight="fill" />
              Recorrência & Mensalistas
            </span>
            <span className="text-xs text-zinc-400">Manual no Balcão ou Mercado Pago</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-1">
            Clube de Assinaturas da Barbearia
          </h2>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenManualActivate()}
            className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 border border-white/10 active:scale-95 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#D4AF37]" weight="bold" />
            <span>+ Ativar Assinatura Manual</span>
          </button>

          <button
            onClick={handleOpenNewPlan}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5A93C] hover:from-[#c5a02e] hover:to-[#d89b30] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" weight="bold" />
            <span>+ Criar Novo Plano</span>
          </button>
        </div>
      </div>

      {/* Banner de Isolamento Arquitetural de Gateway - Mercado Pago 100% do Dono */}
      <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <CreditCard className="w-5 h-5" weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Gateway Próprio da Barbearia · Mercado Pago</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">
                100% Direto na sua Conta
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
              As assinaturas recorrentes dos seus clientes são processadas diretamente no seu Mercado Pago. A Naville não retém dinheiro e não cobra nenhuma comissão sobre essa receita.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 font-mono text-[11px] text-sky-300 font-bold self-end sm:self-center">
          Taxa Naville: 0%
        </div>
      </div>

      {/* 2. 4 Cards de Métricas do Clube */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#141416] border border-amber-500/30 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Assinantes Ativos</span>
            <Crown className="w-4 h-4 text-[#D4AF37]" weight="fill" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#E5A93C] mt-1">
            {stats.activeCount}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Membros com mensalidade em dia</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>MRR Estimado (Recorrência)</span>
            <CurrencyDollar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 mt-1">
            {formatCurrency(stats.mrr)}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Receita garantida todo mês</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Cortes Usados no Ciclo</span>
            <Scissors className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-300 mt-1">
            {stats.totalCutsUsed}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Atendimentos usufruídos</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Assinaturas Vencidas</span>
            <WarningCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono mt-1 ${stats.overdueCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
            {stats.overdueCount}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Aguardando renovação balcão</span>
        </div>
      </div>

      {/* 3. Sub-Abas: Gestão de Planos vs Membros Assinantes */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-[#D4AF37] text-black font-extrabold shadow'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          <Crown className="w-4 h-4" weight="fill" />
          <span>Planos do Clube ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'members'
              ? 'bg-[#D4AF37] text-black font-extrabold shadow'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
          }`}
        >
          <UsersThree className="w-4 h-4" weight="bold" />
          <span>Membros Assinantes ({customers.filter((c) => c.status_assinatura && c.status_assinatura !== 'sem_plano').length})</span>
        </button>
      </div>

      {/* 4. CONTEÚDO DA ABA 1: PLANOS DO CLUBE */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-2xl bg-[#141416] border border-white/5 text-zinc-500">
              <Crown className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-400">Nenhum plano de assinatura cadastrado ainda.</p>
              <p className="text-xs text-zinc-500 mt-1">Crie planos mensais (ex: R$ 59,90/mês) para fidelizar seus clientes com agendamentos recorrentes.</p>
              <button
                onClick={handleOpenNewPlan}
                className="mt-4 px-4 py-2 rounded-xl bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c5a02e] transition"
              >
                + Criar Primeiro Plano
              </button>
            </div>
          ) : (
            plans.map((plan) => {
              const includedServices = services.filter((s) =>
                plan.servicos_inclusos?.includes(s.id)
              );
              const membersCount = customers.filter(
                (c) => c.plano_assinatura_id === plan.id && getCustomerEffectiveStatus(c) === 'ativo'
              ).length;
              const price = plan.valor_mensal || plan.preco_mensal || 0;
              const isUnlimited = plan.limite_cortes_mes === null || plan.limite_cortes_mes === 0;

              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-3xl bg-[#141416] border transition-all flex flex-col justify-between ${
                    plan.ativo
                      ? 'border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'border-white/5 opacity-60'
                  }`}
                >
                  <div>
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {plan.ativo ? 'Plano Ativo' : 'Venda Pausada'}
                          </span>
                          {plan.permite_barba && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              🧔 Barba Inclusa
                            </span>
                          )}
                          {plan.link_mercado_pago && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> Mercado Pago
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white font-display mt-2">
                          {plan.nome}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold font-mono text-[#E5A93C]">
                          {formatCurrency(price)}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">/mês</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                      {plan.descricao}
                    </p>

                    {/* Dias Permitidos na Semana */}
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Dias Válidos na Semana
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {WEEKDAYS.map((w) => {
                          const isAllowed = plan.dias_permitidos?.includes(w.day);
                          return (
                            <span
                              key={w.day}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                                isAllowed
                                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-amber-500/40'
                                  : 'bg-zinc-800/40 text-zinc-600 border border-white/5 line-through'
                              }`}
                              title={isAllowed ? `Permitido em ${w.name}` : `Bloqueado em ${w.name}`}
                            >
                              {w.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Serviços Cobertos */}
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Serviços Cobertos
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {includedServices.map((s) => (
                          <span
                            key={s.id}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/5 font-medium"
                          >
                            ✂️ {s.name}
                          </span>
                        ))}
                        {plan.permite_barba && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                            🧔 Barba Completa
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Limite de Cortes */}
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                      <span>Cota Mensal de Cortes:</span>
                      <strong className="text-zinc-200 font-mono">
                        {isUnlimited ? 'Ilimitado ♾️ (0)' : `${plan.limite_cortes_mes} cortes/mês`}
                      </strong>
                    </div>

                    {/* Total de Assinantes Vinculados */}
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                      <span>Assinantes Ativos:</span>
                      <strong className="text-amber-400 font-mono">
                        {membersCount} cliente(s)
                      </strong>
                    </div>

                    {/* Link do Mercado Pago se configurado */}
                    {plan.link_mercado_pago && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 text-[11px]">Checkout Recorrente:</span>
                        <a
                          href={plan.link_mercado_pago}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono text-[11px]"
                        >
                          <LinkSimple className="w-3.5 h-3.5" />
                          <span>Link MP</span>
                          <ArrowSquareOut className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Ações do Card */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditPlan(plan)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                      title="Editar plano"
                    >
                      <PencilSimple className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePlan(plan.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Excluir plano"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. CONTEÚDO DA ABA 2: LISTAGEM DE MEMBROS ASSINANTES */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca de Membros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#141416] border border-white/5">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar membro por nome ou telefone..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Filtros por Status e Modalidade */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Filtro Status */}
              {[
                { id: 'all', label: 'Todos' },
                { id: 'active', label: 'Ativos' },
                { id: 'overdue', label: 'Vencidos' },
                { id: 'cancelled', label: 'Cancelados' },
                { id: 'non_subscribers', label: 'Sem Plano' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMemberFilterStatus(f.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold transition border cursor-pointer ${
                    memberFilterStatus === f.id
                      ? 'bg-amber-500/20 text-[#D4AF37] border-amber-500/40'
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <span className="text-zinc-600 hidden sm:inline">|</span>

              {/* Filtro Modalidade */}
              {[
                { id: 'all', label: 'Todas Mod.' },
                { id: 'manual', label: 'Manual (Balcão)' },
                { id: 'gateway', label: 'Mercado Pago' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMemberFilterModality(m.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold transition border cursor-pointer ${
                    memberFilterModality === m.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela / Cards de Membros */}
          <div className="rounded-2xl bg-[#141416] border border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Nenhum cliente encontrado com os filtros selecionados.
                </div>
              ) : (
                filteredMembers.map((customer) => {
                  const currentPlan = plans.find((p) => p.id === customer.plano_assinatura_id);
                  const effectiveStatus = getCustomerEffectiveStatus(customer);
                  const isSubscriber = effectiveStatus !== 'sem_plano';
                  const isOverdue = effectiveStatus === 'vencido';
                  const isCancelled = effectiveStatus === 'cancelado';
                  const isManualModality = (customer.modalidade_assinatura || 'manual') === 'manual';
                  const dueDate = customer.data_vencimento || customer.data_renovacao;

                  return (
                    <div
                      key={customer.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          effectiveStatus === 'ativo'
                            ? 'bg-[#D4AF37] text-black shadow-md shadow-amber-500/20'
                            : isOverdue
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {customer.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">
                              {customer.name}
                            </h4>
                            {effectiveStatus === 'ativo' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                                <Crown className="w-3 h-3" weight="fill" />
                                Membro VIP Ativo
                              </span>
                            )}
                            {isOverdue && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1">
                                <WarningCircle className="w-3 h-3" weight="fill" />
                                Assinatura Vencida
                              </span>
                            )}
                            {isCancelled && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold">
                                Cancelado
                              </span>
                            )}
                            {effectiveStatus === 'sem_plano' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                                Cliente Avulso
                              </span>
                            )}

                            {/* Badge de Modalidade (Manual vs Gateway) */}
                            {isSubscriber && (
                              <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${
                                isManualModality
                                  ? 'bg-zinc-800 text-amber-300 border-amber-500/30'
                                  : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                              }`}>
                                {isManualModality ? (
                                  <>
                                    <Storefront className="w-3 h-3 text-amber-400" />
                                    <span>Balcão / Manual</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-3 h-3 text-sky-400" />
                                    <span>Recorrente MP</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                            <a
                              href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-emerald-400 flex items-center gap-1 font-mono transition"
                            >
                              <WhatsAppIcon variant="official" size={14} />
                              {formatPhone(customer.phone)}
                            </a>
                            {currentPlan && (
                              <>
                                <span>·</span>
                                <span className="text-amber-400 font-semibold">
                                  {currentPlan.nome} ({formatCurrency(currentPlan.valor_mensal || currentPlan.preco_mensal)}/mês)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Informações de Cota e Ações Rápidas */}
                      <div className="flex items-center gap-4 self-end sm:self-auto flex-wrap">
                        {currentPlan && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                              Uso no Mês
                            </span>
                            <span className="text-xs font-bold text-white font-mono">
                              {customer.cortes_utilizados_mes || 0}
                              {currentPlan.limite_cortes_mes && currentPlan.limite_cortes_mes > 0
                                ? ` / ${currentPlan.limite_cortes_mes}`
                                : ' (Ilimitado)'}
                            </span>
                            {dueDate && (
                              <span className={`text-[10px] block font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>
                                Vencimento: {dueDate}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          {/* NÍVEL 1: Botão de Renovar +30 dias para pagamentos no balcão */}
                          {isSubscriber && (
                            <button
                              onClick={() => handleRenewMember(customer)}
                              className="h-8 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Confirmar pagamento no balcão e renovar vigência por +30 dias"
                            >
                              <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
                              <span>Renovar +30d</span>
                            </button>
                          )}

                          {/* Trocar ou Ativar Plano */}
                          <button
                            onClick={() => {
                              if (!isSubscriber) {
                                handleOpenManualActivate(customer);
                              } else {
                                setEditingMember(customer);
                                setSelectedChangePlanId(customer.plano_assinatura_id || (plans[0]?.id || ''));
                              }
                            }}
                            className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/5 text-xs font-semibold transition cursor-pointer"
                          >
                            {isSubscriber ? 'Trocar Plano' : '+ Ativar Manual'}
                          </button>

                          {isSubscriber && (
                            <button
                              onClick={() => handleCancelMember(customer)}
                              className="h-8 px-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Cancelar plano do membro"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR OU EDITAR PLANO DO CLUBE */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#141416] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#D4AF37]" weight="fill" />
                {editingPlan ? 'Editar Plano do Clube' : 'Criar Novo Plano do Clube'}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clube do Corte Bronze ou Plano Black VIP"
                  value={planFormData.nome}
                  onChange={(e) => setPlanFormData({ ...planFormData, nome: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Valor Mensal (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="59,90"
                    value={planFormData.preco_mensal}
                    onChange={(e) => setPlanFormData({ ...planFormData, preco_mensal: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Cota Mensal de Cortes (0 = Ilimitado)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPlanFormData({ ...planFormData, isUnlimited: !planFormData.isUnlimited })}
                      className={`h-10 px-3 rounded-xl text-xs font-bold transition border ${
                        planFormData.isUnlimited
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-zinc-900 text-zinc-400 border-white/10'
                      }`}
                    >
                      {planFormData.isUnlimited ? 'Ilimitado ♾️ (0)' : 'Cota Fixa'}
                    </button>
                    {!planFormData.isUnlimited && (
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={planFormData.limite_cortes_mes}
                        onChange={(e) => setPlanFormData({ ...planFormData, limite_cortes_mes: e.target.value })}
                        className="w-20 h-10 px-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono text-center"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Switch: Permite Barba no Plano? */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Incluir Barba no Plano? (permite_barba)</span>
                  <span className="text-[11px] text-zinc-400">Libera atendimento de barba 100% coberto pelo clube.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={planFormData.permite_barba}
                    onChange={(e) => setPlanFormData({ ...planFormData, permite_barba: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
                </label>
              </div>

              {/* NÍVEL 2: Travamento de Feature & Upgrade (Plano Pro / Mercado Pago) */}
              <div className="pt-2">
                {gatewayPermission.allowed ? (
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-zinc-900/80 border border-sky-500/30">
                    <label className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      <span>Link Recorrente Mercado Pago (link_mercado_pago)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=..."
                      value={planFormData.link_mercado_pago}
                      onChange={(e) => setPlanFormData({ ...planFormData, link_mercado_pago: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-sky-400 placeholder:text-zinc-600"
                    />
                    <p className="text-[10px] text-zinc-400">
                      Cole a URL da assinatura criada no painel do Mercado Pago para permitir checkout com cartão recorrente.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#18181B] to-amber-500/5 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#D4AF37]" weight="bold" />
                        <span className="text-xs font-bold text-white">Recorrência Automática Mercado Pago</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-amber-500/30 uppercase tracking-wider">
                        Recurso Pro
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Automatize cobranças mensais no cartão de crédito via Mercado Pago com renovação e corte de cota 100% automáticos.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlanModalOpen(false);
                        onOpenUpgradeModal?.();
                      }}
                      className="h-8 px-3 rounded-lg bg-[#D4AF37] hover:bg-[#c5a02e] text-black font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkle className="w-3.5 h-3.5" weight="fill" />
                      <span>Fazer Upgrade / Ativar com Suporte</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Benefícios / Descrição do Plano
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cortes e barbas com café expresso cortesia."
                  value={planFormData.descricao}
                  onChange={(e) => setPlanFormData({ ...planFormData, descricao: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Toggles de Dias Permitidos na Semana */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 flex items-center justify-between">
                  <span>Dias Válidos para Agendamento *</span>
                  <span className="text-[10px] text-amber-400">
                    {planFormData.dias_permitidos.length} dia(s) selecionado(s)
                  </span>
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((w) => {
                    const isSelected = planFormData.dias_permitidos.includes(w.day);
                    return (
                      <button
                        key={w.day}
                        type="button"
                        onClick={() => handleToggleDay(w.day)}
                        className={`h-9 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          isSelected
                            ? 'bg-[#E5A93C] text-black border-[#E5A93C] shadow'
                            : 'bg-zinc-900 text-zinc-500 border-white/10 hover:text-white'
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-select de Serviços Inclusos */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Serviços Cobertos pelo Plano *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
                  {services.map((s) => {
                    const isChecked = planFormData.servicos_inclusos.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleService(s.id)}
                        className={`p-2 rounded-xl text-xs font-medium text-left transition border flex items-center justify-between ${
                          isChecked
                            ? 'bg-amber-500/15 text-[#D4AF37] border-amber-500/40'
                            : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                        }`}
                      >
                        <span>{s.name}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-[#D4AF37]" weight="bold" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5A93C] hover:from-[#c5a02e] hover:to-[#d89b30] text-black font-extrabold text-xs transition cursor-pointer"
                >
                  {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NÍVEL 1: MODAL DEDICADO DE ATIVAÇÃO MANUAL DE ASSINATURA */}
      {isManualActivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#141416] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Storefront className="w-5 h-5 text-[#D4AF37]" weight="bold" />
                Ativar Assinatura Manual (Balcão)
              </h3>
              <button
                onClick={() => setIsManualActivateModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmManualActivation} className="mt-4 space-y-4">
              {/* Seleção de Cliente */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Cliente Cadastrado *
                </label>
                <select
                  required
                  value={manualCustomerId}
                  onChange={(e) => setManualCustomerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Selecione o cliente...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {formatPhone(c.phone)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção do Plano */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Plano do Clube *
                </label>
                <select
                  required
                  value={manualPlanId}
                  onChange={(e) => setManualPlanId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Selecione o plano...</option>
                  {plans.filter((p) => p.ativo !== false).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {formatCurrency(p.valor_mensal || p.preco_mensal)}/mês
                    </option>
                  ))}
                </select>
              </div>

              {/* Data de Início e Vencimento Automático */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    required
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Vencimento (+30 dias)
                  </label>
                  <div className="h-10 px-3 rounded-xl bg-zinc-900/60 border border-white/10 text-amber-400 font-mono text-xs flex items-center font-bold">
                    {addDaysToDate(manualStartDate, 30)}
                  </div>
                </div>
              </div>

              {/* Resumo da Regra */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Modalidade:</span>
                  <span className="font-bold text-white">Manual (Pix / Dinheiro / Balcão)</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Status inicial:</span>
                  <span className="font-bold text-emerald-400">Ativo</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Cortes no ciclo:</span>
                  <span className="font-mono text-zinc-300">0 utilizados</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualActivateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5A93C] hover:from-[#c5a02e] hover:to-[#d89b30] text-black font-extrabold text-xs transition cursor-pointer"
                >
                  Confirmar Ativação Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TROCAR / VINCULAR PLANO DO MEMBRO */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#141416] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-left">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-[#D4AF37]" weight="fill" />
              Plano de {editingMember.name}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Selecione o plano do clube que o cliente deseja assinar ou remova o plano ativo.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Plano do Clube
                </label>
                <select
                  value={selectedChangePlanId}
                  onChange={(e) => setSelectedChangePlanId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Nenhum (Cliente Avulso)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {formatCurrency(p.valor_mensal || p.preco_mensal)}/mês
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveChangePlan}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c5a02e] text-black font-bold text-xs cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
