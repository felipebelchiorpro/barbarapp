import React from 'react';
import { User, Phone, FileText, ShieldCheck, Crown } from 'lucide-react';
import { formatPhone } from '../../utils/formatters';
import { ClientSubscriptionPlan } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface StepCustomerProps {
  customerName: string;
  customerPhone: string;
  customerNotes: string;
  notifyWhatsApp: boolean;
  activeCustomerPlan?: ClientSubscriptionPlan | null;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
  onChangeNotes: (notes: string) => void;
  onToggleNotify: (notify: boolean) => void;
}

export const StepCustomer: React.FC<StepCustomerProps> = ({
  customerName,
  customerPhone,
  customerNotes,
  notifyWhatsApp,
  activeCustomerPlan,
  onChangeName,
  onChangePhone,
  onChangeNotes,
  onToggleNotify,
}) => {
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhone(raw);
    onChangePhone(formatted);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          4. Seus Dados
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Rápido e direto: informe seu nome e WhatsApp para envio do comprovante.
        </p>
      </div>

      <div className="space-y-3.5 bg-[#18181B] border border-white/5 p-4 sm:p-5 rounded-2xl">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            Nome Completo <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Ex: Carlos Eduardo Silva"
            className="w-full h-12 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
          />
        </div>

        {/* WhatsApp with automatic mask */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              WhatsApp para Confirmação <span className="text-amber-500">*</span>
            </label>
            <span className="text-[11px] text-zinc-500 font-mono">DDD + 9 dígitos</span>
          </div>
          <div className="relative">
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={handlePhoneInput}
              placeholder="(11) 98765-4321"
              maxLength={15}
              className="w-full h-12 px-3.5 pl-10 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <WhatsAppIcon variant="official" size={18} />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Você receberá o comprovante instantâneo e lembrete do horário nesta linha.
          </p>

          {/* VIP Member Recognition Badge */}
          {activeCustomerPlan && (
            <div className="mt-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#D4AF37]/10 to-amber-500/5 border border-amber-500/30 text-left flex items-start gap-3 animate-in fade-in">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37] text-black font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                <Crown className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#D4AF37]">
                    Membro VIP Identificado
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#D4AF37] text-black">
                    {activeCustomerPlan.nome}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Identificamos seu plano ativo! No próximo passo validaremos a cobertura dos serviços e o dia da semana escolhido.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notes (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Observações ou Preferências (Opcional)
          </label>
          <textarea
            rows={2}
            value={customerNotes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Ex: Primeira vez na barbearia, sensibilidade a loção alcoólica, etc."
            className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition resize-none"
          />
        </div>

        {/* Automated WhatsApp notifications consent */}
        <div
          onClick={() => onToggleNotify(!notifyWhatsApp)}
          className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10 transition mt-2 min-h-[44px]"
        >
          <input
            type="checkbox"
            id="notify-consent"
            checked={notifyWhatsApp}
            onChange={(e) => onToggleNotify(e.target.checked)}
            className="mt-1 w-4 h-4 text-[#D4AF37] bg-zinc-900 border-zinc-700 rounded focus:ring-amber-400 focus:ring-offset-zinc-900 accent-[#D4AF37]"
          />
          <div className="text-left">
            <label htmlFor="notify-consent" className="text-xs font-semibold text-emerald-300 cursor-pointer block">
              Notificações Inteligentes via WhatsApp (Evolution API)
            </label>
            <span className="text-[11px] text-zinc-400 leading-tight block mt-0.5">
              Receba comprovante com QR Code/resumo e lembrete 2 horas antes com opção de 1 toque para confirmar.
            </span>
          </div>
        </div>

        {/* Zero Spam Guarantee */}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500/80" />
          <span>Seus dados são protegidos e usados unicamente para esta agenda.</span>
        </div>
      </div>
    </div>
  );
};
