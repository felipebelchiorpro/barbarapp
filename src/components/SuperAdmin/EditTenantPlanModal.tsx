import React, { useState } from 'react';
import {
  X,
  Sparkle,
  CurrencyDollar,
  UsersThree,
  CreditCard,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Tag,
  ChatCircleText
} from '@phosphor-icons/react';
import { TenantConfig, SubscriptionPlan } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface EditTenantPlanModalProps {
  tenant: TenantConfig;
  plans: SubscriptionPlan[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTenant: TenantConfig) => void;
}

export const EditTenantPlanModal: React.FC<EditTenantPlanModalProps> = ({
  tenant,
  plans,
  isOpen,
  onClose,
  onSave,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'enterprise'>(tenant.plan);
  const [basePrice, setBasePrice] = useState<string>(
    String(tenant.planBasePrice ?? (selectedPlan === 'starter' ? 49.9 : selectedPlan === 'pro' ? 89.9 : 149.9))
  );
  const [customDiscount, setCustomDiscount] = useState<string>(
    String(tenant.customDiscount ?? 0)
  );
  const [partnerNote, setPartnerNote] = useState<string>(tenant.partnerNote || '');
  const [maxBarbeiros, setMaxBarbeiros] = useState<number>(tenant.max_barbeiros || 1);
  const [valorAdicional, setValorAdicional] = useState<string>(
    String(tenant.valor_adicional_barbeiro || 25.0)
  );
  const [status, setStatus] = useState(tenant.status);
  const [planoCiclo, setPlanoCiclo] = useState<'mensal' | 'semestral' | 'anual'>(
    tenant.plano_ciclo || 'mensal'
  );
  const [bloqueioAutomatico, setBloqueioAutomatico] = useState<boolean>(
    tenant.bloqueio_automatico !== undefined ? tenant.bloqueio_automatico : true
  );

  // Matriz de Recursos do Parceiro Vitalício & Gateways
  const [isVitalicio, setIsVitalicio] = useState<boolean>(tenant.is_vitalicio ?? false);
  const [limiteProfissionais, setLimiteProfissionais] = useState<number>(
    tenant.limite_profissionais ?? tenant.max_barbeiros ?? 1
  );
  const [recursoClubeAtivo, setRecursoClubeAtivo] = useState<boolean>(
    tenant.recurso_clube_ativo ?? false
  );
  const [recursoFinanceiroAvancado, setRecursoFinanceiroAvancado] = useState<boolean>(
    tenant.recurso_financeiro_avancado ?? true
  );
  const [whatsappAtivo, setWhatsappAtivo] = useState<boolean>(
    tenant.whatsapp_ativo ?? true
  );

  // Feature Toggles (Módulos)
  const [enabledModules, setEnabledModules] = useState({
    expenses: tenant.enabledModules?.expenses ?? (tenant.plan !== 'starter'),
    clients: tenant.enabledModules?.clients ?? true,
    pdv: tenant.enabledModules?.pdv ?? (tenant.plan !== 'starter'),
    whatsapp_auto: tenant.enabledModules?.whatsapp_auto ?? (tenant.plan !== 'starter'),
  });

  if (!isOpen) return null;

  // Handle plan selection (sets default prices and suggested module states)
  const handleSelectPlan = (planId: 'starter' | 'pro' | 'enterprise') => {
    setSelectedPlan(planId);
    const planObj = plans.find((p) => p.id === planId);
    if (planObj) {
      setBasePrice(String(planObj.basePrice));
      setMaxBarbeiros(Math.max(planObj.includedSeats, maxBarbeiros));
      setValorAdicional(String(planObj.extraSeatPrice));

      if (planId === 'pro' || planId === 'enterprise') {
        setEnabledModules({
          expenses: true,
          clients: true,
          pdv: true,
          whatsapp_auto: true,
        });
      } else {
        // Starter defaults
        setEnabledModules({
          expenses: false,
          clients: true,
          pdv: false,
          whatsapp_auto: false,
        });
      }
    }
  };

  const handleToggleModule = (key: keyof typeof enabledModules) => {
    setEnabledModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Monthly Total Calculation Preview
  const baseNum = parseFloat(basePrice) || 0;
  const discNum = parseFloat(customDiscount) || 0;
  const extraPriceNum = parseFloat(valorAdicional) || 25;
  const planObj = plans.find((p) => p.id === selectedPlan);
  const includedSeats = planObj?.includedSeats || 1;
  const extraSeats = Math.max(0, maxBarbeiros - includedSeats);
  const monthlyTotal = Math.max(0, baseNum + extraSeats * extraPriceNum - discNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...tenant,
      plan: selectedPlan,
      planBasePrice: baseNum,
      customDiscount: discNum > 0 ? discNum : undefined,
      partnerNote: partnerNote.trim() || undefined,
      max_barbeiros: limiteProfissionais,
      limite_profissionais: limiteProfissionais,
      valor_adicional_barbeiro: extraPriceNum,
      status,
      is_vitalicio: isVitalicio,
      recurso_clube_ativo: recursoClubeAtivo,
      recurso_financeiro_avancado: recursoFinanceiroAvancado,
      whatsapp_ativo: whatsappAtivo,
      enabledModules: {
        ...enabledModules,
        expenses: recursoFinanceiroAvancado,
        pdv: recursoFinanceiroAvancado,
        clube_assinaturas: recursoClubeAtivo,
        whatsapp_auto: whatsappAtivo,
      },
      plano_ciclo: planoCiclo,
      bloqueio_automatico: bloqueioAutomatico,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 text-left">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#141416] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-[#D4AF37] border border-amber-500/30 inline-flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" weight="bold" />
                Controle do Super Administrador Master
              </span>
              <span className="text-xs text-zinc-400 font-mono">ID: {tenant.slug}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-1">
              Gerenciar Plano & Módulos · {tenant.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* 1. Escolha do Plano SaaS */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400/90 block mb-2 font-mono">
              1. Selecionar Nível do Plano
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPlan(p.id)}
                    className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    {p.recommended && (
                      <span className="absolute -top-2 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D4AF37] text-black uppercase font-mono">
                        Mais Popular
                      </span>
                    )}
                    <span className="text-sm font-bold block text-white">{p.name}</span>
                    <span className="text-xs font-mono font-extrabold text-[#D4AF37] block mt-1">
                      {formatCurrency(p.basePrice)}/mês
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-1">
                      {p.includedSeats === 1 ? '1 cadeira inclusa' : `${p.includedSeats} cadeiras inclusas`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Precificação Customizada & Desconto de Parceiro */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400/90 font-mono">
              <CurrencyDollar className="w-4 h-4" />
              <span>2. Ajuste Financeiro & Desconto de Parceiro</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Valor Base do Plano (R$)
                </label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="text-[10px] text-zinc-400 block mt-1">
                  Pode ser alterado para valores promocionais negociados
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Desconto de Parceiro (R$)
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="text-[10px] text-zinc-400 block mt-1">
                  Desconto fixo abatido na fatura mensal
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Motivo / Acordo de Parceria (Opcional)
              </label>
              <input
                type="text"
                value={partnerNote}
                onChange={(e) => setPartnerNote(e.target.value)}
                placeholder="Ex: Barbeiro influencer com 50k seguidores / Acordo semestral"
                className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* 3. Cadeiras de Barbeiro */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400/90 font-mono">
              <UsersThree className="w-4 h-4" />
              <span>3. Cadeiras & Profissionais Contratados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Total de Vagas de Barbeiro
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMaxBarbeiros(Math.max(1, maxBarbeiros - 1))}
                    className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-base transition"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold font-mono text-[#D4AF37] min-w-[32px] text-center">
                    {maxBarbeiros}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMaxBarbeiros(maxBarbeiros + 1)}
                    className="w-10 h-10 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-[#D4AF37] font-bold text-base transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Valor por Cadeira Adicional (R$)
                </label>
                <input
                  type="number"
                  step="1.00"
                  value={valorAdicional}
                  onChange={(e) => setValorAdicional(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* 4. Controle de Módulos (Feature Toggles) */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 font-mono">
                4. Módulos & Recursos Habilitados para a Barbearia
              </span>
              <span className="text-[10px] text-zinc-400">Ative/desative sob demanda</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                {
                  id: 'expenses' as const,
                  label: 'Controle de Gastos & DRE',
                  desc: 'Fluxo financeiro, custos fixos e apuração de lucro',
                },
                {
                  id: 'clients' as const,
                  label: 'Base de Clientes & CRM',
                  desc: 'Histórico de cortes, LTV e contato de clientes',
                },
                {
                  id: 'pdv' as const,
                  label: 'PDV & Frente de Caixa',
                  desc: 'Caixa do dia, baixas em balcão e sangrias',
                },
                {
                  id: 'whatsapp_auto' as const,
                  label: 'WhatsApp API Automático',
                  desc: 'Lembretes automáticos 2h antes via Evolution API',
                },
              ].map((mod) => {
                const isEnabled = enabledModules[mod.id];
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleToggleModule(mod.id)}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition text-left cursor-pointer ${
                      isEnabled
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-zinc-900/40 border-white/5 opacity-60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{mod.label}</span>
                      <span className="text-[11px] text-zinc-400 leading-tight block mt-0.5">
                        {mod.desc}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        isEnabled
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}
                    >
                      {isEnabled ? 'Liberado' : 'Bloqueado'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Ciclo de Cobrança da Subscrição */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-300 block">Ciclo de Cobrança</span>
                <span className="text-[11px] text-zinc-400 block">Periodicidade de renovação das faturas</span>
              </div>
              <div className="flex items-center gap-1.5">
                {(['mensal', 'semestral', 'anual'] as const).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setPlanoCiclo(cycle)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border capitalize cursor-pointer ${
                      planoCiclo === cycle
                        ? 'bg-amber-500/20 text-[#D4AF37] border-amber-500/40 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle de Bloqueio Automático em caso de Inadimplência */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-300 block">Bloqueio Automático por Inadimplência</span>
                <span className="text-[11px] text-zinc-400 block">Suspender acessos automaticamente se houver atraso na fatura</span>
              </div>
              <button
                type="button"
                onClick={() => setBloqueioAutomatico(!bloqueioAutomatico)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  bloqueioAutomatico
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {bloqueioAutomatico ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-400" weight="fill" />
                    <span>Ativado</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-zinc-500" weight="fill" />
                    <span>Desativado</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 6. Status da Conta */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div>
              <span className="text-xs font-semibold text-zinc-300 block">Status Operacional</span>
              <span className="text-[11px] text-zinc-400 block">Controle do Kill Switch de acesso</span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['active', 'trial', 'blocked'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    status === st
                      ? st === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : st === 'trial'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-zinc-900 text-zinc-500 border-white/5'
                  }`}
                >
                  {st === 'active' && 'Ativo'}
                  {st === 'trial' && 'Em Teste'}
                  {st === 'blocked' && 'Bloqueado'}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* MATRIZ DE RECURSOS & GOVERNANÇA (PARCEIRO VITALÍCIO & GATEWAYS) */}
          {/* ========================================================= */}
          <div className="p-4 rounded-2xl bg-black/40 border border-[#D4A373]/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D4A373]" weight="fill" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Matriz de Recursos & Governança de Gateways
                </span>
              </div>
              {isVitalicio ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/40">
                  Parceiro Vitalício Ativo
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Assinatura Padrão
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Toggle Isenção de Mensalidade */}
              <div
                onClick={() => setIsVitalicio(!isVitalicio)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                  isVitalicio ? 'bg-[#D4A373]/15 border-[#D4A373]/50' : 'bg-zinc-900/50 border-white/5'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">Isenção de Mensalidade (Vitalício)</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Ignora cobranças e suspensão do Stripe</span>
                </div>
                {isVitalicio ? (
                  <ToggleRight className="w-7 h-7 text-[#D4A373] shrink-0" weight="fill" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-zinc-600 shrink-0" />
                )}
              </div>

              {/* 2. Stepper Cadeiras Permitidas */}
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">Cadeiras / Barbeiros Permitidos</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Limite máximo no painel do dono</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLimiteProfissionais(Math.max(1, limiteProfissionais - 1))}
                    disabled={limiteProfissionais <= 1}
                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white flex items-center justify-center text-xs font-bold"
                  >
                    -
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs text-[#D4A373]">
                    {limiteProfissionais}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLimiteProfissionais(limiteProfissionais + 1)}
                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 3. Toggle Clube de Assinaturas (Mercado Pago) */}
              <div
                onClick={() => setRecursoClubeAtivo(!recursoClubeAtivo)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                  recursoClubeAtivo ? 'bg-sky-500/15 border-sky-500/40' : 'bg-zinc-900/50 border-white/5'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">Clube de Assinaturas (Mercado Pago)</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">100% direto na conta do dono (0% Naville)</span>
                </div>
                {recursoClubeAtivo ? (
                  <ToggleRight className="w-7 h-7 text-sky-400 shrink-0" weight="fill" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-zinc-600 shrink-0" />
                )}
              </div>

              {/* 4. Toggle Fluxo Financeiro / Caixa */}
              <div
                onClick={() => setRecursoFinanceiroAvancado(!recursoFinanceiroAvancado)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                  recursoFinanceiroAvancado ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-zinc-900/50 border-white/5'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">Fluxo Financeiro / Caixa</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">PDV Balcão, Sangrias e Controle de Gastos</span>
                </div>
                {recursoFinanceiroAvancado ? (
                  <ToggleRight className="w-7 h-7 text-emerald-400 shrink-0" weight="fill" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-zinc-600 shrink-0" />
                )}
              </div>

              {/* 5. Toggle WhatsApp Engine (Nativo) */}
              <div
                onClick={() => setWhatsappAtivo(!whatsappAtivo)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition sm:col-span-2 ${
                  whatsappAtivo ? 'bg-[#34D399]/15 border-[#34D399]/40' : 'bg-zinc-900/50 border-white/5'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">WhatsApp Engine (Nativo)</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">Lembretes, confirmações e motor anti-ban Evolution API</span>
                </div>
                {whatsappAtivo ? (
                  <ToggleRight className="w-7 h-7 text-[#34D399] shrink-0" weight="fill" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-zinc-600 shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Monthly Preview & Save Bar */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-[11px] text-zinc-400 block font-mono">Faturamento Mensal Calculado:</span>
              <span className="text-xl font-extrabold text-[#D4AF37] font-mono">
                {formatCurrency(monthlyTotal)}
                <span className="text-xs text-zinc-400 font-normal">/mês</span>
              </span>
              {discNum > 0 && (
                <span className="text-[10px] text-emerald-400 block font-semibold">
                  ✓ Desconto de parceiro aplicado (-{formatCurrency(discNum)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
              >
                Salvar Alterações da Barbearia
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
