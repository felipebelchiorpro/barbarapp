import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkle,
  LockKey,
  LockKeyOpen,
  Clock,
  ClipboardText,
  Warning,
  Check,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import {
  CashTransaction,
  CashPaymentMethod,
  CashTransactionCategory,
  CashRegisterSession,
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
  const STORAGE_KEY = `naville_cash_session_${tenantId}`;

  // Estado da Sessão do Caixa (Aberto vs Fechado)
  const [session, setSession] = useState<CashRegisterSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler sessão do caixa:', e);
    }
    return null;
  });

  const isRegisterOpen = session?.status === 'aberto';

  const updateSession = (newSession: CashRegisterSession | null) => {
    setSession(newSession);
    if (newSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Modais
  const [isComandaModalOpen, setIsComandaModalOpen] = useState(false);
  const [isOpenRegisterModalOpen, setIsOpenRegisterModalOpen] = useState(false);
  const [isCloseRegisterModalOpen, setIsCloseRegisterModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'sangria' | 'suprimento'>('sangria');

  // Feedback de cópia WhatsApp
  const [copiedReport, setCopiedReport] = useState(false);

  // Form State para Abertura de Caixa
  const [openFormData, setOpenFormData] = useState({
    operador: barbers[0]?.name || 'Gerente / Caixa Balcão',
    fundoInicial: '100,00',
    observacoes: '',
  });

  // Form State para Fechamento de Caixa
  const [closeFormData, setCloseFormData] = useState({
    operador: barbers[0]?.name || 'Gerente / Caixa Balcão',
    saldoContadoDinheiro: '',
    observacoes: '',
  });

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

  // Transações relevantes para a sessão atual (ou todas de hoje se não houver timestamp de corte)
  const sessionTransactions = useMemo(() => {
    if (!session || !session.abertoEm) return transactions;
    return transactions.filter((tx) => {
      if (!tx.timestamp) return true;
      return new Date(tx.timestamp).getTime() >= new Date(session.abertoEm).getTime();
    });
  }, [transactions, session]);

  // Métricas do Caixa em Tempo Real
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let pixIn = 0;
    let cashIn = 0;
    let cardIn = 0;
    let totalSangrias = 0;
    let totalSuprimentos = 0;

    sessionTransactions.forEach((tx) => {
      if (tx.type === 'in') {
        totalIn += tx.amount;
        if (tx.paymentMethod === 'pix') pixIn += tx.amount;
        else if (tx.paymentMethod === 'cash') cashIn += tx.amount;
        else if (tx.paymentMethod === 'credit_card' || tx.paymentMethod === 'debit_card') cardIn += tx.amount;

        if (tx.category === 'suprimento_troco') {
          totalSuprimentos += tx.amount;
        }
      } else {
        totalOut += tx.amount;
        if (tx.category === 'sangria_retirada') {
          totalSangrias += tx.amount;
        }
      }
    });

    const netBalance = totalIn - totalOut;

    // Dinheiro físico esperado na gaveta:
    // Fundo Inicial da sessão + Todo o dinheiro que entrou (vendas + suprimentos) - Retiradas em dinheiro (sangrias)
    const fundo = session?.fundoInicial || 0;
    const saldoEsperadoGaveta = fundo + (cashIn - totalSuprimentos) + totalSuprimentos - totalSangrias;

    // Vendas puras (excluindo suprimentos)
    const totalVendas = totalIn - totalSuprimentos;

    return {
      totalIn,
      totalOut,
      netBalance,
      pixIn,
      cashIn,
      cardIn,
      totalSangrias,
      totalSuprimentos,
      totalVendas,
      saldoEsperadoGaveta: Math.max(0, saldoEsperadoGaveta),
      count: sessionTransactions.length,
    };
  }, [sessionTransactions, session]);

  // Handlers de Abertura do Caixa
  const handleOpenRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fundoNum = parseFloat(openFormData.fundoInicial.replace(',', '.')) || 0;

    const newSession: CashRegisterSession = {
      id: 'session_' + Date.now(),
      tenantId,
      status: 'aberto',
      abertoPor: openFormData.operador,
      abertoEm: new Date().toISOString(),
      fundoInicial: fundoNum,
      observacoes: openFormData.observacoes.trim() || undefined,
    };

    updateSession(newSession);

    // Registra movimentação de abertura no caixa se fundo > 0
    if (fundoNum > 0) {
      onAddTransaction({
        tenantId,
        description: `Abertura de Caixa (Fundo Inicial: ${formatCurrency(fundoNum)})`,
        type: 'in',
        amount: fundoNum,
        paymentMethod: 'cash',
        category: 'suprimento_troco',
        barbearia_id: tenantId,
        valor_total: fundoNum,
        forma_pagamento: 'cash',
        data_hora: new Date().toISOString(),
      });
    }

    setIsOpenRegisterModalOpen(false);
  };

  // Handlers de Fechamento do Caixa
  const handleOpenCloseModal = () => {
    setCloseFormData({
      operador: session?.abertoPor || barbers[0]?.name || 'Gerente / Caixa Balcão',
      saldoContadoDinheiro: metrics.saldoEsperadoGaveta.toFixed(2).replace('.', ','),
      observacoes: '',
    });
    setCopiedReport(false);
    setIsCloseRegisterModalOpen(true);
  };

  const handleCloseRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const contado = parseFloat(closeFormData.saldoContadoDinheiro.replace(',', '.')) || 0;
    const esperado = metrics.saldoEsperadoGaveta;
    const diferenca = contado - esperado;

    const closedSession: CashRegisterSession = {
      ...session,
      status: 'fechado',
      fechadoPor: closeFormData.operador,
      fechadoEm: new Date().toISOString(),
      saldoEsperadoDinheiro: esperado,
      saldoContadoDinheiro: contado,
      diferenca,
      totalVendas: metrics.totalVendas,
      totalDinheiro: metrics.cashIn,
      totalPix: metrics.pixIn,
      totalCartao: metrics.cardIn,
      totalSangrias: metrics.totalSangrias,
      totalSuprimentos: metrics.totalSuprimentos,
      observacoes: closeFormData.observacoes.trim() || undefined,
    };

    updateSession(closedSession);
    setIsCloseRegisterModalOpen(false);
  };

  // Copiar Relatório para WhatsApp
  const handleCopyWhatsAppReport = () => {
    const contado = parseFloat(closeFormData.saldoContadoDinheiro.replace(',', '.')) || 0;
    const esperado = metrics.saldoEsperadoGaveta;
    const diferenca = contado - esperado;
    const nowStr = new Date().toLocaleString('pt-BR');

    let statusDiff = '✅ BATEU PERFEITO (R$ 0,00)';
    if (diferenca > 0.01) {
      statusDiff = `🟢 SOBRA DE CAIXA: +${formatCurrency(diferenca)}`;
    } else if (diferenca < -0.01) {
      statusDiff = `⚠️ FALTA DE CAIXA: -${formatCurrency(Math.abs(diferenca))}`;
    }

    const reportText = `💈 *NAVILLE BARBER — FECHAMENTO DE CAIXA*
📅 *Data/Hora:* ${nowStr}
👤 *Operador:* ${closeFormData.operador}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *FATURAMENTO DO EXPEDIENTE*
• Total em Vendas: *${formatCurrency(metrics.totalVendas)}*
• PIX (Instantâneo): ${formatCurrency(metrics.pixIn)}
• Cartões (Crédito/Débito): ${formatCurrency(metrics.cardIn)}
• Dinheiro (Vendas): ${formatCurrency(metrics.cashIn - metrics.totalSuprimentos)}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💵 *CONFERÊNCIA DA GAVETA (ESPÉCIE)*
• Fundo de Troco Inicial: ${formatCurrency(session?.fundoInicial || 0)}
• Suprimentos Extras: +${formatCurrency(metrics.totalSuprimentos > (session?.fundoInicial || 0) ? metrics.totalSuprimentos - (session?.fundoInicial || 0) : 0)}
• Sangrias (Retiradas): -${formatCurrency(metrics.totalSangrias)}
• *Saldo Esperado na Gaveta:* *${formatCurrency(esperado)}*
• *Valor Contado na Gaveta:* *${formatCurrency(contado)}*
• *Apuração:* ${statusDiff}

${closeFormData.observacoes ? `📝 *Observações:* ${closeFormData.observacoes}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Relatório emitido pelo PDV Naville Barber Pro_`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3500);
  };

  // Sangria e Suprimento
  const handleOpenSangriaModal = () => {
    if (!isRegisterOpen) {
      setIsOpenRegisterModalOpen(true);
      return;
    }
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
    if (!isRegisterOpen) {
      setIsOpenRegisterModalOpen(true);
      return;
    }
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

  // Abrir venda balcão
  const handleOpenSaleModal = () => {
    if (!isRegisterOpen) {
      setIsOpenRegisterModalOpen(true);
      return;
    }
    setIsComandaModalOpen(true);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. STATUS BANNER DO CAIXA (ABERTO VS FECHADO) */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          isRegisterOpen
            ? 'bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border-emerald-500/30 shadow-lg shadow-emerald-500/5'
            : 'bg-gradient-to-r from-amber-950/40 via-[#18181B] to-[#18181B] border-amber-500/30'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              {isRegisterOpen ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Caixa Aberto
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <LockKey className="w-3.5 h-3.5" weight="bold" />
                  Caixa Fechado
                </span>
              )}

              <span className="text-xs text-zinc-400">
                {isRegisterOpen
                  ? `Iniciado às ${formatTimePtBR(session?.abertoEm?.split('T')[1]?.substring(0, 5) || '12:00')} por ${session?.abertoPor || 'Operador'} · Fundo: ${formatCurrency(session?.fundoInicial || 0)}`
                  : 'Abra o caixa informando o fundo de troco da gaveta para iniciar as vendas'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              {isRegisterOpen ? 'Caixa Operacional & Balcão' : 'Frente de Caixa em Espera'}
            </h2>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isRegisterOpen ? (
              <>
                <button
                  onClick={handleOpenSuprimentoModal}
                  className="h-10 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-white/5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" weight="bold" />
                  <span>Suprimento</span>
                </button>

                <button
                  onClick={handleOpenSangriaModal}
                  className="h-10 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-white/5 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5 text-rose-400" weight="bold" />
                  <span>Sangria</span>
                </button>

                <button
                  onClick={handleOpenSaleModal}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4" weight="bold" />
                  <span>+ Lançar Comanda / Venda</span>
                </button>

                <button
                  onClick={handleOpenCloseModal}
                  className="h-10 px-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LockKey className="w-3.5 h-3.5" weight="bold" />
                  <span>Fechar Caixa</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsOpenRegisterModalOpen(true)}
                className="h-11 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] hover:brightness-110 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition cursor-pointer"
              >
                <LockKeyOpen className="w-4 h-4" weight="bold" />
                <span>Abrir Caixa do Dia (Fundo de Troco)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. CARDS DE INDICADORES FINANCEIROS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Faturamento Total de Vendas */}
        <div className="p-4 rounded-2xl bg-[#141416] border border-amber-500/30 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Vendas Realizadas Hoje</span>
            <CurrencyDollar className="w-4 h-4 text-[#D4AF37]" weight="bold" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#D4AF37] mt-1">
            {formatCurrency(metrics.totalVendas)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            Cortes, upsells e produtos
          </span>
        </div>

        {/* Card 2: Saldo Físico na Gaveta (com Fundo Inicial) */}
        <div className="p-4 rounded-2xl bg-[#141416] border border-emerald-500/30">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Gaveta (Dinheiro Físico)</span>
            <Money className="w-4 h-4 text-emerald-400" weight="bold" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1">
            {formatCurrency(metrics.saldoEsperadoGaveta)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            Fundo ({formatCurrency(session?.fundoInicial || 0)}) + Espécie
          </span>
        </div>

        {/* Card 3: Recebido via PIX */}
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Recebido via PIX</span>
            <QrCode className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-teal-300 mt-1">
            {formatCurrency(metrics.pixIn)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Instantâneo em conta</span>
        </div>

        {/* Card 4: Cartões (Crédito & Débito) */}
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Cartões Maquininha</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-indigo-300 mt-1">
            {formatCurrency(metrics.cardIn)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Crédito e Débito</span>
        </div>
      </div>

      {/* 3. EXTRATO / HISTÓRICO DO CAIXA DO DIA COM SUPORTE A TROCO */}
      <div className="rounded-2xl bg-[#141416] border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white font-display">
              Movimentações do Caixa Hoje ({sessionTransactions.length})
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            Atualizado em tempo real
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {sessionTransactions.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Nenhuma movimentação registrada no caixa hoje.
            </div>
          ) : (
            sessionTransactions.map((tx) => {
              const isEntry = tx.type === 'in';

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
                        <span className="capitalize font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {tx.paymentMethod === 'pix' && 'PIX'}
                          {tx.paymentMethod === 'cash' && 'Dinheiro'}
                          {tx.paymentMethod === 'credit_card' && 'Crédito'}
                          {tx.paymentMethod === 'debit_card' && 'Débito'}
                        </span>

                        {/* EXIBIÇÃO DE TROCO E VALOR RECEBIDO */}
                        {tx.paymentMethod === 'cash' && (tx.valor_recebido !== undefined || tx.troco !== undefined) && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium flex items-center gap-1 font-mono">
                            <span>💵</span>
                            <span>
                              Pago: {formatCurrency(tx.valor_recebido || tx.amount)}
                            </span>
                            {tx.troco !== undefined && tx.troco > 0 ? (
                              <span className="font-bold text-amber-300">
                                · Troco: {formatCurrency(tx.troco)}
                              </span>
                            ) : (
                              <span>· Exato</span>
                            )}
                          </span>
                        )}
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

      {/* MODAL 1: ABERTURA DE CAIXA (FUNDO DE TROCO INICIAL) */}
      {isOpenRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#141416] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[#D4AF37] flex items-center justify-center">
                  <LockKeyOpen className="w-4 h-4" weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Abertura de Caixa
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Fundo de troco inicial para início do expediente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpenRegisterModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenRegisterSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Operador do Caixa *
                </label>
                <select
                  value={openFormData.operador}
                  onChange={(e) => setOpenFormData({ ...openFormData, operador: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} — {b.role || 'Barbeiro'}
                    </option>
                  ))}
                  <option value="Gerente / Caixa Balcão">Gerente / Caixa Balcão</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Fundo de Troco Inicial na Gaveta (R$) *
                </label>
                <input
                  type="text"
                  required
                  value={openFormData.fundoInicial}
                  onChange={(e) => setOpenFormData({ ...openFormData, fundoInicial: e.target.value })}
                  placeholder="100,00"
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-base font-bold focus:outline-none focus:border-[#D4AF37]"
                />

                {/* Atalhos Rápidos de Fundo de Troco */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-zinc-400">Atalhos:</span>
                  {['50,00', '100,00', '150,00', '200,00'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOpenFormData({ ...openFormData, fundoInicial: val })}
                      className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-300 text-zinc-300 text-[10px] font-mono border border-white/5 cursor-pointer transition"
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Observações de Abertura (Opcional)
                </label>
                <input
                  type="text"
                  value={openFormData.observacoes}
                  onChange={(e) => setOpenFormData({ ...openFormData, observacoes: e.target.value })}
                  placeholder="Ex: Notas de R$ 5,00 e moedas de R$ 1,00 para troco"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpenRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black font-extrabold text-xs transition cursor-pointer flex items-center gap-2"
                >
                  <LockKeyOpen className="w-4 h-4" weight="bold" />
                  <span>Confirmar Abertura</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FECHAMENTO DE CAIXA & CONFERÊNCIA DE GAVETA */}
      {isCloseRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#141416] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-left max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <LockKey className="w-4 h-4" weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Fechamento de Caixa
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Conferência de gaveta e apuração contábil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCloseRegisterModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Caixa */}
            <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Faturamento Vendas:</span>
                <span className="font-bold font-mono text-white">{formatCurrency(metrics.totalVendas)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Recebido via PIX:</span>
                <span className="font-mono text-teal-400">{formatCurrency(metrics.pixIn)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Recebido em Cartões:</span>
                <span className="font-mono text-indigo-400">{formatCurrency(metrics.cardIn)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Dinheiro Vendas:</span>
                <span className="font-mono text-amber-300">
                  {formatCurrency(Math.max(0, metrics.cashIn - metrics.totalSuprimentos))}
                </span>
              </div>
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Fundo de Troco Inicial:</span>
                <span className="font-mono text-zinc-300">+{formatCurrency(session?.fundoInicial || 0)}</span>
              </div>
              {metrics.totalSangrias > 0 && (
                <div className="flex items-center justify-between text-xs text-rose-400">
                  <span>Sangrias Realizadas:</span>
                  <span className="font-mono">-{formatCurrency(metrics.totalSangrias)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Saldo Esperado na Gaveta:
                </span>
                <span className="text-lg font-black font-mono text-[#D4AF37]">
                  {formatCurrency(metrics.saldoEsperadoGaveta)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCloseRegisterSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Responsável pelo Fechamento *
                </label>
                <select
                  value={closeFormData.operador}
                  onChange={(e) => setCloseFormData({ ...closeFormData, operador: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name} — {b.role || 'Barbeiro'}
                    </option>
                  ))}
                  <option value="Gerente / Caixa Balcão">Gerente / Caixa Balcão</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">
                    Valor Físico Contado na Gaveta (R$) *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCloseFormData({
                        ...closeFormData,
                        saldoContadoDinheiro: metrics.saldoEsperadoGaveta.toFixed(2).replace('.', ','),
                      })
                    }
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Preencher valor esperado
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={closeFormData.saldoContadoDinheiro}
                  onChange={(e) => setCloseFormData({ ...closeFormData, saldoContadoDinheiro: e.target.value })}
                  placeholder="0,00"
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-base font-bold focus:outline-none focus:border-[#D4AF37]"
                />

                {/* Feedback em Tempo Real da Diferença */}
                {(() => {
                  const contado = parseFloat(closeFormData.saldoContadoDinheiro.replace(',', '.')) || 0;
                  const esperado = metrics.saldoEsperadoGaveta;
                  const diff = contado - esperado;

                  if (Math.abs(diff) < 0.01) {
                    return (
                      <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" weight="bold" />
                        <span className="font-semibold">Caixa bateu perfeitamente! Nenhuma diferença.</span>
                      </div>
                    );
                  }

                  if (diff > 0) {
                    return (
                      <div className="mt-2 p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between">
                        <span>🟢 Sobra de Caixa:</span>
                        <strong className="font-mono font-bold">+{formatCurrency(diff)}</strong>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Warning className="w-4 h-4 shrink-0" weight="bold" />
                        Falta de Caixa (Diferença Negativa):
                      </span>
                      <strong className="font-mono font-bold">-{formatCurrency(Math.abs(diff))}</strong>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Observações de Fechamento (Opcional)
                </label>
                <input
                  type="text"
                  value={closeFormData.observacoes}
                  onChange={(e) => setCloseFormData({ ...closeFormData, observacoes: e.target.value })}
                  placeholder="Ex: Moedas contadas e conferidas com o gerente"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Botão Copiar WhatsApp */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopyWhatsAppReport}
                  className="w-full h-10 px-4 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ClipboardText className="w-4 h-4" weight="bold" />
                  <span>
                    {copiedReport ? '✅ Relatório Copiado com Sucesso!' : 'Copiar Resumo para WhatsApp'}
                  </span>
                </button>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloseRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs transition cursor-pointer flex items-center gap-2"
                >
                  <LockKey className="w-4 h-4" weight="bold" />
                  <span>Confirmar Fechamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FECHAMENTO DE COMANDA COMPLETO (LTV, SERVIÇOS EXTRAS E PRODUTOS + TROCO) */}
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

      {/* MODAL 4: SANGRIA E SUPRIMENTO DE CAIXA */}
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
