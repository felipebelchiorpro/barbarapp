import React from 'react';
import { Sparkle, CheckCircle, ShieldCheck, LockKey } from '@phosphor-icons/react';
import { TenantConfig } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface ModuleUpgradeLockCardProps {
  moduleTitle: string;
  moduleDescription: string;
  requiredPlanName?: string;
  features: string[];
  tenant: TenantConfig;
}

export const ModuleUpgradeLockCard: React.FC<ModuleUpgradeLockCardProps> = ({
  moduleTitle,
  moduleDescription,
  requiredPlanName = 'Plano Pro Barbearia',
  features,
  tenant,
}) => {
  const adminWhatsAppNumber = '5511999999999';
  const upgradeMessage = encodeURIComponent(
    `Olá! Tenho a barbearia *${tenant.name}* (ID: ${tenant.slug}) e gostaria de fazer o upgrade para liberar o módulo *${moduleTitle}*!`
  );
  const waUrl = `https://wa.me/${adminWhatsAppNumber}?text=${upgradeMessage}`;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="relative rounded-3xl bg-gradient-to-b from-[#18181B] via-[#141416] to-[#0F0F11] border border-amber-500/30 p-6 sm:p-10 shadow-2xl overflow-hidden text-left">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Tag */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-[#D4AF37] border border-amber-500/40 inline-flex items-center gap-1.5 shadow-sm">
            <LockKey className="w-3.5 h-3.5" weight="bold" />
            Recurso Exclusivo · {requiredPlanName}
          </span>
          <span className="text-xs text-zinc-400 font-mono">Disponível via Upgrade</span>
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
          Desbloqueie o módulo de {moduleTitle}
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 mt-2 max-w-2xl leading-relaxed">
          {moduleDescription}
        </p>

        {/* Features Checklist */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <h3 className="text-xs uppercase font-bold tracking-wider text-amber-400/90 font-mono mb-4">
            O que você ganha com este módulo ativo:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-white/5"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" weight="bold" />
                </div>
                <span className="text-xs sm:text-sm text-zinc-200 font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-xs text-zinc-400 block">Sua barbearia está no plano:</span>
            <span className="text-sm font-bold text-white capitalize">
              Plano {tenant.plan} ({tenant.name})
            </span>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            <WhatsAppIcon variant="official" size={20} />
            <span>Solicitar Upgrade via WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
