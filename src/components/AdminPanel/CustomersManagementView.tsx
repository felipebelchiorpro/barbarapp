import React, { useState, useMemo } from 'react';
import {
  UsersThree,
  MagnifyingGlass,
  Plus,
  Scissors,
  CurrencyDollar,
  Calendar,
  PencilSimple,
  Trash,
  X,
  CheckCircle,
  ChatCircleText,
  Star,
  UserCheck
} from '@phosphor-icons/react';
import { CustomerProfile } from '../../types';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface CustomersManagementViewProps {
  customers: CustomerProfile[];
  tenantId: string;
  tenantName?: string;
  onAddCustomer: (newCustomer: Omit<CustomerProfile, 'id' | 'createdAt'>) => void;
  onUpdateCustomer: (customer: CustomerProfile) => void;
  onDeleteCustomer: (customerId: string) => void;
}

export const CustomersManagementView: React.FC<CustomersManagementViewProps> = ({
  customers,
  tenantId,
  tenantName = 'Naville Barber',
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    notes: string;
    favoriteBarberName: string;
  }>({
    name: '',
    phone: '',
    notes: '',
    favoriteBarberName: '',
  });

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPhone = c.phone.includes(searchQuery);
      const matchNotes = c.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchName || matchPhone || matchNotes;
    });
  }, [customers, searchQuery]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = customers.length;
    const totalLTV = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalBookings = customers.reduce((sum, c) => sum + (c.totalBookings || 0), 0);
    const avgTicket = totalBookings > 0 ? totalLTV / totalBookings : 0;
    const loyalCount = customers.filter((c) => (c.totalBookings || 0) >= 3).length;

    return { total, totalLTV, totalBookings, avgTicket, loyalCount };
  }, [customers]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      notes: '',
      favoriteBarberName: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cust: CustomerProfile) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      notes: cust.notes || '',
      favoriteBarberName: cust.favoriteBarberName || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim() || undefined,
        favoriteBarberName: formData.favoriteBarberName.trim() || undefined,
      });
    } else {
      onAddCustomer({
        tenantId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim() || undefined,
        totalBookings: 0,
        totalSpent: 0,
        favoriteBarberName: formData.favoriteBarberName.trim() || undefined,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-[#D4AF37] border border-amber-500/30">
              CRM & Gestão de Relacionamento
            </span>
            <span className="text-xs text-zinc-400 font-mono">Painel do Barbeiro</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
            Base de Clientes & Histórico
          </h2>
          <p className="text-xs text-zinc-400">
            Acompanhe o perfil, ticket médio, preferências de corte e histórico de fidelidade de cada cliente.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" weight="bold" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total de Clientes</span>
            <UsersThree className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-white mt-1">
            {stats.total}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Cadastrados no sistema</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Fidelizados (3+ cortes)</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 mt-1">
            {stats.loyalCount}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Clientes recorrentes</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Faturamento Acumulado</span>
            <CurrencyDollar className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#D4AF37] mt-1">
            {formatCurrency(stats.totalLTV)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">LTV total dos clientes</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#141416] border border-white/5">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Ticket Médio por Corte</span>
            <Scissors className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-indigo-300 mt-1">
            {formatCurrency(stats.avgTicket)}
          </div>
          <span className="text-[10px] text-zinc-400 block mt-0.5">{stats.totalBookings} atendimentos totais</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#141416] border border-white/5 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, telefone ou preferência de corte..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
        <span className="text-xs text-zinc-400 font-mono shrink-0">
          {filteredCustomers.length} cliente(s)
        </span>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const rawPhone = cust.phone.replace(/\D/g, '');
          const waUrl = `https://wa.me/55${rawPhone}?text=${encodeURIComponent(`Olá ${cust.name}, tudo bem? Aqui é da ${tenantName}!`)}`;

          return (
            <div
              key={cust.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#141416] border border-white/5 hover:border-amber-500/20 transition-all space-y-3.5 relative group"
            >
              {/* Header: Avatar, Name & Quick Actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {cust.avatarUrl ? (
                    <img
                      src={cust.avatarUrl}
                      alt={cust.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-zinc-800 border border-amber-500/20 flex items-center justify-center text-amber-300 font-bold text-base shrink-0">
                      {cust.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate font-display">
                      {cust.name}
                    </h3>
                    <span className="text-xs text-zinc-400 font-mono block">
                      {cust.phone}
                    </span>
                  </div>
                </div>

                {/* Edit & Delete actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(cust)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    title="Editar informações do cliente"
                  >
                    <PencilSimple className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteCustomer(cust.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Remover cliente"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preferences & Barber Notes */}
              {cust.notes && (
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-300 flex items-start gap-2">
                  <ChatCircleText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="line-clamp-2 leading-relaxed text-[11px] text-zinc-400">
                    {cust.notes}
                  </p>
                </div>
              )}

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Atendimentos</span>
                  <span className="font-bold text-white font-mono text-sm">
                    {cust.totalBookings} corte(s)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Valor Gasto (LTV)</span>
                  <span className="font-bold text-[#D4AF37] font-mono text-sm">
                    {formatCurrency(cust.totalSpent)}
                  </span>
                </div>
              </div>

              {/* WhatsApp 1-Click Direct Button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-9 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon variant="official" size={16} />
                <span>Conversar no WhatsApp</span>
              </a>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-[#141416] border border-white/5 space-y-3">
          <UsersThree className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum cliente encontrado</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Não encontramos nenhum cliente cadastrado com esse termo. Clique em &quot;Novo Cliente&quot; para adicionar manualmente.
          </p>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#141416] border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white font-display">
                {editingCustomer ? 'Editar Perfil do Cliente' : 'Novo Cliente'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Lucas Gabriel"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  WhatsApp / Celular *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Barbeiro Preferido (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.favoriteBarberName}
                  onChange={(e) => setFormData({ ...formData, favoriteBarberName: e.target.value })}
                  placeholder="Ex: Leonardo Soares"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Notas de Preferência / Detalhes do Corte (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Gosta de degradê na zero, costeleta quadrada, pele sensível na navalha..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#B38F24] text-black font-extrabold text-xs transition cursor-pointer"
                >
                  {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
