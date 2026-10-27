import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Scissors,
  ShoppingBagOpen,
  User,
  UserPlus,
  UsersThree,
  Trash,
  Plus,
  Minus,
  CheckCircle,
  CurrencyDollar,
  QrCode,
  Money,
  CreditCard,
  MagnifyingGlass,
  Sparkle,
  WarningCircle,
  CaretDown,
  Receipt,
  Crown,
} from '@phosphor-icons/react';
import {
  Barber,
  Service,
  Product,
  CustomerProfile,
  ClientSubscriptionPlan,
  CashTransaction,
  CashPaymentMethod,
  ComandaServiceItem,
  ComandaProductItem,
} from '../../types';
import { INITIAL_PRODUCTS } from '../../data/mockData';
import { formatCurrency, formatPhone } from '../../utils/formatters';
import { logSystemError } from '../../services/systemErrorLogService';
import { validateServiceForSubscriber, getTodayDateString } from '../../services/subscriptionValidator';

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ComandaSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  barbers: Barber[];
  services: Service[];
  products?: Product[];
  customers: CustomerProfile[];
  clientPlans?: ClientSubscriptionPlan[];
  tenantId: string;
  onConfirmComanda: (data: {
    transaction: Omit<CashTransaction, 'id' | 'timestamp'>;
    updatedCustomer?: CustomerProfile;
    newCustomerData?: Omit<CustomerProfile, 'id' | 'createdAt'>;
  }) => void;
}

