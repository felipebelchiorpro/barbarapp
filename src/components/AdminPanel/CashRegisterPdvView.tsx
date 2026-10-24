import React, { useState, useMemo } from 'react';
import {
  CurrencyDollar,
  Plus,
  Minus,
  Coins,
  CreditCard,
  QrCode,
  Money,
  Receipt,
  Scissors,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CheckCircle,
  UsersThree,
  ShoppingBagOpen,
  Sparkle
} from '@phosphor-icons/react';
import {
  CashTransaction,
  CashPaymentMethod,
  CashTransactionCategory,
  Barber,
  Service,
  Product,
  CustomerProfile,
  ClientSubscriptionPlan,
} from '../../types';
import { formatCurrency, formatTimePtBR } from '../../utils/formatters';
import { ComandaSaleModal } from './ComandaSaleModal';
import { INITIAL_PRODUCTS } from '../../data/mockData';

interface CashRegisterPdvViewProps {
  transactions: CashTransaction[];
  barbers: Barber[];
  services: Service[];
  products?: Product[];
  customers?: CustomerProfile[];
  clientPlans?: ClientSubscriptionPlan[];
  tenantId: string;
  onAddTransaction: (newTx: Omit<CashTransaction, 'id' | 'timestamp'>) => void;
  onAddCustomer?: (newCustomer: Omit<CustomerProfile, 'id' | 'createdAt'>) => void;
  onUpdateCustomer?: (customer: CustomerProfile) => void;
}

