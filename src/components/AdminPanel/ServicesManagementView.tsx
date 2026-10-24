import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  PencilSimple as Edit2,
  Trash as Trash2,
  Clock,
  Sparkle as Sparkles,
  WarningCircle as AlertCircle,
  X,
  Image as ImageIcon,
  CheckCircle as CheckCircle2,
  Power,
  UploadSimple as Upload,
  Eye,
  EyeSlash as EyeOff
} from '@phosphor-icons/react';
import { Service } from '../../types';
import { formatCurrency, formatDuration } from '../../utils/formatters';

interface ServicesManagementViewProps {
  services: Service[];
  onAddService: (newService: Omit<Service, 'id'>) => void;
  onUpdateService: (service: Service) => void;
  onDeleteService: (serviceId: string) => void;
  onToggleActive: (serviceId: string) => void;
}

export const ServicesManagementView: React.FC<ServicesManagementViewProps> = ({
  services,
  onAddService,
  onUpdateService,
  onDeleteService,
  onToggleActive,
}) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(40);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [category, setCategory] = useState<'cabelo' | 'barba' | 'combos' | 'tratamento'>('cabelo');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isPopular, setIsPopular] = useState<boolean>(false);

  // Quick helper to open modal for creation
  const handleOpenCreateModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setPrice(40);
    setDurationMinutes(30);
    setCategory('cabelo');
    setImageUrl('');
    setIsActive(true);
    setIsPopular(false);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Quick helper to open modal for edit
  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDescription(service.description || '');
    setPrice(service.price);
    setDurationMinutes(service.durationMinutes);
    setCategory(service.category);
    setImageUrl(service.imageUrl || '');
    setIsActive(service.active !== false);
    setIsPopular(Boolean(service.popular));
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Handle local image file upload (converts to base64 data URL)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUrl(result);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('O nome do serviço é obrigatório.');
      return;
    }

    if (price < 0) {
      setErrorMessage('O valor não pode ser negativo.');
      return;
    }

    if (durationMinutes <= 0) {
      setErrorMessage('A duração deve ser maior que zero minutos.');
      return;
    }

    if (editingService) {
      onUpdateService({
        ...editingService,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        category,
        imageUrl: imageUrl.trim() || undefined,
        active: isActive,
        popular: isPopular,
      });
      setSuccessMessage(`Serviço "${name.trim()}" atualizado com sucesso!`);
    } else {
      onAddService({
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        category,
        imageUrl: imageUrl.trim() || undefined,
        active: isActive,
        popular: isPopular,
      });
      setSuccessMessage(`Serviço "${name.trim()}" cadastrado com sucesso!`);
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
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold font-display text-white">
                Catálogo de Serviços &amp; Preços
              </h3>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-300">
                {services.filter((s) => s.active !== false).length} ativos de {services.length}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Defina preços, durações e visibilidade para o agendamento online dos clientes.
            </p>
          </div>
        </div>

        {/* Action: Adicionar Serviço */}
        <button
          onClick={handleOpenCreateModal}
          className="h-9 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/30 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Novo Serviço</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid de Serviços Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((service) => {
          const isActiveService = service.active !== false;
          const isCombo = service.durationMinutes === 60;

          return (
            <div
              key={service.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isActiveService
                  ? 'bg-[#18181B] border-white/10 hover:border-white/20 shadow-sm'
                  : 'bg-zinc-900/40 border-white/5 opacity-60'
              }`}
            >
              <div>
                {/* Top: Imagem Thumbnail + Informações */}
                <div className="flex items-start gap-3">
                  {/* Foto do Serviço com Fallback Visual Discreto */}
                  <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                    {service.imageUrl ? (
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Se falhar o carregamento, aplica fallback
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-500 p-1 text-center">
                        <Scissors className="w-5 h-5 text-amber-500/60" />
                      </div>
                    )}
                    {isCombo && (
                      <span className="absolute bottom-0 right-0 bg-[#D4AF37] text-black text-[9px] font-black px-1 rounded-tl">
                        1h
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-sm font-bold text-white truncate font-display">
                        {service.name}
                      </h4>

                      {/* Status Badge */}
                      {isActiveService ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Ativo</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-white/10 shrink-0 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                          <span>Oculto</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-extrabold text-[#D4AF37] font-mono">
                        {formatCurrency(service.price)}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="flex items-center gap-1 text-xs text-zinc-300 font-medium">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        {formatDuration(service.durationMinutes)}
                      </span>
                    </div>

                    {service.popular && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded mt-1 border border-amber-500/30">
                        <Sparkles className="w-2.5 h-2.5" /> Destaque
                      </span>
                    )}
                  </div>
                </div>

                {/* Descrição */}
                {service.description && (
                  <p className="text-xs text-zinc-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                )}
              </div>

              {/* Barra de Ações: Switch Ativar/Ocultar, Editar e Excluir */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                {/* Switch Ativo / Inativo */}
                <button
                  onClick={() => onToggleActive(service.id)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                    isActiveService
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                  }`}
                  title={isActiveService ? 'Ocultar da agenda de agendamento' : 'Tornar visível para clientes'}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isActiveService ? 'Ocultar' : 'Ativar'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Editar */}
                  <button
                    onClick={() => handleOpenEditModal(service)}
                    className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition active:scale-95 border border-white/5"
                    title="Editar preço, duração e informações"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  {/* Excluir (com confirmação de segurança) */}
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Deseja realmente excluir o serviço "${service.name}"? Esta ação removerá o serviço permanentemente.`
                        )
                      ) {
                        onDeleteService(service.id);
                      }
                    }}
                    className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition active:scale-95"
                    title="Excluir serviço"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Criação / Edição de Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-left">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Defina nome, preço, duração para a agenda e foto ilustrativa
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Corte Degradê Navalhado"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Preço e Duração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Preço (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      placeholder="40.00"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Duração na Agenda *
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value={15}>15 minutos (Acabamento rápido)</option>
                    <option value={30}>30 minutos (Padrão: 1 slot)</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos (1 hora: 2 slots)</option>
                    <option value={90}>90 minutos (1h 30min: 3 slots)</option>
                    <option value={120}>120 minutos (2 horas)</option>
                  </select>
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Categoria
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'cabelo', label: 'Cabelo' },
                      { id: 'barba', label: 'Barba' },
                      { id: 'combos', label: 'Combos' },
                      { id: 'tratamento', label: 'Tratamento' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`h-9 rounded-xl text-xs font-medium border transition ${
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

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Inclui lavagem, secagem e alinhamento especial..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              {/* Imagem do Serviço */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">
                  Foto do Serviço (URL ou Enviar Imagem)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg ou faça upload"
                    className="flex-1 h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <label className="h-10 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview se houver imagem */}
                {imageUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-white/5">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-amber-500/30"
                    />
                    <div className="flex-1 min-w-0 text-xs text-zinc-400 truncate">
                      Prévia da foto carregada
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs text-red-400 hover:text-red-300 p-1"
                    >
                      Remover foto
                    </button>
                  </div>
                )}
              </div>

              {/* Toggles: Ativo para agendamento online & Destaque */}
              <div className="pt-2 space-y-2 border-t border-white/5">
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/5 cursor-pointer select-none">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Exibir este serviço para agendamento online
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Quando desativado, o serviço permanece salvo no catálogo mas oculto para o cliente.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/5 cursor-pointer select-none">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Destacar como &quot;Mais Pedido&quot;
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Exibe um selo de destaque no card durante a escolha do cliente.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                  />
                </label>
              </div>

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
                  {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
