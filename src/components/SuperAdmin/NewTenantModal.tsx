import React, { useState } from 'react';
import { X, Storefront, User, Phone, Sparkle } from '@phosphor-icons/react';
import { TenantConfig } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTenant: TenantConfig) => void;
}

export const NewTenantModal: React.FC<NewTenantModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'enterprise'>('starter');
  const [maxBarbers, setMaxBarbers] = useState<number>(1);
  const [status, setStatus] = useState<'active' | 'trial'>('active');

  if (!isOpen) return null;

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim()) return;

    const newTenant: TenantConfig = {
      id: `tenant-${slug || Date.now()}`,
      name: name.trim(),
      slug: slug.trim() || `barbearia-${Date.now()}`,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim() || '11999999999',
      plan,
      planBasePrice: plan === 'starter' ? 49.9 : plan === 'pro' ? 89.9 : 149.9,
      max_barbeiros: maxBarbers,
      valor_adicional_barbeiro: 25.0,
      status,
      whatsappStatus: 'close',
      instanceName: slug.replace(/-/g, '_'),
      createdAt: new Date().toISOString(),
      supportPhone: '5511999999999',
    };

    onSave(newTenant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#141416] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#18181B]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D4AF37]">
              <Storefront className="w-5 h-5" weight="regular" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Cadastrar Nova Barbearia</h3>
              <p className="text-xs text-zinc-400">Configure o novo tenant no ecossistema Naville SaaS.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" weight="regular" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Nome da Barbearia */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Nome do Estabelecimento *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Barbearia Viking"
              className="w-full h-11 px-3.5 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Slug de Acesso */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Slug de Acesso (Subdomínio/URL) *
            </label>
            <div className="flex items-center rounded-xl bg-[#18181B] border border-white/10 overflow-hidden">
              <span className="px-3 text-xs text-zinc-500 font-mono border-r border-white/5">
                app.barber/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="viking-barber"
                className="w-full h-11 px-3 bg-transparent text-white text-xs focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Responsável / Dono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Nome do Responsável *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" weight="regular" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                WhatsApp do Responsável *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <WhatsAppIcon variant="official" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Plano Inicial & Vagas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Plano de Assinatura
              </label>
              <select
                value={plan}
                onChange={(e) => {
                  const p = e.target.value as 'starter' | 'pro' | 'enterprise';
                  setPlan(p);
                  if (p === 'starter') setMaxBarbers(1);
                  if (p === 'pro') setMaxBarbers(3);
                  if (p === 'enterprise') setMaxBarbers(5);
                }}
                className="w-full h-11 px-3 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="starter">Starter — R$ 49,90/mês (1 Barbeiro)</option>
                <option value="pro">Pro — R$ 89,90/mês (3 Barbeiros)</option>
                <option value="enterprise">Enterprise — R$ 149,90/mês (5+ Barbeiros)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Limite de Cadeiras (max_barbeiros)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxBarbers}
                  onChange={(e) => setMaxBarbers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-11 px-3 rounded-xl bg-[#18181B] border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] font-mono"
                />
                <span className="text-xs text-zinc-400 shrink-0">vagas</span>
              </div>
            </div>
          </div>

          {/* Status Inicial */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Status Inicial do Tenant
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-[#18181B] text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                ✓ Ativo Imediato
              </button>

              <button
                type="button"
                onClick={() => setStatus('trial')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  status === 'trial'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-[#18181B] text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                ⏳ Período de Teste (Trial)
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-md shadow-amber-500/20"
            >
              <Sparkle className="w-4 h-4" weight="bold" />
              <span>Criar Barbearia</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