export const ComandaSaleModal: React.FC<ComandaSaleModalProps> = ({
  isOpen,
  onClose,
  barbers,
  services,
  products = INITIAL_PRODUCTS,
  customers,
  clientPlans = [],
  tenantId,
  onConfirmComanda,
}) => {
  // 1. Cliente State (LTV, Busca Inteligente e Avulso)
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState<boolean>(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');

  // Fechar dropdown de busca ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCustomerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 2. Profissional Responsável
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    barbers[0]?.id || ''
  );

  // 3. Serviços Adicionados
  const [selectedServices, setSelectedServices] = useState<ComandaServiceItem[]>(() => {
    const baseService = services.find((s) => s.popular) || services[0];
    return baseService
      ? [{ id: baseService.id, name: baseService.name, price: baseService.price }]
      : [];
  });
  const [selectedExtraServiceId, setSelectedExtraServiceId] = useState<string>('');

  // 4. Produtos Adicionados
  const [selectedProducts, setSelectedProducts] = useState<ComandaProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // 5. Forma de Pagamento & Calculadora de Troco
  const [paymentMethod, setPaymentMethod] = useState<CashPaymentMethod>('pix');
  const [cashReceived, setCashReceived] = useState<string>('');

  // Filtro inteligente de clientes por nome ou telefone
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const query = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Detecção de Assinatura / Clube VIP do Cliente Selecionado
  const clientPlan = useMemo(() => {
    if (!selectedCustomer || selectedCustomer.status_assinatura !== 'ativo' || !selectedCustomer.plano_assinatura_id) {
      return null;
    }
    return clientPlans.find((p) => p.id === selectedCustomer.plano_assinatura_id && p.ativo !== false) || null;
  }, [selectedCustomer, clientPlans]);

  // Dia da semana de hoje (0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb)
  const todayDayOfWeek = useMemo(() => new Date().getDay(), []);

  // O plano é válido hoje pelos dias da semana permitidos?
  const isPlanValidToday = useMemo(() => {
    if (!clientPlan) return false;
    if (!clientPlan.dias_permitidos || clientPlan.dias_permitidos.length === 0) return true;
    return clientPlan.dias_permitidos.includes(todayDayOfWeek);
  }, [clientPlan, todayDayOfWeek]);

  // NÍVEL 3: Validador de cobertura do Clube de Assinaturas (Status Ativo, Vencimento >= Hoje, Cota)
  const getServiceValidation = (service: { id: string; name: string; price: number }) => {
    if (!selectedCustomer || !clientPlan) {
      return { isCovered: false, effectivePrice: service.price, reason: 'Sem plano ativo', isExpired: false, isQuotaExceeded: false };
    }
    const valResult = validateServiceForSubscriber({
      customer: selectedCustomer,
      plan: clientPlan,
      service,
      currentDate: getTodayDateString(),
    });

    const isCoveredFinal = valResult.isCovered && isPlanValidToday;
    return {
      isCovered: isCoveredFinal,
      effectivePrice: isCoveredFinal ? 0 : service.price,
      reason: !isPlanValidToday ? `Plano não válido hoje (${WEEKDAY_NAMES[todayDayOfWeek]})` : valResult.reason,
      isExpired: valResult.isExpired,
      isQuotaExceeded: valResult.reason.includes('Cota mensal esgotada'),
    };
  };

  // Função auxiliar para verificar se um serviço está coberto pelo plano VIP hoje
  const isServiceCovered = (serviceId: string) => {
    const srv = selectedServices.find((s) => s.id === serviceId) || services.find((s) => s.id === serviceId);
    if (!srv) return false;
    return getServiceValidation(srv).isCovered;
  };

  // Cálculos reativos de totais (Serviços cobertos no plano VIP têm custo R$ 0,00)
  const subtotalServices = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
      const covered = isServiceCovered(s.id);
      return sum + (covered ? 0 : s.price);
    }, 0);
  }, [selectedServices, clientPlan, isPlanValidToday]);

  const subtotalProducts = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + p.subtotal, 0);
  }, [selectedProducts]);

  const totalComanda = useMemo(() => {
    return subtotalServices + subtotalProducts;
  }, [subtotalServices, subtotalProducts]);

  // Quantidade de serviços cobertos na comanda
  const coveredServicesCount = useMemo(() => {
    return selectedServices.filter((s) => isServiceCovered(s.id)).length;
  }, [selectedServices, clientPlan, isPlanValidToday]);

  if (!isOpen) return null;

  // Handlers de Serviços
  const handleAddExtraService = () => {
    if (!selectedExtraServiceId) return;
    const srv = services.find((s) => s.id === selectedExtraServiceId);
    if (!srv) return;

    setSelectedServices((prev) => [
      ...prev,
      { id: srv.id, name: srv.name, price: srv.price },
    ]);
    setSelectedExtraServiceId('');
  };

  const handleRemoveService = (index: number) => {
    setSelectedServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers de Produtos
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    // Se já estiver na lista, apenas incrementa quantidade
    const existingIndex = selectedProducts.findIndex((p) => p.id === prod.id);
    if (existingIndex >= 0) {
      setSelectedProducts((prev) =>
        prev.map((item, idx) => {
          if (idx === existingIndex) {
            const nextQty = item.quantity + 1;
            return {
              ...item,
              quantity: nextQty,
              subtotal: nextQty * item.unitPrice,
            };
          }
          return item;
        })
      );
    } else {
      setSelectedProducts((prev) => [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          quantity: 1,
          unitPrice: prod.price,
          subtotal: prod.price,
        },
      ]);
    }
    setSelectedProductId('');
  };

  const handleUpdateProductQuantity = (productId: string, delta: number) => {
    setSelectedProducts((prev) =>
      prev
        .map((p) => {
          if (p.id === productId) {
            const newQty = p.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...p,
              quantity: newQty,
              subtotal: newQty * p.unitPrice,
            };
          }
          return p;
        })
        .filter((p): p is ComandaProductItem => p !== null)
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Handler de Cadastro Rápido de Cliente
  const handleSaveQuickCustomer = () => {
    if (!quickName.trim()) return;
    setIsGuest(false);
    setIsQuickRegisterOpen(false);
  };

  // Submissão da Comanda Completa
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isVipAttendance = Boolean(clientPlan && isPlanValidToday && coveredServicesCount > 0);
    if (totalComanda <= 0 && !isVipAttendance) return;

    const barber = barbers.find((b) => b.id === selectedBarberId) || barbers[0];
    const barberName = barber?.name || 'Profissional';

    // Determina nome e telefone do cliente
    let clientName = 'Cliente Avulso';
    let clientPhone: string | undefined = undefined;
    let customerIdToPersist: string | null = null;
    let updatedCustomer: CustomerProfile | undefined = undefined;
    let newCustomerData: Omit<CustomerProfile, 'id' | 'createdAt'> | undefined = undefined;

    if (selectedCustomer) {
      clientName = selectedCustomer.name;
      clientPhone = selectedCustomer.phone;
      customerIdToPersist = selectedCustomer.id;

      // Atualiza LTV acumulado, visitas e cotas de corte VIP consumidas
      const newTotalSpent = (selectedCustomer.totalSpent || 0) + totalComanda;
      const newTotalBookings = (selectedCustomer.totalBookings || 0) + 1;
      const newCortesMes = (selectedCustomer.cortes_utilizados_mes || 0) + (isVipAttendance ? 1 : 0);

      updatedCustomer = {
        ...selectedCustomer,
        totalSpent: newTotalSpent,
        total_gasto: newTotalSpent,
        totalBookings: newTotalBookings,
        total_visitas: newTotalBookings,
        cortes_utilizados_mes: newCortesMes,
        lastVisitDate: new Date().toISOString().split('T')[0],
        ultima_visita: new Date().toISOString().split('T')[0],
        favoriteBarberId: barber?.id,
        favoriteBarberName: barber?.name,
      };
    } else if (quickName.trim()) {
      clientName = quickName.trim();
      clientPhone = quickPhone.trim() || undefined;

      // Prepara novo cliente com LTV inicial da comanda
      newCustomerData = {
        tenantId,
        name: clientName,
        phone: clientPhone || '11900000000',
        totalSpent: totalComanda,
        total_gasto: totalComanda,
        totalBookings: 1,
        total_visitas: 1,
        cortes_utilizados_mes: 0,
        lastVisitDate: new Date().toISOString().split('T')[0],
        ultima_visita: new Date().toISOString().split('T')[0],
        favoriteBarberId: barber?.id,
        favoriteBarberName: barber?.name,
        notes: 'Cadastrado no balcão via comanda rápida.',
      };
    }

    // Composição da descrição resumida da transação
    const servicesDesc = selectedServices
      .map((s) => `${s.name}${isServiceCovered(s.id) ? ' (Plano VIP R$0)' : ''}`)
      .join(', ');
    const productsDesc = selectedProducts
      .map((p) => `${p.quantity}x ${p.name}`)
      .join(', ');
    const parts = [];
    if (servicesDesc) parts.push(`Serviços: ${servicesDesc}`);
    if (productsDesc) parts.push(`Produtos: ${productsDesc}`);
    if (isVipAttendance) parts.push(`Membro VIP: ${clientPlan?.nome}`);
    const fullDescription = `Comanda Balcão (${clientName}): ${parts.join(' + ')}`;

    const receivedNum = paymentMethod === 'cash' ? (parseFloat(cashReceived.replace(',', '.')) || totalComanda) : totalComanda;
    const changeNum = paymentMethod === 'cash' ? Math.max(0, receivedNum - totalComanda) : 0;

    const transaction: Omit<CashTransaction, 'id' | 'timestamp'> = {
      tenantId,
      description: fullDescription,
      type: 'in',
      amount: totalComanda,
      paymentMethod,
      category: selectedProducts.length > 0 && selectedServices.length === 0 ? 'produto_venda' : 'servico_corte',
      barberId: barber?.id,
      barberName,
      customerId: customerIdToPersist,
      customerName: clientName,
      customerPhone: clientPhone,
      barbearia_id: tenantId,
      cliente_id: customerIdToPersist,
      barbeiro_id: barber?.id,
      servicos: selectedServices.map((s) => ({
        id: s.id,
        name: s.name,
        price: isServiceCovered(s.id) ? 0 : s.price,
      })),
      produtos: selectedProducts,
      valor_total: totalComanda,
      forma_pagamento: paymentMethod,
      valor_recebido: receivedNum,
      troco: changeNum,
      data_hora: new Date().toISOString(),
    };

    try {
      onConfirmComanda({
        transaction,
        updatedCustomer,
        newCustomerData,
      });
      onClose();
    } catch (err: unknown) {
      logSystemError({
        barbearia_id: tenantId,
        nivel: 'critico',
        modulo: 'pdv_checkout',
        mensagem_erro: `Falha ao processar fechamento de comanda: ${(err as Error).message}`,
        detalhes_tecnicos: {
          errorName: (err as Error).name,
          stackTrace: (err as Error).stack,
          transaction,
        },
        showToast: true,
        toastMessage: 'Não foi possível concluir o lançamento da comanda. Tente novamente em instantes.',
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl lg:max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-[#141416] border border-amber-500/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-left">
        {/* 1. CABEÇALHO */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-[#18181B]/90 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D4AF37] shrink-0">
              <Receipt className="w-5 h-5" weight="bold" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white font-display flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>Lançar Venda / Atendimento Balcão</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold tracking-wide">
                  Comanda
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate sm:whitespace-normal">
                Fechamento de comanda com múltiplos serviços, produtos e fidelização (LTV)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 ml-2"
            title="Fechar modal (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO MODAL COM SCROLL SUAVE */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 custom-scrollbar">
          {/* 2. CLIENTE (RASTREIO DE LTV) */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#D4AF37]" weight="bold" />
                Cliente & Fidelização (LTV)
              </label>

              {/* Botões de Alternância Rápida: Cadastrado / Avulso / Novo */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsGuest(true);
                    setSelectedCustomerId(null);
                    setCustomerSearch('');
                    setIsQuickRegisterOpen(false);
                    setQuickName('');
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition border cursor-pointer ${
                    isGuest
                      ? 'bg-zinc-700 text-white border-zinc-500'
                      : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  Cliente Avulso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickRegisterOpen(!isQuickRegisterOpen);
                    setIsGuest(false);
                    setSelectedCustomerId(null);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition border flex items-center gap-1 cursor-pointer ${
                    isQuickRegisterOpen
                      ? 'bg-amber-500/20 text-[#D4AF37] border-amber-500/40'
                      : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-[#D4AF37]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Cadastrar Rápido
                </button>
              </div>
            </div>

            {/* SELECIONADO: Card de Cliente com LTV e Clube VIP */}
            {selectedCustomer && !isGuest && !isQuickRegisterOpen ? (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-white gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#D4AF37] text-black font-bold flex items-center justify-center text-sm shadow shrink-0">
                      {selectedCustomer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">
                          {selectedCustomer.name}
                        </span>
                        {clientPlan && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37] text-black flex items-center gap-1 shadow-sm shrink-0">
                            <Crown className="w-3 h-3" weight="fill" />
                            {clientPlan.nome}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 block font-mono">
                        {formatPhone(selectedCustomer.phone)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">
                        LTV Acumulado
                      </span>
                      <span className="text-xs font-bold text-[#E5A93C] font-mono">
                        {formatCurrency(selectedCustomer.totalSpent || 0)} • {selectedCustomer.totalBookings || 0} visitas
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setCustomerSearch('');
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                      title="Trocar cliente"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Banner de Status do Plano VIP */}
                {clientPlan && (
                  isPlanValidToday ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-emerald-400 shrink-0" weight="fill" />
                        <span>
                          <strong>Plano Ativo:</strong> Serviços cobertos zerados hoje ({WEEKDAY_NAMES[todayDayOfWeek]}).
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        {selectedCustomer.cortes_utilizados_mes || 0} corte(s) no mês
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                      <WarningCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" weight="fill" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">
                          Plano não aplicável hoje ({WEEKDAY_NAMES[todayDayOfWeek]})
                        </p>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          O plano <span className="text-amber-300 font-semibold">{clientPlan.nome}</span> é válido somente em {clientPlan.dias_permitidos.map((d) => WEEKDAY_SHORT[d]).join(', ')}. Os serviços serão cobrados normalmente no valor avulso.
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : isQuickRegisterOpen ? (
              /* CADASTRO RÁPIDO INLINE */
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5">
                    <Sparkle className="w-3.5 h-3.5" weight="fill" />
                    Novo Cliente Rápido
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickRegisterOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nome Completo *"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp (ex: 11987654321)"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                {quickName.trim() && (
                  <p className="text-[11px] text-amber-300 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" weight="fill" />
                    O cliente será registrado no banco e acumulará o valor desta comanda no LTV.
                  </p>
                )}
              </div>
            ) : isGuest ? (
              /* CLIENTE AVULSO CONFIRMADO */
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-white/10 text-zinc-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-white block">
                      Cliente Avulso (Não identificado)
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Venda anônima de balcão (sem registro de histórico de LTV)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGuest(false)}
                  className="text-xs text-[#D4AF37] hover:underline font-semibold"
                >
                  Buscar cliente
                </button>
              </div>
            ) : (
              /* AUTOCOMPLETE SEARCH INPUT */
              <div ref={searchContainerRef} className="relative">
                <div className="relative flex items-center">
                  <MagnifyingGlass className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={customerSearch}
                    onFocus={() => {
                      if (customerSearch.trim()) setIsCustomerDropdownOpen(true);
                    }}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsCustomerDropdownOpen(false);
                      }
                    }}
                    placeholder="Digite o nome ou telefone do cliente cadastrado..."
                    className="w-full h-10 pl-9 pr-10 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                  {customerSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                      title="Limpar busca e fechar (ESC)"
                    >
                      <X className="w-3.5 h-3.5" weight="bold" />
                    </button>
                  )}
                </div>

                {/* Dropdown de Resultados da Busca */}
                {isCustomerDropdownOpen && customerSearch.trim() && (
                  <div className="absolute left-0 right-0 top-12 z-20 max-h-60 overflow-y-auto bg-[#1A1A1E] border border-amber-500/30 rounded-xl shadow-2xl p-1.5 space-y-1 custom-scrollbar">
                    {/* Header com botão explícito de fechar */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5 text-[11px] text-zinc-400">
                      <span>
                        {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} encontrado{filteredCustomers.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(false)}
                        className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-white/10 transition cursor-pointer"
                        title="Fechar sem selecionar (ESC)"
                      >
                        <X className="w-3 h-3" weight="bold" />
                        <span>Fechar</span>
                      </button>
                    </div>

                    {filteredCustomers.length > 0 ? (
                      <>
                        {filteredCustomers.map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(cust.id);
                              setCustomerSearch('');
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 transition text-left cursor-pointer group gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-7 h-7 rounded-full bg-[#D4AF37]/20 border border-amber-500/40 text-[#D4AF37] font-bold text-xs flex items-center justify-center shrink-0">
                                {cust.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white group-hover:text-[#D4AF37] block truncate">
                                  {cust.name}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono block">
                                  {formatPhone(cust.phone)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold font-mono whitespace-nowrap">
                                LTV: {formatCurrency(cust.totalSpent || 0)} • {cust.totalBookings || 0} visitas
                              </span>
                            </div>
                          </button>
                        ))}

                        {/* Botão de Rodapé para fechar sem selecionar */}
                        <div className="pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsCustomerDropdownOpen(false)}
                            className="w-full text-center py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition cursor-pointer"
                          >
                            Fechar lista sem selecionar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-center text-xs text-zinc-400 space-y-2">
                        <p>Nenhum cliente cadastrado encontrado com &quot;{customerSearch}&quot;.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickName(customerSearch);
                            setIsQuickRegisterOpen(true);
                            setCustomerSearch('');
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="block mx-auto text-xs text-[#D4AF37] font-bold hover:underline cursor-pointer"
                        >
                          + Cadastrar &quot;{customerSearch}&quot; Agora
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCustomerDropdownOpen(false)}
                          className="block mx-auto text-[11px] text-zinc-400 hover:text-white hover:underline cursor-pointer"
                        >
                          Fechar busca
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. PROFISSIONAL RESPONSÁVEL */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-[#D4AF37]" weight="bold" />
                Profissional Responsável *
              </span>
              <span className="text-[10px] text-zinc-500">
                (Comissão e produtividade)
              </span>
            </label>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition cursor-pointer"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.role || 'Barbeiro'}
                </option>
              ))}
            </select>
          </div>

          {/* 4. ITENS DA COMANDA: SERVIÇOS & PRODUTOS */}
          <div className="space-y-4">
            {/* SEÇÃO SERVIÇOS */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  ✂️ Serviços Realizados ({selectedServices.length})
                </span>
                <span className="text-xs font-bold font-mono text-amber-400">
                  Subtotal: {formatCurrency(subtotalServices)}
                </span>
              </div>

              {/* Lista dos Serviços na Comanda */}
              <div className="space-y-2">
                {selectedServices.map((srv, idx) => {
                  const val = getServiceValidation(srv);
                  const covered = val.isCovered;
                  return (
                    <div
                      key={`${srv.id}-${idx}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition gap-2 ${
                        covered
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-black/40 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            covered ? 'bg-emerald-400' : 'bg-[#D4AF37]'
                          }`}
                        />
                        <span className="font-semibold text-white truncate">{srv.name}</span>
                        {covered && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0 whitespace-nowrap">
                            <Crown className="w-2.5 h-2.5" weight="fill" />
                            100% OFF · Clube VIP
                          </span>
                        )}
                        {!covered && val.isExpired && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 whitespace-nowrap">
                            Assinatura Vencida
                          </span>
                        )}
                        {!covered && val.isQuotaExceeded && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 whitespace-nowrap">
                            Cota Mensal Esgotada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        {covered ? (
                          <div className="flex items-center gap-1.5">
                            <span className="line-through text-zinc-500 font-mono text-[11px]">
                              {formatCurrency(srv.price)}
                            </span>
                            <span className="font-bold font-mono text-emerald-400">
                              R$ 0,00
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold font-mono text-[#E5A93C]">
                            {formatCurrency(srv.price)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveService(idx)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Remover serviço"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dropdown "+ Adicionar Serviço Extra" */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedExtraServiceId}
                  onChange={(e) => setSelectedExtraServiceId(e.target.value)}
                  className="min-w-0 flex-1 h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] truncate cursor-pointer"
                >
                  <option value="">+ Selecionar Serviço Extra (Upsell)...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.price)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedExtraServiceId}
                  onClick={handleAddExtraService}
                  className="h-10 px-4 rounded-xl bg-amber-500/20 text-[#D4AF37] hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" weight="bold" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* SEÇÃO PRODUTOS (CROSS-SELL / BAR / COSMÉTICOS) */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  🧴 Produtos de Balcão & Bar ({selectedProducts.length})
                </span>
                <span className="text-xs font-bold font-mono text-amber-400">
                  Subtotal: {formatCurrency(subtotalProducts)}
                </span>
              </div>

              {/* Lista dos Produtos Adicionados */}
              {selectedProducts.length > 0 ? (
                <div className="space-y-2">
                  {selectedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs gap-2"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-semibold text-white block truncate">
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono block">
                          {formatCurrency(prod.unitPrice)} un
                        </span>
                      </div>

                      {/* Controles de Quantidade [-] 1 [+] */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-zinc-800 border border-white/10 rounded-lg p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateProductQuantity(prod.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-bold font-mono text-white text-xs">
                            {prod.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateProductQuantity(prod.id, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="w-20 text-right font-bold font-mono text-[#E5A93C]">
                          {formatCurrency(prod.subtotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(prod.id)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic py-1">
                  Nenhum produto adicionado à comanda. Adicione pomadas, cervejas ou cosméticos abaixo.
                </p>
              )}

              {/* Dropdown "+ Adicionar Produto" */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="min-w-0 flex-1 h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] truncate cursor-pointer"
                >
                  <option value="">+ Selecionar Produto do Estoque...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} ({p.stockQuantity} un em estoque)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedProductId}
                  onClick={handleAddProduct}
                  className="h-10 px-4 rounded-xl bg-amber-500/20 text-[#D4AF37] hover:bg-amber-500/30 font-semibold text-xs border border-amber-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" weight="bold" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. FORMA DE PAGAMENTO */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#D4AF37]" weight="bold" />
                Forma de Pagamento *
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Baixa imediata no caixa
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'pix', label: 'PIX', icon: QrCode },
                { id: 'cash', label: 'Dinheiro', icon: Money },
                { id: 'credit_card', label: 'Crédito', icon: CreditCard },
                { id: 'debit_card', label: 'Débito', icon: CreditCard },
              ].map((method) => {
                const IconComponent = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as CashPaymentMethod)}
                    className={`h-11 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer ${
                      isSelected
                        ? 'bg-[#E5A93C] text-black border-[#E5A93C] shadow-lg shadow-amber-500/20'
                        : 'bg-zinc-900 text-zinc-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" weight={isSelected ? 'bold' : 'regular'} />
                    {method.label}
                  </button>
                );
              })}
            </div>

            {/* CALCULADORA DE TROCO EM DINHEIRO */}
            {paymentMethod === 'cash' && (
              <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-zinc-900/90 to-zinc-900 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    💵 Calculadora de Troco (Dinheiro)
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Total a Pagar: <strong className="text-white text-xs">{formatCurrency(totalComanda)}</strong>
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    Valor Recebido do Cliente:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 font-mono">
                      R$
                    </span>
                    <input
                      type="text"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={totalComanda > 0 ? totalComanda.toFixed(2).replace('.', ',') : '0,00'}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-black/60 border border-amber-500/40 text-white font-mono font-extrabold text-base focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                    />
                  </div>
                </div>

                {/* Botões de Atalhos Rápidos */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Atalhos:</span>
                  <button
                    type="button"
                    onClick={() => setCashReceived(totalComanda.toFixed(2).replace('.', ','))}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold border border-white/10 transition active:scale-95 cursor-pointer"
                  >
                    Valor Exato
                  </button>
                  {[20, 50, 100, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCashReceived(val.toFixed(2).replace('.', ','))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition active:scale-95 cursor-pointer ${
                        parseFloat(cashReceived.replace(',', '.')) === val
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10'
                      }`}
                    >
                      R$ {val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(cashReceived.replace(',', '.')) || 0;
                      setCashReceived((current + 10).toFixed(2).replace('.', ','));
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-500/30 cursor-pointer"
                  >
                    + R$ 10
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(cashReceived.replace(',', '.')) || 0;
                      setCashReceived((current + 20).toFixed(2).replace('.', ','));
                    }}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold hover:bg-amber-500/30 cursor-pointer"
                  >
                    + R$ 20
                  </button>
                </div>

                {/* Painel de Troco com Alto Contraste */}
                {(() => {
                  const receivedVal = parseFloat(cashReceived.replace(',', '.')) || 0;
                  const trocoVal = receivedVal - totalComanda;

                  if (receivedVal <= 0) {
                    return (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center text-xs text-zinc-400">
                        Digite o valor entregue pelo cliente ou clique nos atalhos para apurar o troco.
                      </div>
                    );
                  }

                  if (trocoVal >= 0) {
                    return (
                      <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">💰</span>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block">
                              Troco a Devolver
                            </span>
                            <span className="text-xs text-emerald-300 font-medium">
                              {trocoVal === 0 ? 'Sem troco (valor exato)' : `Entregar ${formatCurrency(trocoVal)} ao cliente`}
                            </span>
                          </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tabular-nums">
                          {formatCurrency(trocoVal)}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between text-xs text-rose-300">
                      <div className="flex items-center gap-2 font-medium">
                        <span>⚠️</span>
                        <span>Valor em dinheiro insuficiente</span>
                      </div>
                      <span className="font-bold font-mono text-sm">
                        Faltam {formatCurrency(Math.abs(trocoVal))}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </form>

        {/* 6. RESUMO FINANCEIRO E AÇÕES (RODAPÉ FIXO) */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-white/10 bg-[#18181B] shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                Valor Total da Comanda
              </span>
              <span className="text-xs text-zinc-400 truncate block">
                {selectedServices.length} serviço(s) + {selectedProducts.reduce((s, p) => s + p.quantity, 0)} produto(s)
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#E5A93C] tracking-tight block">
                {formatCurrency(totalComanda)}
              </span>
              {selectedCustomer && (
                <span className="text-[11px] text-emerald-400 font-semibold block truncate">
                  +{formatCurrency(totalComanda)} somados ao LTV de {selectedCustomer.name.split(' ')[0]}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition hover:bg-white/5 cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                totalComanda <= 0 &&
                (!clientPlan || !isPlanValidToday || coveredServicesCount === 0)
              }
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5A93C] hover:from-[#c5a02e] hover:to-[#d89b30] text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 shrink-0" weight="bold" />
              <span>
                {totalComanda === 0 && clientPlan && isPlanValidToday && coveredServicesCount > 0
                  ? 'Confirmar Atendimento (Plano VIP)'
                  : 'Confirmar Lançamento'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