export const CashRegisterPdvView: React.FC<CashRegisterPdvViewProps> = ({
  transactions,
  barbers,
  services,
  products = INITIAL_PRODUCTS,
  customers = [],
  clientPlans = [],
  tenantId,
  onAddTransaction,
  onAddCustomer,
  onUpdateCustomer,
}) => {
  // Modal de Comanda Completa (Venda Balcão / Upsell / Cross-sell / LTV)
  const [isComandaModalOpen, setIsComandaModalOpen] = useState(false);

  // Modal Auxiliar (Sangria / Suprimento)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'sangria' | 'suprimento'>('sangria');

  // Form State para Sangria e Suprimento
  const [formData, setFormData] = useState<{
    description: string;
    amount: string;
    paymentMethod: CashPaymentMethod;
    category: CashTransactionCategory;
  }>({
    description: '',
    amount: '',
    paymentMethod: 'cash',
    category: 'sangria_retirada',
  });

  // Calculate Cash Metrics
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let pixIn = 0;
    let cashIn = 0;
    let cardIn = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'in') {
        totalIn += tx.amount;
        if (tx.paymentMethod === 'pix') pixIn += tx.amount;
        else if (tx.paymentMethod === 'cash') cashIn += tx.amount;
        else if (tx.paymentMethod === 'credit_card' || tx.paymentMethod === 'debit_card') cardIn += tx.amount;
      } else {
        totalOut += tx.amount;
      }
    });

    const netBalance = totalIn - totalOut;

    return { totalIn, totalOut, netBalance, pixIn, cashIn, cardIn, count: transactions.length };
  }, [transactions]);

  // Abertura do Modal de Comanda Completa
  const handleOpenSaleModal = () => {
    setIsComandaModalOpen(true);
  };

  const handleOpenSangriaModal = () => {
    setModalType('sangria');
    setFormData({
      description: 'Sangria de Caixa / Retirada',
      amount: '',
      paymentMethod: 'cash',
      category: 'sangria_retirada',
    });
    setIsModalOpen(true);
  };

  const handleOpenSuprimentoModal = () => {
    setModalType('suprimento');
    setFormData({
      description: 'Suprimento / Entrada de Troco',
      amount: '',
      paymentMethod: 'cash',
      category: 'suprimento_troco',
    });
    setIsModalOpen(true);
  };

  const handleSangriaSuprimentoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formData.amount.replace(',', '.'));
    if (isNaN(amountVal) || amountVal <= 0) return;

    onAddTransaction({
      tenantId,
      description: formData.description.trim() || (modalType === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Troco'),
      type: modalType === 'sangria' ? 'out' : 'in',
      amount: amountVal,
      paymentMethod: formData.paymentMethod,
      category: formData.category,
      barbearia_id: tenantId,
      valor_total: amountVal,
      forma_pagamento: formData.paymentMethod,
      data_hora: new Date().toISOString(),
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-[#D4AF37] border border-amber-500/30">
              Frente de Caixa & PDV
            </span>
            <span className="text-xs text-zinc-400">
              Fechamento de Comanda, Serviços Extras e Produtos
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-1">
            Caixa Operacional & Balcão
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleOpenSuprimentoModal}
            className="h-10 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" weight="bold" />
            <span>Suprimento</span>
          </button>

          <button
            onClick={handleOpenSangriaModal}
            className="h-10 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5 text-red-400" weight="bold" />
            <span>Sangria</span>
          </button>

          <button
            onClick={handleOpenSaleModal}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            <Receipt className="w-4 h-4" weight="bold" />
            <span>+ Lançar Venda / Comanda Balcão</span>
          </button>
        </div>
      </div>

      {/* 4 Cards: Caixa Total, PIX, Cartões, Dinheiro Físico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#141416] border border-amber-500/30 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Saldo do Caixa Hoje</span>
            <CurrencyDollar className="w-4 h-4 text-[#D4AF37]" weight="bold" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#D4AF37] mt-1">
            {formatCurrency(metrics.netBalance)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Entradas líquidas apuradas</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Recebido via PIX</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1">
            {formatCurrency(metrics.pixIn)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Instantâneo em conta</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Cartões (Crédito/Débito)</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-indigo-300 mt-1">
            {formatCurrency(metrics.cardIn)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Operações na maquininha</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Dinheiro em Espécie</span>
            <Money className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-300 mt-1">
            {formatCurrency(metrics.cashIn)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Disponível na gaveta</span>
        </div>
      </div>

      {/* Extrato / Histórico do Caixa do Dia */}
      <div className="rounded-2xl bg-[#141416] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white font-display">
              Movimentações do Caixa Hoje ({transactions.length})
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            Atualizado em tempo real
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Nenhuma movimentação registrada no caixa hoje.
            </div>
          ) : (
            transactions.map((tx) => {
              const isEntry = tx.type === 'in';
              const hasItems = (tx.servicos && tx.servicos.length > 0) || (tx.produtos && tx.produtos.length > 0);

              return (
                <div
                  key={tx.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isEntry
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isEntry ? (
                        <ArrowDownLeft className="w-4 h-4" weight="bold" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" weight="bold" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white">
                          {tx.description}
                        </h4>
                        {/* Badges de Itens da Comanda */}
                        {tx.servicos && tx.servicos.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            ✂️ {tx.servicos.length} {tx.servicos.length === 1 ? 'serviço' : 'serviços'}
                          </span>
                        )}
                        {tx.produtos && tx.produtos.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            🧴 {tx.produtos.length} {tx.produtos.length === 1 ? 'produto' : 'produtos'}
                          </span>
                        )}
                        {(tx.cliente_id || tx.customerId) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-amber-500/30 font-medium flex items-center gap-1">
                            <Sparkle className="w-3 h-3" weight="fill" />
                            LTV Vinculado
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        {tx.customerName && (
                          <span>
                            Cliente: <strong className="text-zinc-200">{tx.customerName}</strong>
                          </span>
                        )}
                        {tx.barberName && (
                          <>
                            <span>·</span>
                            <span>Barbeiro: {tx.barberName}</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="capitalize font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {tx.paymentMethod === 'pix' && 'PIX'}
                          {tx.paymentMethod === 'cash' && 'Dinheiro'}
                          {tx.paymentMethod === 'credit_card' && 'Crédito'}
                          {tx.paymentMethod === 'debit_card' && 'Débito'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-base font-extrabold font-mono ${
                        isEntry ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isEntry ? '+' : '-'} {formatCurrency(tx.amount)}
                    </span>
                    <span className="text-[10px] text-zinc-500 block font-mono">
                      {formatTimePtBR(tx.timestamp.split('T')[1]?.substring(0, 5) || '12:00')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: FECHAMENTO DE COMANDA COMPLETO (LTV, SERVIÇOS EXTRAS E PRODUTOS) */}
      <ComandaSaleModal
        isOpen={isComandaModalOpen}
        onClose={() => setIsComandaModalOpen(false)}
        barbers={barbers}
        services={services}
        products={products}
        customers={customers}
        clientPlans={clientPlans}
        tenantId={tenantId}
        onConfirmComanda={({ transaction, updatedCustomer, newCustomerData }) => {
          onAddTransaction(transaction);
          if (updatedCustomer && onUpdateCustomer) {
            onUpdateCustomer(updatedCustomer);
          } else if (newCustomerData && onAddCustomer) {
            onAddCustomer(newCustomerData);
          }
        }}
      />

      {/* MODAL 2: SANGRIA E SUPRIMENTO DE CAIXA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#141416] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white font-display">
                {modalType === 'sangria' && 'Sangria de Caixa (Retirada)'}
                {modalType === 'suprimento' && 'Suprimento de Caixa (Troco)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSangriaSuprimentoSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Descrição da Movimentação *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={modalType === 'sangria' ? 'Ex: Retirada almoço ou pagamento fornecedor' : 'Ex: Entrada de troco em moedas/cédulas'}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="50,00"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Forma de Movimentação *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cash', label: 'Dinheiro Físico (Gaveta)' },
                    { id: 'pix', label: 'PIX (Conta Digital)' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id as CashPaymentMethod })}
                      className={`h-9 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                        formData.paymentMethod === method.id
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold'
                          : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#B38F24] text-black font-extrabold text-xs transition cursor-pointer"
                >
                  Confirmar {modalType === 'sangria' ? 'Sangria' : 'Suprimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
