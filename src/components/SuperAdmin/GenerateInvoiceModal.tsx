import React, { useState } from 'react';
import {
  X,
  Receipt,
  CurrencyDollar,
  Calendar,
  CheckCircle,
  WarningCircle,
  ArrowRight,
  Sparkle,
} from '@phosphor-icons/react';
import { TenantConfig, Invoice } from '../../types';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';

interface GenerateInvoiceModalProps {
  tenant: TenantConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (tenant: TenantConfig, amount: number, dueDate: string, description: string) => void;
  existingInvoices?: Invoice[];
}

export const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onGenerate,
  existingInvoices = [],
}) => {
  if (!isOpen || !tenant) return null;

  const defaultAmount =
    tenant.valor_mensalidade_acordado ??
    tenant.planBasePrice ??
    (tenant.plan === 'starter' ? 49.9 : tenant.plan === 'enterprise' ? 149.9 : 89.9);

  // Vencimento padrão: 5 dias a partir de hoje (YYYY-MM-DD)
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  };

  const defaultDescription = () => {
    const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
    return `Assinatura Mensal SaaS Naville Barber - ${capitalized}`;
  };

  const [amount, setAmount] = useState<number>(tenant.plan === 'partner' ? 0 : defaultAmount);
  const [dueDate, setDueDate] = useState<string>(defaultDueDate());
  const [description, setDescription] = useState<string>(defaultDescription());
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const tenantInvoices = existingInvoices.filter((inv) => inv.tenantId === tenant.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(tenant, amount, dueDate, description);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#141416] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#18181B]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D4AF37] shadow-sm">
              <Receipt className="w-5 h-5" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Gerar Fatura / Cobrança
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                  /b/{tenant.slug}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Emitir fatura para <strong className="text-white">{tenant.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {isSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8" weight="fill" />
              </div>
              <h3 className="text-base font-bold text-white">Fatura Emitida com Sucesso!</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                A fatura no valor de <strong className="text-emerald-400 font-mono">{formatCurrency(amount)}</strong> já está disponível no Painel da Barbearia para pagamento via PIX e Stripe.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Card de Resumo do Estabelecimento */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Plano Atual</span>
                  <span className="font-bold text-white uppercase">{tenant.plan}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Mensalidade Cadastrada</span>
                  <span className="font-bold text-[#D4AF37] font-mono">{formatCurrency(defaultAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Status</span>
                  <span className={`font-bold ${tenant.status === 'active' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {tenant.status}
                  </span>
                </div>
              </div>

              {/* Valor da Fatura */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Valor da Fatura (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm font-mono font-bold focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Data de Vencimento */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Data de Vencimento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Descrição / Referência */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Descrição da Cobrança
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Assinatura Mensal SaaS Naville Barber"
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Histórico Recente de Faturas desta Barbearia */}
              {tenantInvoices.length > 0 && (
                <div className="pt-3 border-t border-white/5 space-y-2">
                  <span className="text-[11px] font-semibold text-zinc-400 block">
                    Faturas Anteriores ({tenantInvoices.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {tenantInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-white">{inv.invoiceNumber}</span>
                          <span className="text-[10px] text-zinc-500 block">
                            Venc: {formatDatePtBR(inv.dueDate.split('T')[0])}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-white block">
                            {formatCurrency(inv.amount)}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : inv.status === 'overdue'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {inv.status === 'paid' ? 'Paga' : inv.status === 'overdue' ? 'Vencida' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Receipt className="w-4 h-4" weight="bold" />
                  <span>Emitir Fatura para o Painel</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
