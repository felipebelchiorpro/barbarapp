import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  PencilSimple as Edit2,
  Trash as Trash2,
  WarningCircle as AlertCircle,
  X,
  CheckCircle as CheckCircle2,
  EyeSlash,
  Tag,
  ArrowsDownUp,
  WarningOctagon as AlertTriangle,
  CurrencyDollar,
  ChartLineUp,
  ShoppingCart,
  Minus,
  Barcode,
  Archive,
} from '@phosphor-icons/react';
import { Product } from '../../types';
import { DEFAULT_PRODUCT_CATEGORIES } from '../../data/mockData';
import { formatCurrency } from '../../utils/formatters';

interface ProductsManagementViewProps {
  products: Product[];
  tenantId: string;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAdjustStock: (productId: string, delta: number) => void;
}

export const ProductsManagementView: React.FC<ProductsManagementViewProps> = ({
  products,
  tenantId,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustStock,
}) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('pomadas');
  const [price, setPrice] = useState<number>(35);
  const [costPrice, setCostPrice] = useState<number>(15);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(3);
  const [unit, setUnit] = useState<string>('un');
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
    const totalCostValue = products.reduce(
      (acc, p) => acc + (p.costPrice || 0) * (p.stockQuantity || 0),
      0
    );
    const totalSaleValue = products.reduce(
      (acc, p) => acc + (p.price || 0) * (p.stockQuantity || 0),
      0
    );
    const lowStockCount = products.filter(
      (p) => p.stockQuantity <= (p.minStock ?? 3)
    ).length;

    const potentialProfit = totalSaleValue - totalCostValue;

    return {
      totalItems,
      totalUnits,
      totalCostValue,
      totalSaleValue,
      potentialProfit,
      lowStockCount,
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) {
        return false;
      }
      // Low stock filter
      if (filterLowStockOnly) {
        const threshold = p.minStock ?? 3;
        if (p.stockQuantity > threshold) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSupplier = p.supplier ? p.supplier.toLowerCase().includes(q) : false;
        const matchCategory = p.category.toLowerCase().includes(q);
        if (!matchName && !matchSupplier && !matchCategory) return false;
      }
      return true;
    });
  }, [products, selectedCategory, filterLowStockOnly, searchQuery]);

  // Open modal for creation
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('pomadas');
    setPrice(35);
    setCostPrice(15);
    setStockQuantity(10);
    setMinStock(3);
    setUnit('un');
    setSupplier('');
    setNotes('');
    setIsActive(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setPrice(prod.price);
    setCostPrice(prod.costPrice ?? 0);
    setStockQuantity(prod.stockQuantity);
    setMinStock(prod.minStock ?? 3);
    setUnit(prod.unit ?? 'un');
    setSupplier(prod.supplier ?? '');
    setNotes(prod.notes ?? '');
    setIsActive(prod.active !== false);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('O nome do produto é obrigatório.');
      return;
    }

    if (price < 0) {
      setErrorMessage('O preço de venda não pode ser negativo.');
      return;
    }

    if (costPrice < 0) {
      setErrorMessage('O preço de custo não pode ser negativo.');
      return;
    }

    if (stockQuantity < 0) {
      setErrorMessage('A quantidade em estoque não pode ser negativa.');
      return;
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: name.trim(),
        category,
        price: Number(price),
        costPrice: Number(costPrice),
        stockQuantity: Number(stockQuantity),
        minStock: Number(minStock),
        unit: unit.trim() || 'un',
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
        active: isActive,
      });
      setSuccessMessage(`Produto "${name.trim()}" atualizado com sucesso!`);
    } else {
      onAddProduct({
        tenantId,
        name: name.trim(),
        category,
        price: Number(price),
        costPrice: Number(costPrice),
        stockQuantity: Number(stockQuantity),
        minStock: Number(minStock),
        unit: unit.trim() || 'un',
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
        active: isActive,
      });
      setSuccessMessage(`Produto "${name.trim()}" cadastrado com sucesso!`);
    }

    setIsModalOpen(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-4 text-left w-full animate-in fade-in duration-150">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#18181B] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold font-display text-white">
                Produtos &amp; Estoque Interno
              </h3>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-300">
                {products.length} itens cadastrados
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Organização interna de estoque, custos, fornecedores e vendas no balcão / PDV.
            </p>
          </div>
        </div>

        {/* Action: Adicionar Produto */}
        <button
          onClick={handleOpenCreateModal}
          className="h-9 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/30 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Internal Organization Notice Banner (Fulfillment of User Requirement) */}
      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
          <EyeSlash className="w-4 h-4" />
        </div>
        <div className="text-xs text-zinc-300 leading-relaxed">
          <strong className="text-white font-semibold flex items-center gap-1.5">
            <span>Uso Interno da Barbearia</span>
            <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-[#D4AF37] font-bold border border-amber-500/30">
              Oculto no Agendamento Online
            </span>
          </strong>
          <p className="text-zinc-400 mt-0.5">
            Estes produtos servem exclusivamente para ajudar a sua barbearia a se organizar (controle de estoque, preço de custo, reposição e vendas na frente de caixa/PDV). Eles <strong>NÃO</strong> são exibidos na tela de agendamento dos clientes, mantendo o fluxo de agendamento focado nos serviços.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Itens em Estoque */}
        <div className="p-3.5 rounded-xl bg-[#18181B] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total de Unidades</span>
            <Archive className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {stats.totalUnits} <span className="text-xs font-normal text-zinc-400">un</span>
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            Distribuídos em {stats.totalItems} produtos
          </div>
        </div>

        {/* Card 2: Custo Imobilizado */}
        <div className="p-3.5 rounded-xl bg-[#18181B] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Valor em Custo</span>
            <CurrencyDollar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-400">
            {formatCurrency(stats.totalCostValue)}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            Capital investido em mercadorias
          </div>
        </div>

        {/* Card 3: Valor de Venda Projetado */}
        <div className="p-3.5 rounded-xl bg-[#18181B] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Previsão de Vendas</span>
            <ChartLineUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {formatCurrency(stats.totalSaleValue)}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            Lucro est.: <strong className="text-emerald-300">{formatCurrency(stats.potentialProfit)}</strong>
          </div>
        </div>

        {/* Card 4: Alerta de Reposição */}
        <div className="p-3.5 rounded-xl bg-[#18181B] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Estoque Baixo</span>
            <AlertTriangle className={`w-4 h-4 ${stats.lowStockCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${stats.lowStockCount > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
            {stats.lowStockCount} <span className="text-xs font-normal text-zinc-400">itens</span>
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {stats.lowStockCount > 0 ? 'Itens próximos do esgotamento' : 'Estoque regularizado'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          {/* Search Input */}
          <div className="w-full sm:w-72 relative">
            <input
              type="text"
              placeholder="Buscar por nome, fornecedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-3 pr-8 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter: Somente Estoque Baixo */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              filterLowStockOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-[#18181B] text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Reposição Necessária ({stats.lowStockCount})</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              selectedCategory === 'todos'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold shadow-sm'
                : 'bg-[#18181B] text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            Todos ({products.length})
          </button>
          {DEFAULT_PRODUCT_CATEGORIES.map((cat) => {
            const count = products.filter((p) => p.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold shadow-sm'
                    : 'bg-[#18181B] text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#18181B] border border-white/5 space-y-3">
          <Package className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-sm text-zinc-400">
            Nenhum produto encontrado com os filtros atuais.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-black text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Produto Agora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((prod) => {
            const threshold = prod.minStock ?? 3;
            const isOutOfStock = prod.stockQuantity <= 0;
            const isLowStock = !isOutOfStock && prod.stockQuantity <= threshold;
            const profitPerUnit = prod.price - (prod.costPrice ?? 0);
            const marginPercent =
              prod.costPrice && prod.costPrice > 0
                ? Math.round((profitPerUnit / prod.costPrice) * 100)
                : 100;

            const categoryLabel =
              DEFAULT_PRODUCT_CATEGORIES.find((c) => c.id === prod.category)?.label ||
              prod.category;

            return (
              <div
                key={prod.id}
                className="p-4 rounded-2xl bg-[#18181B] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between shadow-sm space-y-3"
              >
                <div>
                  {/* Top: Header do Produto */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-[#D4AF37] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 inline-block mb-1">
                        {categoryLabel}
                      </span>
                      <h4 className="text-sm font-bold text-white font-display truncate">
                        {prod.name}
                      </h4>
                      {prod.supplier && (
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          Fornecedor: <span className="text-zinc-300">{prod.supplier}</span>
                        </p>
                      )}
                    </div>

                    {/* Badge de Status de Estoque */}
                    {isOutOfStock ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                        Esgotado
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        Estoque Baixo
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                        Regular
                      </span>
                    )}
                  </div>

                  {/* Preços e Margem */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Preço de Venda</span>
                      <span className="text-sm font-extrabold text-[#D4AF37] font-mono">
                        {formatCurrency(prod.price)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Preço de Custo</span>
                      <span className="text-xs font-semibold text-zinc-300 font-mono">
                        {formatCurrency(prod.costPrice ?? 0)}
                      </span>
                      <span className="text-[10px] text-emerald-400 block">
                        +{marginPercent}% margem
                      </span>
                    </div>
                  </div>

                  {/* Observações Opcionais */}
                  {prod.notes && (
                    <p className="text-[11px] text-zinc-400 mt-2 line-clamp-1 italic">
                      "{prod.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom: Controle Rápido de Estoque & Ações */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  {/* Quick Adjuster (- / +) */}
                  <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => onAdjustStock(prod.id, -1)}
                      disabled={prod.stockQuantity <= 0}
                      className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 flex items-center justify-center transition active:scale-95"
                      title="Diminuir 1 unidade do estoque"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="px-2 font-mono text-xs font-bold text-white min-w-[2.5rem] text-center">
                      {prod.stockQuantity} <span className="text-[10px] text-zinc-400 font-normal">{prod.unit || 'un'}</span>
                    </span>

                    <button
                      onClick={() => onAdjustStock(prod.id, 1)}
                      className="w-6 h-6 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center transition active:scale-95"
                      title="Adicionar 1 unidade ao estoque"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(prod)}
                      className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                      title="Editar detalhes do produto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Deseja realmente excluir o produto "${prod.name}"?`)) {
                          onDeleteProduct(prod.id);
                        }
                      }}
                      className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition active:scale-95"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo / Editar Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-left">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    {editingProduct ? 'Editar Produto' : 'Novo Produto para Organização'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Controle de estoque interno, preço de venda e custo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 mx-4 sm:mx-5 mt-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pomada Efeito Matte 150g, Cerveja IPA, Lâminas..."
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Categoria
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEFAULT_PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`h-9 px-2 rounded-xl text-xs font-medium border transition truncate ${
                        category === cat.id
                          ? 'bg-amber-500/20 text-[#D4AF37] border-amber-500/40 font-bold'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preços: Venda e Custo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Estoque e Unidade */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Estoque Atual *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Unidade
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="un">un (Unidade)</option>
                    <option value="frasco">frasco</option>
                    <option value="pote">pote</option>
                    <option value="lata">lata</option>
                    <option value="pct">pct (Pacote)</option>
                    <option value="cx">cx (Caixa)</option>
                  </select>
                </div>
              </div>

              {/* Fornecedor */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Fornecedor / Onde Comprar (Opcional)
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ex: Distribuidora Barber Premium / Atacadão..."
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Observações Internas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Armazenar na prateleira inferior, conferir validade..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              {/* Toggle: Ativo no PDV */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/5 cursor-pointer select-none">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Disponível no PDV / Caixa Balcão
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Permite lançar este produto na comanda de venda rápida do balcão.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
              </label>

              {/* Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black text-xs font-bold transition active:scale-95 shadow-md"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
