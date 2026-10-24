import React, { useState } from 'react';
import {
  Clock,
  Sparkle,
  CheckCircle,
  ShieldCheck,
  ArrowsClockwise,
  SlidersHorizontal,
  Info,
  CalendarCheck,
  Scissors,
} from '@phosphor-icons/react';
import { TenantConfig } from '../../types';
import { formatDuration } from '../../utils/formatters';

interface SchedulingSettingsViewProps {
  tenant: TenantConfig;
  onUpdateTenantConfig: (updated: TenantConfig) => void;
}

export const SchedulingSettingsView: React.FC<SchedulingSettingsViewProps> = ({
  tenant,
  onUpdateTenantConfig,
}) => {
  const [slotInterval, setSlotInterval] = useState<number>(tenant.tempo_padrao_slot || 30);
  const [respiro, setRespiro] = useState<number>(tenant.tempo_respiro_entre_cortes || 0);
  const [allowManualOverlap, setAllowManualOverlap] = useState<boolean>(
    Boolean(tenant.permitir_encaixe_manual)
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    const updated: TenantConfig = {
      ...tenant,
      tempo_padrao_slot: slotInterval,
      tempo_respiro_entre_cortes: respiro,
      permitir_encaixe_manual: allowManualOverlap,
    };
    onUpdateTenantConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Simulação de cálculo em tempo real para exemplo prático
  const sampleComboDuration = 60; // Corte (30m) + Barba (30m)
  const sampleTotalRequired = sampleComboDuration + respiro;
  const sampleSlotsNeeded = Math.ceil(sampleTotalRequired / slotInterval);

  return (
    <div className="space-y-6 text-left max-w-4xl animate-in fade-in">
      {/* Top Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#141416] to-[#18181B] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" weight="bold" /> Motor de Agendamento
            </span>
            <span className="text-xs text-zinc-400 font-mono">Regras de Slots & Validação</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
            Regras da Grade & Intervalos
          </h2>
          <p className="text-xs text-zinc-400">
            Ajuste a cadência dos horários da sua barbearia, tempo de respiro para esterilização e políticas de encaixe.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A880] text-black font-extrabold text-xs tracking-wide uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          {savedSuccess ? (
            <>
              <CheckCircle className="w-4 h-4 text-black" weight="bold" /> Salvo!
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-black" weight="bold" /> Salvar Preferências
            </>
          )}
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" weight="bold" />
          <span>As configurações da agenda foram atualizadas com sucesso e já estão ativas para seus clientes e equipe!</span>
        </div>
      )}

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Intervalo Padrão da Grade */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-white/5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" weight="bold" />
                Intervalo Padrão da Grade
              </label>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Define o espaçamento entre cada horário exibido para os clientes escolherem (ex: 09:00, 09:30, 10:00).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[15, 20, 30, 45, 60].map((mins) => {
              const isSelected = slotInterval === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setSlotInterval(mins)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-extrabold shadow-md shadow-amber-500/20 scale-[1.02]'
                      : 'bg-[#121214] border-white/10 text-zinc-300 hover:border-white/20 hover:bg-[#1a1a1e]'
                  }`}
                >
                  <div className="text-base font-bold tabular-nums font-mono">{mins} min</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-black/80 font-bold' : 'text-zinc-500'}`}>
                    {mins === 30 ? 'Padrão Naville' : mins === 15 ? 'Ultra Rápido' : `${mins} em ${mins}m`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Tempo de Respiro Entre Cortes */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-white/5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-amber-400" weight="bold" />
                Tempo de Respiro / Limpeza
              </label>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Tempo adicional reservado automaticamente após cada atendimento para higienização de bancada, esterilização e descanso.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { val: 0, label: '0 min', sub: 'Sem pausa' },
              { val: 5, label: '5 min', sub: 'Rápido' },
              { val: 10, label: '10 min', sub: 'Esterilização' },
              { val: 15, label: '15 min', sub: 'Confortável' },
            ].map((item) => {
              const isSelected = respiro === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setRespiro(item.val)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-extrabold shadow-md shadow-amber-500/20 scale-[1.02]'
                      : 'bg-[#121214] border-white/10 text-zinc-300 hover:border-white/20 hover:bg-[#1a1a1e]'
                  }`}
                >
                  <div className="text-base font-bold tabular-nums font-mono">{item.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-black/80 font-bold' : 'text-zinc-500'}`}>
                    {item.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Permissão de Encaixe Manual no PDV */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" weight="bold" />
              <h3 className="text-sm font-bold text-white">
                Permitir Encaixe Manual no PDV / Balcão
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              Permite que os barbeiros e recepcionistas internos forcem agendamentos colados pelo PDV, ignorando o tempo de respiro obrigatório caso queiram atender um cliente de última hora.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={allowManualOverlap}
              onChange={(e) => setAllowManualOverlap(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
          </label>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Status atual:</span>
          {allowManualOverlap ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" weight="bold" /> Encaixes manuais liberados na recepção e PDV interno
            </span>
          ) : (
            <span className="text-zinc-400 font-medium flex items-center gap-1">
              <Info className="w-3.5 h-3.5" weight="bold" /> Respiro respeitado rigorosamente em todos os canais
            </span>
          )}
        </div>
      </div>

      {/* 4. Simulador do Motor em Tempo Real (Live Preview) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1C1A16] to-[#141416] border border-amber-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
            <Sparkle className="w-4 h-4 text-[#D4AF37]" weight="fill" />
            Simulador de Impacto na Agenda do Cliente
          </span>
          <span className="text-[11px] text-zinc-400">Tempo Real</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Exemplo de Combo</span>
            <span className="text-sm font-bold text-white block mt-0.5">Corte + Barba (60 min)</span>
            <span className="text-[11px] text-zinc-400 block mt-0.5">Serviço padrão duplo</span>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Tempo Bloqueado</span>
            <span className="text-sm font-bold text-[#D4AF37] font-mono block mt-0.5">
              {sampleTotalRequired} min {respiro > 0 && `(60m + ${respiro}m respiro)`}
            </span>
            <span className="text-[11px] text-zinc-400 block mt-0.5">Janela contígua exigida</span>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Slots Ocupados</span>
            <span className="text-sm font-bold text-emerald-400 font-mono block mt-0.5">
              {sampleSlotsNeeded} {sampleSlotsNeeded === 1 ? 'slot' : 'slots'} de {slotInterval}m
            </span>
            <span className="text-[11px] text-zinc-400 block mt-0.5">Validação rigorosa</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">
          💡 <strong>Como funciona para o cliente final:</strong> Ao selecionar serviços que somam {sampleComboDuration} minutos, o sistema verifica se há {sampleSlotsNeeded} slots consecutivos rigorosamente livres. Se houver apenas slots soltos de {slotInterval} min, o sistema exibe o aviso educativo e as 3 opções inteligentes de resolução imediata.
        </p>
      </div>
    </div>
  );
};
