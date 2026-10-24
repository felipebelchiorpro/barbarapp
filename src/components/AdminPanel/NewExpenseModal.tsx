import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  CurrencyDollar,
  CalendarBlank,
  CreditCard,
  Barcode,
  Money,
  ArrowsClockwise,
  CheckCircle,
  Tag,
  BuildingOffice,
  NotePencil
} from '@phosphor-icons/react';
import { Expense, ExpenseCategory, ExpensePaymentMethod, ExpenseStatus } from '../../types';
import { EXPENSE_CATEGORIES_META } from '../../data/mockData';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => void;
  initialData?: Expense | null;
  tenantId: string;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  tenantId,
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('custos_fixos');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<ExpenseStatus>('pending');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('pix');
  const [isRecurring, setIsRecurring] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setCategory(initialData.category);
      setAmount(initialData.amount.toString());
      setDueDate(initialData.dueDate);
      setStatus(initialData.status);
      setPaymentMethod(initialData.paymentMethod);
      setIsRecurring(initialData.isRecurring);
      setSupplier(initialData.supplier || '');
      setNotes(initialData.notes || '');
    } else {
      setDescription('');
      setCategory('custos_fixos');
      setAmount('');
      const today = new Date();
      setDueDate(today.toISOString().split('T')[0]);
      setStatus('pending');
      setPaymentMethod('pix');
      setIsRecurring(false);
      setSupplier('');
      setNotes('');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Informe a descrição da despesa.');
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    if (!dueDate) {
      setError('Informe a data de vencimento.');
      return;
    }

    onSave({
      tenantId,
      description: description.trim(),
      category,
      amount: numAmount,
      dueDate,
      paidAt: status === 'paid' ? new Date().toISOString() : null,
      status,
      paymentMethod,
      isRecurring,
      supplier: supplier.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const categoriesList = Object.values(EXPENSE_CATEGORIES_META);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-left">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center">
              <Receipt className="w-5 h-5" weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialData ? 'Editar Despesa' : 'Nova Despesa / Gasto'}
              </h3>
              <p className="text-xs text-zinc-400">
                Lance os custos da barbearia para apurar o lucro real no fluxo de caixa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Descrição da Despesa <span className="text-[#D4AF37]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel da Loja, Fardo de Toalhas, Conta de Luz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Categoria Contábil <span className="text-[#D4AF37]">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
            >
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Valor & Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Valor Total (R$) <span className="text-[#D4AF37]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">
                  R$
                </span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono font-bold text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Data de Vencimento <span className="text-[#D4AF37]">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Status Inicial & Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Situação do Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`h-10 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    status === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  <span>Pendente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('paid')}
                  className={`h-10 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    status === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" weight="bold" />
                  <span>Já Pago</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'pix', label: 'PIX' },
                  { id: 'boleto', label: 'Boleto' },
                  { id: 'credit_card', label: 'Cartão' },
                  { id: 'cash', label: 'Dinheiro' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as ExpensePaymentMethod)}
                    className={`h-10 rounded-xl text-[11px] font-semibold border transition flex items-center justify-center cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fornecedor / Favorecido */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Fornecedor / Favorecido (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Enel, Imobiliária Central, BarberSupply, etc."
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Toggle Recorrente (Despesa Fixa Mensal) */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ArrowsClockwise className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Despesa Fixa / Recorrente
                </span>
                <span className="text-[11px] text-zinc-400 block">
                  Esta conta se repete todos os meses (ex: aluguel, internet, luz).
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded text-[#D4AF37] focus:ring-0 bg-zinc-800 border-white/20 cursor-pointer"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Observações / Detalhes (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Desconto de pontualidade até dia 10, número da nota fiscal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" weight="bold" />
              <span>{initialData ? 'Salvar Alterações' : 'Lançar Despesa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
