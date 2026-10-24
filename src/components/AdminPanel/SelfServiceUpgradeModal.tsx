import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Lightning,
  RocketLaunch,
  CheckCircle,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Plus,
  Minus,
  Sparkle,
  Copy
} from '@phosphor-icons/react';
import { TenantConfig, SubscriptionPlan } from '../../types';
import { SAAS_PLANS } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatters';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { generateWhatsAppDirectLink } from '../../services/webhookService';

interface SelfServiceUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantConfig;
  activeCount: number;
  onConfirmUpgrade: (updatedTenant: TenantConfig, details: {
    type: 'seats' | 'plan';
    addedSeats?: number;
    newPlanId?: string;
    monthlyDelta: number;
  }) => void;
  onOpenCreateBarberModal?: () => void;
}

export const SelfServiceUpgradeModal: React.FC<SelfServiceUpgradeModalProps> = ({
  isOpen,
  onClose,
  tenant,
  activeCount,
  onConfirmUpgrade,
  onOpenCreateBarberModal,
}) => {
  const [activeTab, setActiveTab] = useState<'seats' | 'plan'>('seats');
  const [extraSeatsToAdd, setExtraSeatsToAdd] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'invoice' | 'pix'>('invoice');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState<{
    newMax: number;
    planName: string;
    message: string;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  if (!isOpen) return null;

  const extraSeatPrice = tenant.valor_adicional_barbeiro || 25.0;
  const currentMax = tenant.max_barbeiros || 1;
  const newMaxSeats = currentMax + extraSeatsToAdd;
  const seatMonthlyTotal = extraSeatsToAdd * extraSeatPrice;

  const currentPlan = SAAS_PLANS.find((p) => p.id === tenant.plan) || SAAS_PLANS[0];

  const simulatedPixCode = `00020126580014br.gov.bcb.pix0136naville-saas-${tenant.slug}-${Date.now()}520400005303986540${seatMonthlyTotal.toFixed(2)}5802BR5925NAVILLE BARBER SOFTWARE6009SAO PAULO62070503***6304`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(simulatedPixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleApplySeatsUpgrade = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const updatedTenant: TenantConfig = {
        ...tenant,
        max_barbeiros: newMaxSeats,
      };

      onConfirmUpgrade(updatedTenant, {
        type: 'seats',
        addedSeats: extraSeatsToAdd,
        monthlyDelta: seatMonthlyTotal,
      });

      setIsProcessing(false);
      setSuccessData({
        newMax: newMaxSeats,
        planName: currentPlan.name,
        message: `Parabéns! ${extraSeatsToAdd} nova(s) vaga(s) de barbeiro foram liberadas imediatamente para a sua barbearia.`,
      });
    }, 600);
  };

  const handleApplyPlanUpgrade = (targetPlan: SubscriptionPlan) => {
    setIsProcessing(true);

    setTimeout(() => {
      const newMax = Math.max(targetPlan.includedSeats, tenant.max_barbeiros);
      const monthlyDelta = targetPlan.basePrice - (tenant.planBasePrice || currentPlan.basePrice);

      const updatedTenant: TenantConfig = {
        ...tenant,
        plan: targetPlan.id as 'starter' | 'pro' | 'enterprise',
        planBasePrice: targetPlan.basePrice,
        max_barbeiros: newMax,
        valor_adicional_barbeiro: targetPlan.extraSeatPrice,
      };

      onConfirmUpgrade(updatedTenant, {
        type: 'plan',
        newPlanId: targetPlan.id,
        monthlyDelta,
      });

      setIsProcessing(false);
      setSuccessData({
        newMax,
        planName: targetPlan.name,
        message: `Plano atualizado com sucesso para o ${targetPlan.name}! Sua capacidade agora é de ${newMax} barbeiros.`,
      });
    }, 700);
  };

  const supportMessage = `Olá! Gostaria de tirar dúvidas sobre o upgrade de vagas da minha barbearia (${tenant.name}).`;
  const supportLink = generateWhatsAppDirectLink(tenant.supportPhone || '5511999999999', supportMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-[#18181B] border border-amber-500/30 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-left">
        {/* Glow Decorativo de Fundo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-yellow-600/5 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[#D4AF37] flex items-center justify-center shrink-0 shadow-sm">
              <Lightning className="w-5 h-5" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-display text-white">
                  Autoatendimento · Liberar Vagas Imediatas
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  Ativação Instantânea
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Aumente a capacidade de agendamento sozinho, sem filas ou espera por atendimento
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 relative z-10 text-xs">
          {successData ? (
            /* Tela de Sucesso Pós-Upgrade */
            <div className="py-6 sm:py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-8 h-8" weight="fill" />
              </div>

              <div>
                <h4 className="text-xl font-bold font-display text-white">
                  Upgrade Concluído com Sucesso!
                </h4>
                <p className="text-xs text-zinc-300 mt-2 max-w-md mx-auto leading-relaxed">
                  {successData.message}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 max-w-sm mx-auto text-left space-y-2">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Plano Atual:</span>
                  <span className="font-semibold text-white">{successData.planName}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Nova Capacidade:</span>
                  <span className="font-bold text-[#D4AF37] text-sm">{successData.newMax} Barbeiros</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Vagas Ocupadas:</span>
                  <span className="font-semibold text-emerald-400">{activeCount} de {successData.newMax}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                {onOpenCreateBarberModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCreateBarberModal();
                    }}
                    className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" weight="bold" />
                    <span>Cadastrar Novo Barbeiro Agora</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto h-10 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition"
                >
                  Concluir e Voltar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs de Seleção de Modalidade */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-900/90 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('seats')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    activeTab === 'seats'
                      ? 'bg-[#D4AF37] text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" weight="bold" />
                  <span>Adicionar Vagas (+1, +2...)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('plan')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    activeTab === 'plan'
                      ? 'bg-[#D4AF37] text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <RocketLaunch className="w-4 h-4" weight="bold" />
                  <span>Mudar de Plano</span>
                </button>
              </div>

              {/* CONTEÚDO DA ABA 1: VAGAS ADICIONAIS */}
              {activeTab === 'seats' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Seletor de Quantidade de Vagas */}
                  <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">
                        Quantas vagas extras deseja contratar?
                      </span>
                      <span className="text-[11px] text-[#D4AF37] font-semibold">
                        {formatCurrency(extraSeatPrice)}/mês cada
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-950 border border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExtraSeatsToAdd((prev) => Math.max(1, prev - 1))}
                          disabled={extraSeatsToAdd <= 1}
                          className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-12 text-center text-lg font-bold font-mono text-[#D4AF37]">
                          +{extraSeatsToAdd}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExtraSeatsToAdd((prev) => Math.min(10, prev + 1))}
                          className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-white">
                          +{formatCurrency(seatMonthlyTotal)}/mês
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Soma à sua mensalidade
                        </div>
                      </div>
                    </div>

                    {/* Resumo Comparativo */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5">
                        <span className="text-zinc-500 block">Capacidade Atual</span>
                        <strong className="text-white text-xs">{currentMax} Barbeiro(s)</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <span className="text-amber-400/90 block font-semibold">Nova Capacidade Imediata</span>
                        <strong className="text-[#D4AF37] text-xs font-bold">{newMaxSeats} Barbeiros</strong>
                      </div>
                    </div>
                  </div>

                  {/* Forma de Lançamento / Cobrança */}
                  <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/5 space-y-3">
                    <span className="font-semibold text-zinc-200 block">
                      Como deseja realizar o lançamento?
                    </span>

                    <div className="space-y-2">
                      <label
                        onClick={() => setPaymentMethod('invoice')}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                          paymentMethod === 'invoice'
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'invoice'}
                          onChange={() => setPaymentMethod('invoice')}
                          className="mt-0.5 text-[#D4AF37] focus:ring-0"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-xs flex items-center gap-2">
                            <span>Lançamento Automático na Próxima Fatura</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                              Sem burocracia
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            As vagas são liberadas agora e o valor de {formatCurrency(seatMonthlyTotal)} será incorporado no próximo ciclo de pagamento.
                          </p>
                        </div>
                      </label>

                      <label
                        onClick={() => setPaymentMethod('pix')}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                          paymentMethod === 'pix'
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'pix'}
                          onChange={() => setPaymentMethod('pix')}
                          className="mt-0.5 text-[#D4AF37] focus:ring-0"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-xs flex items-center gap-2">
                            <span>Pagar Proporcional Agora via PIX</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono">
                              QR Code Instantâneo
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Pague o valor avulso via PIX para deixar tudo quitado antecipadamente.
                          </p>
                        </div>
                      </label>
                    </div>

                    {paymentMethod === 'pix' && (
                      <div className="p-3 rounded-xl bg-zinc-950 border border-white/10 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Chave PIX Copia e Cola:</span>
                          <span className="font-bold text-[#D4AF37]">{formatCurrency(seatMonthlyTotal)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={simulatedPixCode}
                            className="flex-1 h-8 px-2 rounded-lg bg-zinc-900 border border-white/10 text-[10px] text-zinc-400 font-mono truncate"
                          />
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="h-8 px-3 rounded-lg bg-amber-500/20 text-[#D4AF37] hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botão de Confirmação Imediata */}
                  <button
                    type="button"
                    onClick={handleApplySeatsUpgrade}
                    disabled={isProcessing}
                    className="w-full h-11 rounded-2xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                  >
                    <Lightning className="w-4 h-4" weight="fill" />
                    <span>
                      {isProcessing
                        ? 'Liberando vaga no sistema...'
                        : `Confirmar e Liberar +${extraSeatsToAdd} Vaga(s) Imediatamente`}
                    </span>
                  </button>
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: UPGRADE DE PLANO COMPLETO */}
              {activeTab === 'plan' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <p className="text-[11px] text-zinc-400">
                    Selecione um plano superior para incluir mais barbeiros no pacote base e desbloquear recursos avançados:
                  </p>

                  <div className="space-y-3">
                    {SAAS_PLANS.map((plan) => {
                      const isCurrent = plan.id === tenant.plan;
                      const isRecommended = plan.recommended;

                      return (
                        <div
                          key={plan.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCurrent
                              ? 'bg-zinc-900/40 border-white/10 opacity-75'
                              : isRecommended
                              ? 'bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-900 border-amber-500/40 shadow-lg'
                              : 'bg-zinc-900/80 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-white font-display">
                                {plan.name}
                              </h5>
                              {isCurrent && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 font-bold uppercase">
                                  Plano Atual
                                </span>
                              )}
                              {isRecommended && !isCurrent && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-[#D4AF37] border border-amber-500/40 font-bold uppercase flex items-center gap-1">
                                  <Sparkle className="w-2.5 h-2.5" weight="fill" />
                                  Recomendado
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-zinc-400">
                              {plan.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-300 pt-1">
                              <span className="flex items-center gap-1 text-[#D4AF37] font-semibold">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                {plan.includedSeats} barbeiros inclusos
                              </span>
                              <span className="flex items-center gap-1 text-zinc-400">
                                Extras: +{formatCurrency(plan.extraSeatPrice)}/mês
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <div className="text-left sm:text-right">
                              <span className="text-base font-extrabold text-white">
                                {formatCurrency(plan.basePrice)}
                              </span>
                              <span className="text-[10px] text-zinc-400 block">/mês</span>
                            </div>

                            {isCurrent ? (
                              <button
                                disabled
                                className="h-8 px-3.5 rounded-xl bg-zinc-800 text-zinc-500 text-xs font-semibold cursor-not-allowed"
                              >
                                Ativo
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyPlanUpgrade(plan)}
                                disabled={isProcessing}
                                className="h-8 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm disabled:opacity-50"
                              >
                                <span>Migrar Agora</span>
                                <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rodapé Informativo & Opção de Falar com Comercial */}
              <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sem carência ou multas. Cancele ou altere quando quiser.</span>
                </span>

                <a
                  href={supportLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-[#D4AF37] flex items-center gap-1.5 transition underline underline-offset-2"
                >
                  <WhatsAppIcon variant="official" size={13} />
                  <span>Tirar dúvidas no WhatsApp</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
