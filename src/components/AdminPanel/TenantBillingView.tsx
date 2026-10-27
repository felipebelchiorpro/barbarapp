import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Copy,
  CheckCircle,
  Clock,
  WarningCircle,
  XCircle,
  Receipt,
  Sparkle,
  ArrowSquareOut,
  ArrowsClockwise,
  Lightning,
  ShieldCheck,
  Check,
  X
} from '@phosphor-icons/react';
import { Invoice, InvoiceNinjaConfig, SubscriptionPlan, TenantConfig } from '../../types';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';
import { calculateTenantMonthlyTotal, generatePixCopyPaste } from '../../services/invoiceNinjaService';
import { createStripeSubscriptionCheckout } from '../../services/stripeService';
import { DigitalReceiptModal } from '../Shared/DigitalReceiptModal';

interface TenantBillingViewProps {
  tenant: TenantConfig;
  plans: SubscriptionPlan[];
  invoices: Invoice[];
  config: InvoiceNinjaConfig;
  onPayInvoiceSimulated: (invoiceId: string, method?: 'pix' | 'stripe') => void;
  onContactSupport: () => void;
}

export const TenantBillingView: React.FC<TenantBillingViewProps> = ({
  tenant,
  plans,
  invoices,
  config,
  onPayInvoiceSimulated,
  onContactSupport,
}) => {
  const [selectedInvoiceForPix, setSelectedInvoiceForPix] = useState<Invoice | null>(null);
  const [selectedInvoiceForStripe, setSelectedInvoiceForStripe] = useState<Invoice | null>(null);
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  const handleOpenStripeCheckoutDirect = async () => {
    if (tenant.is_vitalicio) return;
    setIsStripeLoading(true);
    try {
      const res = await createStripeSubscriptionCheckout({
        tenant,
        planId: tenant.plan || 'pro',
        billingCycle: tenant.plano_ciclo || 'mensal',
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      console.error('Erro ao abrir checkout Stripe:', err);
    } finally {
      setIsStripeLoading(false);
    }
  };

  const handleConfirmStripePayment = (inv: Invoice) => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      onPayInvoiceSimulated(inv.id, 'stripe');
      setIsProcessingPayment(false);
      setSelectedInvoiceForStripe(null);
      setSelectedReceiptInvoice({
        ...inv,
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentMethod: 'stripe',
        stripePaymentId: `cs_test_${Date.now()}`,
      });
    }, 600);
  };

  // Financial calculations for current tenant
  const billingSummary = calculateTenantMonthlyTotal(tenant, plans);
  const currentPlan = plans.find((p) => p.id === tenant.plan) || plans[0];

  // Invoices for this specific tenant
  const tenantInvoices = invoices.filter((inv) => inv.tenantId === tenant.id);
  const overdueInvoice = tenantInvoices.find((inv) => inv.status === 'overdue');
  const pendingInvoice = tenantInvoices.find((inv) => inv.status === 'pending');
  const activeInvoiceToPay = overdueInvoice || pendingInvoice;

  const handleCopyPix = (pixCode: string) => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleSimulatePayment = (invoiceId: string) => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      onPayInvoiceSimulated(invoiceId, 'pix');
      setIsProcessingPayment(false);
      const paidInv = tenantInvoices.find((i) => i.id === invoiceId) || selectedInvoiceForPix;
      setSelectedInvoiceForPix(null);
      if (paidInv) {
        setSelectedReceiptInvoice({
          ...paidInv,
          status: 'paid',
          paidAt: new Date().toISOString(),
          paymentMethod: 'pix',
        });
      }
    }, 700);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Banner de Parceiro Vitalício Naville */}
      {tenant.is_vitalicio && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#D4A373]/20 via-[#18181B] to-[#D4A373]/10 border border-[#D4A373]/50 shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#D4A373]/20 border border-[#D4A373]/40 flex items-center justify-center text-[#D4A373] shrink-0">
                <ShieldCheck className="w-6 h-6" weight="fill" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4A373] block">
                  Parceria Estratégica Vitalícia
                </span>
                <h3 className="text-base font-bold text-white font-display">
                  Isenção Permanente de Mensalidade Naville SaaS
                </h3>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#D4A373]/20 text-[#D4A373] border border-[#D4A373]/40 self-start sm:self-auto font-mono">
              R$ 0,00 / mês (Vitalício)
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Sua barbearia está cadastrada como parceira vitalícia / beta tester oficial da plataforma Naville. Sua mensalidade de SaaS é permanentemente isenta, disparos de cobrança do Stripe estão bloqueados e seu acesso nunca será suspenso por falta de pagamento.
          </p>
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Cadeiras contratadas no cadastro:</span>
            <span className="text-white font-bold">{tenant.limite_profissionais || tenant.max_barbeiros || 1} cadeira(s) de barbeiro</span>
          </div>
        </div>
      )}
      {/* Kill Switch Overdue Alert Banner */}
      {tenant.status === 'blocked' && !tenant.is_vitalicio && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5 sm:mt-0">
              <WarningCircle className="w-6 h-6" weight="fill" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-400">
                Atenção: Assinatura em atraso — Kill Switch Ativo
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                O agendamento online público para seus clientes está temporariamente pausado. Realize o pagamento via PIX para reativar seu sistema de forma automática e imediata.
              </p>
            </div>
          </div>

          {activeInvoiceToPay && (
            <button
              onClick={() => setSelectedInvoiceForPix(activeInvoiceToPay)}
              className="h-10 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer shadow-lg shadow-red-500/20 active:scale-95"
            >
              <QrCode className="w-4 h-4" weight="bold" />
              <span>Pagar com PIX Agora</span>
            </button>
          )}
        </div>
      )}

      {/* Grace Period Warning Banner (when overdue but before hard block) */}
      {tenant.status_assinatura === 'em_atraso' && tenant.status !== 'blocked' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5 sm:mt-0">
              <Clock className="w-6 h-6" weight="fill" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-amber-300">
                Aviso: Fatura Pendente em Período de Tolerância
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                Identificamos uma fatura pendente. Seu sistema continua operando normalmente durante a carência ({config.gracePeriodDays} dias). Efetue o pagamento para evitar o bloqueio automático.
              </p>
            </div>
          </div>

          {activeInvoiceToPay && (
            <button
              onClick={() => setSelectedInvoiceForPix(activeInvoiceToPay)}
              className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-2 transition shrink-0 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <QrCode className="w-4 h-4" weight="bold" />
              <span>Pagar Fatura com PIX</span>
            </button>
          )}
        </div>
      )}

      {/* Plan Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Plan Overview */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1 font-mono">
                  <Sparkle className="w-3 h-3" weight="fill" />
                  <span>Plano {currentPlan.name} · Ciclo {tenant.plano_ciclo ? tenant.plano_ciclo.toUpperCase() : 'MENSAL'}</span>
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    tenant.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : tenant.status === 'blocked'
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {tenant.status === 'active'
                    ? (tenant.status_assinatura === 'em_atraso' ? 'Em Atraso (Carência)' : 'Assinatura Ativa')
                    : tenant.status === 'blocked'
                    ? 'Bloqueado por Inadimplência'
                    : 'Período de Testes (Trial)'}
                </span>
              </div>

              <span className="text-xs text-zinc-400 font-mono">
                Próxima renovação: <strong className="text-white">{formatDatePtBR((tenant.data_proximo_vencimento || tenant.nextBillingDate || '2026-11-10').split('T')[0])}</strong>
              </span>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
                  {currentPlan.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-md">
                  {currentPlan.description}
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-extrabold font-display text-[#D4AF37] tabular-nums">
                  {formatCurrency(billingSummary.totalMonthly)}
                  <span className="text-xs font-normal text-zinc-400">/mês</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  {billingSummary.extraSeats > 0 ? (
                    <span>
                      Base {formatCurrency(billingSummary.basePrice)} + {billingSummary.extraSeats} vaga(s) extra ({formatCurrency(billingSummary.extraSeatsCost)})
                    </span>
                  ) : (
                    <span>Preço fixo do plano</span>
                  )}
                </div>
              </div>
            </div>

            {/* Inclusions & Seats breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Cadeiras Contratadas</div>
                <div className="text-lg font-bold text-white mt-0.5 tabular-nums">
                  {tenant.max_barbeiros} profissional(is)
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {billingSummary.includedSeats} inclusa(s) + {billingSummary.extraSeats} adicional(is)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Preço por Vaga Adicional</div>
                <div className="text-lg font-bold text-[#D4AF37] mt-0.5 tabular-nums">
                  {formatCurrency(tenant.valor_adicional_barbeiro || 25.0)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Cobrado mensalmente</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">WhatsApp API</div>
                <div className="text-lg font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" weight="fill" />
                  <span>Incluso Ilimitado</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Lembretes automáticos</div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" weight="regular" />
              <span>Faturamento automatizado via Invoice Ninja v5</span>
            </span>
            <button
              onClick={onContactSupport}
              className="text-[#D4AF37] hover:underline font-semibold cursor-pointer"
            >
              Falar com Gerente de Conta →
            </button>
          </div>
        </div>

        {/* Current Active Invoice Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-400" weight="regular" />
                <span>Fatura do Mês</span>
              </span>
              {activeInvoiceToPay ? (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeInvoiceToPay.status === 'overdue'
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {activeInvoiceToPay.status === 'overdue' ? 'Vencida' : 'Aguardando Pagamento'}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Em Dia
                </span>
              )}
            </div>

            {activeInvoiceToPay ? (
              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-xs text-zinc-400 block">Número da Fatura</span>
                  <span className="text-sm font-mono font-bold text-white">{activeInvoiceToPay.invoiceNumber}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 block">Vencimento</span>
                    <span className="text-xs font-semibold text-white">{formatDatePtBR(activeInvoiceToPay.dueDate)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 block">Valor Total</span>
                    <span className="text-xl font-bold font-display text-[#D4AF37]">
                      {formatCurrency(activeInvoiceToPay.amount)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
                  <div className="text-[11px] text-zinc-400 font-semibold">Itens discriminados:</div>
                  {(activeInvoiceToPay.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-zinc-300">
                      <span className="truncate pr-2">{item.description}</span>
                      <span className="font-mono text-zinc-400">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6" weight="regular" />
                </div>
                <h4 className="text-sm font-bold text-white">Todas as faturas estão pagas</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Seu agendamento online está 100% ativo e operando normalmente.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
            {activeInvoiceToPay ? (
              <>
                <button
                  onClick={() => setSelectedInvoiceForPix(activeInvoiceToPay)}
                  className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  <QrCode className="w-4 h-4" weight="bold" />
                  <span>Pagar com PIX Instantâneo</span>
                </button>

                {!tenant.is_vitalicio && (
                  <button
                    onClick={() => setSelectedInvoiceForStripe(activeInvoiceToPay)}
                    className="w-full h-10 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" weight="bold" />
                    <span>Pagar com Cartão via Stripe</span>
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="text-center text-[11px] text-zinc-500">
                  Próxima fatura será emitida em {tenant.nextBillingDate ? formatDatePtBR(tenant.nextBillingDate) : '10/11/2026'}
                </div>
                {!tenant.is_vitalicio && (
                  <button
                    disabled={isStripeLoading}
                    onClick={handleOpenStripeCheckoutDirect}
                    className="w-full h-10 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" weight="bold" />
                    <span>{isStripeLoading ? 'Abrindo Checkout Oficial Stripe...' : 'Pagar / Renovar Assinatura via Stripe'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D4AF37]" weight="regular" />
            <h3 className="text-base font-bold text-white">Histórico de Faturas & Recibos</h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {tenantInvoices.length} fatura(s) registradas
          </span>
        </div>

        {tenantInvoices.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs">
            Nenhuma fatura registrada para esta barbearia.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Fatura</th>
                  <th className="pb-3 font-semibold">Emissão</th>
                  <th className="pb-3 font-semibold">Vencimento</th>
                  <th className="pb-3 font-semibold">Valor</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenantInvoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  const isOverdue = inv.status === 'overdue';
                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 font-mono font-bold text-white">
                        {inv.invoiceNumber}
                        {inv.ninjaInvoiceId && (
                          <span className="text-[10px] font-normal text-zinc-500 block">
                            Ninja ID: {inv.ninjaInvoiceId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-zinc-400">{formatDatePtBR(inv.issueDate)}</td>
                      <td className="py-3 text-zinc-400">{formatDatePtBR(inv.dueDate)}</td>
                      <td className="py-3 font-bold text-white tabular-nums">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isOverdue
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle className="w-3 h-3" weight="fill" />
                              <span>Paga</span>
                            </>
                          ) : isOverdue ? (
                            <>
                              <XCircle className="w-3 h-3" weight="fill" />
                              <span>Vencida</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" weight="bold" />
                              <span>Pendente</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {!isPaid ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedInvoiceForPix(inv)}
                              className="h-7 px-2.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold text-[10px] transition cursor-pointer"
                              title="Pagar via PIX Instantâneo"
                            >
                              PIX
                            </button>
                            {!tenant.is_vitalicio && (
                              <button
                                onClick={() => setSelectedInvoiceForStripe(inv)}
                                className="h-7 px-2.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[10px] transition cursor-pointer"
                                title="Pagar com Cartão via Stripe"
                              >
                                Cartão
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-zinc-800 text-zinc-300 border border-white/5">
                              {inv.paymentMethod === 'stripe' ? '💳 Stripe' : '⚡ PIX'}
                            </span>
                            <button
                              onClick={() => setSelectedReceiptInvoice(inv)}
                              className="h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-[#D4AF37]/20 text-zinc-300 hover:text-[#D4AF37] font-bold text-[10px] flex items-center gap-1 transition cursor-pointer border border-white/5"
                              title="Ver Comprovante / Recibo da Fatura"
                            >
                              <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Recibo</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PIX Payment Modal */}
      {selectedInvoiceForPix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl p-6 text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center">
                  <QrCode className="w-5 h-5" weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pagamento Instantâneo via PIX</h3>
                  <p className="text-[11px] text-zinc-400">
                    Fatura: <span className="text-white font-mono">{selectedInvoiceForPix.invoiceNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPix(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 text-center">
                <span className="text-xs text-zinc-400 uppercase font-semibold">Valor a Pagar</span>
                <div className="text-3xl font-extrabold font-display text-[#D4AF37] tabular-nums mt-0.5">
                  {formatCurrency(selectedInvoiceForPix.amount)}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Vencimento: {formatDatePtBR(selectedInvoiceForPix.dueDate)}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-black text-center shadow-inner">
                <div className="w-48 h-48 border-4 border-black/10 rounded-xl p-2 flex flex-col items-center justify-center bg-white">
                  <QrCode className="w-40 h-40 text-black" weight="regular" />
                </div>
                <span className="text-[11px] text-zinc-600 font-semibold mt-2">
                  Aponte a câmera do aplicativo do seu banco para o QR Code acima
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                  Ou use o PIX Copia e Cola:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedInvoiceForPix.pixCopyPaste || generatePixCopyPaste(selectedInvoiceForPix)}
                    className="flex-1 h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-[11px] truncate focus:outline-none select-all"
                  />
                  <button
                    onClick={() =>
                      handleCopyPix(selectedInvoiceForPix.pixCopyPaste || generatePixCopyPaste(selectedInvoiceForPix))
                    }
                    className="h-10 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedInvoiceForPix(null)}
                className="w-full sm:w-auto h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
              >
                Fechar
              </button>

              <button
                disabled={isProcessingPayment}
                onClick={() => handleSimulatePayment(selectedInvoiceForPix.id)}
                className="w-full sm:w-auto h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <ArrowsClockwise className="w-4 h-4 animate-spin" />
                    <span>Processando Webhook...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" weight="bold" />
                    <span>Simular Pagamento Confirmado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Stripe: Checkout Oficial ou Confirmação Imediata */}
      {selectedInvoiceForStripe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl p-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Pagamento via Stripe Gateway
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {selectedInvoiceForStripe.invoiceNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForStripe(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Valor da Mensalidade:</span>
                  <span className="text-xl font-bold font-display text-[#D4AF37]">
                    {formatCurrency(selectedInvoiceForStripe.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Cartões Aceitos:</span>
                  <span className="text-zinc-300 font-medium">Visa, Mastercard, Elo, Hiper</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Gateway SaaS:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                    Stripe Central (Produção Live)
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  disabled={isStripeLoading}
                  onClick={handleOpenStripeCheckoutDirect}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-lg shadow-indigo-600/25"
                >
                  <CreditCard className="w-4 h-4" weight="bold" />
                  <span>{isStripeLoading ? 'Abrindo Checkout Stripe...' : 'Abrir Checkout Oficial da Stripe'}</span>
                </button>

                <button
                  disabled={isProcessingPayment}
                  onClick={() => handleConfirmStripePayment(selectedInvoiceForStripe)}
                  className="w-full h-10 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  {isProcessingPayment ? (
                    <>
                      <ArrowsClockwise className="w-4 h-4 animate-spin" />
                      <span>Registrando no Histórico...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" weight="bold" />
                      <span>Confirmar Baixa Manual da Fatura</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                Ao clicar em "Abrir Checkout Oficial", você será redirecionado para o ambiente criptografado de produção da Stripe (`checkout.stripe.com`) para pagamento com cartão.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedInvoiceForStripe(null)}
                className="h-9 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comprovante / Recibo Oficial de Pagamento */}
      {selectedReceiptInvoice && (
        <DigitalReceiptModal
          invoice={selectedReceiptInvoice}
          tenant={tenant}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
};
