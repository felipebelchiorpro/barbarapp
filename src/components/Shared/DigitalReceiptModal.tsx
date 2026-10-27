import React, { useState } from 'react';
import {
  CheckCircle,
  Printer,
  Copy,
  Check,
  X,
  ShieldCheck,
  Receipt,
  Sparkle,
  CreditCard,
  QrCode,
} from '@phosphor-icons/react';
import { Invoice, TenantConfig } from '../../types';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';

interface DigitalReceiptModalProps {
  invoice: Invoice;
  tenant?: TenantConfig;
  onClose: () => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  invoice,
  tenant,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const paymentDate = invoice.paidAt || invoice.pago_em || invoice.issueDate;
  const isStripe = invoice.paymentMethod === 'stripe';
  const isPix = invoice.paymentMethod === 'pix';
  const transactionId =
    invoice.stripePaymentId ||
    invoice.ninjaInvoiceId ||
    `NAV-${invoice.id.toUpperCase().slice(-8)}`;

  const authCode = `NAV-${(invoice.id + (paymentDate || '')).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `RECIBO DE PAGAMENTO - NAVILLE BARBER SAAS
Fatura: ${invoice.invoiceNumber}
Barbearia: ${invoice.tenantName || tenant?.name || 'Cliente'}
Valor Pago: ${formatCurrency(invoice.amount)}
Método: ${isStripe ? 'Cartão de Crédito (Stripe)' : isPix ? 'PIX Instantâneo' : 'Pagamento Digital'}
Data: ${formatDatePtBR(paymentDate)}
ID Transação: ${transactionId}
Autenticação: ${authCode}
Status: Liquidada / Paga com sucesso`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 rounded-3xl bg-[#141416] border border-white/10 shadow-2xl text-left overflow-hidden print:m-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Glow Decorativo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none print:hidden" />

        {/* Top Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-gradient-to-r from-white/[0.03] to-transparent print:border-zinc-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10 print:border-emerald-600">
              <CheckCircle className="w-7 h-7" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Comprovante Oficial de Quitação
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white font-display mt-0.5 print:text-black">
                Recibo de Pagamento SaaS
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5 print:text-zinc-600">
                Fatura: <span className="text-white font-bold print:text-black">{invoice.invoiceNumber}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer print:hidden"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Recibo */}
        <div className="p-6 space-y-5 print:p-4 print:space-y-4">
          {/* Card Principal de Valor e Status */}
          <div className="p-5 rounded-2xl bg-[#1C1C20] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner print:bg-zinc-50 print:border-zinc-200">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 block print:text-zinc-500">
                Valor Total Liquidado
              </span>
              <div className="text-3xl font-extrabold font-display text-[#D4AF37] tabular-nums mt-0.5 print:text-zinc-900">
                {formatCurrency(invoice.amount)}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <ShieldCheck className="w-4 h-4" weight="fill" />
                <span>Pagamento confirmado e compensado</span>
              </span>
            </div>

            <div className="flex flex-col sm:items-end text-left sm:text-right">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 print:text-zinc-500">
                Data da Liquidação
              </span>
              <span className="text-sm font-bold font-mono text-white mt-0.5 print:text-black">
                {formatDatePtBR(paymentDate)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 text-zinc-300 border border-white/5 mt-1.5 print:border-zinc-300 print:text-zinc-800">
                {isStripe ? (
                  <>
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" weight="bold" />
                    <span>Cartão de Crédito (Stripe)</span>
                  </>
                ) : isPix ? (
                  <>
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" weight="bold" />
                    <span>PIX Instantâneo</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" weight="bold" />
                    <span>{invoice.paymentMethod || 'Pagamento Digital'}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Dados do Emissor e do Destinatário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1 print:border-zinc-200 print:bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
                Emissor da Fatura
              </span>
              <p className="font-bold text-white print:text-black">Naville Barber Tecnologia SaaS</p>
              <p className="text-zinc-400 text-[11px] font-mono print:text-zinc-600">CNPJ: 48.912.304/0001-89</p>
              <p className="text-zinc-400 text-[11px] print:text-zinc-600">financeiro@navillebarber.pro</p>
              <p className="text-zinc-400 text-[11px] print:text-zinc-600">navillebarber.pro</p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1 print:border-zinc-200 print:bg-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] block">
                Barbearia Assinante
              </span>
              <p className="font-bold text-white print:text-black">
                {invoice.tenantName || tenant?.name || 'Barbearia Parceira'}
              </p>
              <p className="text-zinc-400 text-[11px] font-mono print:text-zinc-600">
                Slug: /b/{tenant?.slug || 'painel'}
              </p>
              <p className="text-zinc-400 text-[11px] print:text-zinc-600">
                Plano: <span className="font-semibold text-white capitalize print:text-black">{tenant?.plan || 'Pro'} ({tenant?.plano_ciclo || 'Mensal'})</span>
              </p>
              <p className="text-zinc-400 text-[11px] print:text-zinc-600">
                Status: <span className="text-emerald-400 font-bold">Ativa / Em Dia</span>
              </p>
            </div>
          </div>

          {/* Discriminação dos Serviços */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2.5 print:border-zinc-200 print:bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block print:text-zinc-600">
              Discriminação da Prestação de Serviço
            </span>
            <div className="divide-y divide-white/5 print:divide-zinc-200">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block print:text-black">{item.description}</span>
                      <span className="text-[10px] text-zinc-500 font-mono print:text-zinc-600">
                        Qtd: {item.quantity} × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-white tabular-nums print:text-black">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white block print:text-black">
                      Licença de Uso Naville Barber SaaS - Mensalidade
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono print:text-zinc-600">
                      Agendamentos Online + Disparos WhatsApp Ilimitados
                    </span>
                  </div>
                  <span className="font-bold font-mono text-white tabular-nums print:text-black">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Autenticação & Transação */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 print:bg-zinc-100 print:border-zinc-200 print:text-zinc-700">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-sans font-bold">
                ID da Transação
              </span>
              <span className="text-zinc-300 font-bold truncate block max-w-xs print:text-black">
                {transactionId}
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-zinc-500 block text-[10px] uppercase font-sans font-bold">
                Código de Autenticação Digital
              </span>
              <span className="text-[#D4AF37] font-bold block print:text-zinc-900">
                {authCode}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 text-center leading-relaxed print:text-zinc-600">
            Este documento digital possui validade fiscal como recibo de quitação emitido sob os termos do contrato de licença SaaS Naville Barber. Não substitui nota fiscal municipal quando solicitada.
          </p>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopySummary}
              className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer flex-1 sm:flex-initial"
              title="Copiar resumo do recibo para área de transferência"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" weight="bold" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  <span>Copiar Dados</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer flex-1 sm:flex-initial"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-bold transition cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95"
          >
            Fechar Recibo
          </button>
        </div>
      </div>
    </div>
  );
};
