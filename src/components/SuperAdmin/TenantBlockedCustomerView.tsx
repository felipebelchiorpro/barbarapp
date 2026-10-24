import { WarningCircle, Storefront, Scissors } from '@phosphor-icons/react';
import { TenantConfig } from '../../types';
import { generateWhatsAppDirectLink } from '../../services/webhookService';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface TenantBlockedCustomerViewProps {
  tenant: TenantConfig;
}

export const TenantBlockedCustomerView: React.FC<TenantBlockedCustomerViewProps> = ({ tenant }) => {
  const waContactLink = generateWhatsAppDirectLink(
    tenant.ownerPhone || '11999999999',
    `Olá, gostaria de informações sobre agendamento na ${tenant.name}.`
  );

  return (
    <div className="w-full max-w-lg mx-auto py-12 px-4 text-center space-y-6">
      {/* Brand Icon */}
      <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37] shadow-xl">
        <Scissors className="w-8 h-8" weight="regular" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
          <WarningCircle className="w-4 h-4" weight="regular" />
          <span>Serviço Temporariamente Pausado</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-white">
          {tenant.name}
        </h1>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Agendamento temporariamente indisponível. Entre em contato diretamente com o estabelecimento.
        </p>
      </div>

      {/* Direct Contact Card */}
      <div className="p-5 rounded-2xl bg-[#141416] border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
          <Storefront className="w-4 h-4 text-[#D4AF37]" weight="regular" />
          <span>Fale com o responsável pelo WhatsApp</span>
        </div>

        <a
          href={waContactLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-sm flex items-center justify-center gap-2.5 transition active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <WhatsAppIcon variant="monochrome" size={20} className="text-black" />
          <span>Conversar no WhatsApp</span>
        </a>
      </div>

      <p className="text-[11px] text-zinc-600">
        Naville · Plataforma de Gestão e Agendamento
      </p>
    </div>
  );
};
