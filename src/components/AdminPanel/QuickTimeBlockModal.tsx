import React, { useState, useMemo } from 'react';
import {
  X,
  LockKey as Lock,
  Clock,
  CalendarBlank as CalendarIcon,
  Trash as Trash2,
  ForkKnife,
  UsersThree,
  User,
  Sparkle,
  CheckCircle,
  ArrowsClockwise,
  SlidersHorizontal,
  Check,
  WarningCircle,
} from '@phosphor-icons/react';
import { Barber, TimeBlock } from '../../types';
import { formatDatePtBR, addMinutesToTime } from '../../utils/formatters';

interface QuickTimeBlockModalProps {
  barbers: Barber[];
  activeBlocks: TimeBlock[];
  selectedDate: string;
  tenantPlan?: string;
  maxBarbers?: number;
  initialBarberId?: string;
  initialTab?: 'lunch' | 'manual';
  onClose: () => void;
  onAddBlock: (block: Omit<TimeBlock, 'id' | 'createdAt'>) => void;
  onAddBlocks?: (blocks: Array<Omit<TimeBlock, 'id' | 'createdAt'>>) => void;
  onRemoveBlock: (blockId: string) => void;
}

export const QuickTimeBlockModal: React.FC<QuickTimeBlockModalProps> = ({
  barbers,
  activeBlocks,
  selectedDate,
  tenantPlan,
  maxBarbers,
  initialBarberId,
  initialTab,
  onClose,
  onAddBlock,
  onAddBlocks,
  onRemoveBlock,
}) => {
  // Modal active tab: 'lunch' (Gerador de Almoço) or 'manual' (Bloqueio Avulso)
  const [activeTab, setActiveTab] = useState<'lunch' | 'manual'>(
    initialTab || (initialBarberId ? 'manual' : 'lunch')
  );

  // Manual block state
  const [barberId, setBarberId] = useState<string>(initialBarberId || 'all');
  const [date, setDate] = useState<string>(selectedDate);
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('13:00');
  const [reason, setReason] = useState<string>('Intervalo de Almoço');

  const presetReasons = [
    'Intervalo de Almoço',
    'Imprevisto Pessoal / Saída',
    'Folga Programada',
    'Consulta Médica',
    'Treinamento / Reunião',
    'Manutenção do Espaço',
  ];

  // Lunch generator state
  const hasMultipleBarbers = barbers.length > 1;
  const [lunchMode, setLunchMode] = useState<'staggered' | 'same_time' | 'custom'>(
    hasMultipleBarbers ? 'staggered' : 'same_time'
  );
  const [lunchDate, setLunchDate] = useState<string>(selectedDate);
  const [lunchBaseStart, setLunchBaseStart] = useState<string>('12:00');
  const [lunchDuration, setLunchDuration] = useState<number>(60);
  const [sameTimeEnd, setSameTimeEnd] = useState<string>('13:00');
  const [asGeneralBlock, setAsGeneralBlock] = useState<boolean>(true);

  // Custom schedule per barber (for multi-barber plans)
  const [customSchedules, setCustomSchedules] = useState<{
    [barberId: string]: { enabled: boolean; startTime: string; endTime: string };
  }>(() => {
    const initial: { [barberId: string]: { enabled: boolean; startTime: string; endTime: string } } = {};
    barbers.forEach((b, idx) => {
      const bStart = addMinutesToTime('12:00', idx * 60);
      const bEnd = addMinutesToTime(bStart, 60);
      initial[b.id] = {
        enabled: true,
        startTime: bStart,
        endTime: bEnd,
      };
    });
    return initial;
  });

  // Calculate generated blocks preview in real-time
  const calculatedLunchBlocks = useMemo<Array<Omit<TimeBlock, 'id' | 'createdAt'>>>(() => {
    if (!hasMultipleBarbers) {
      const targetBarber = barbers[0];
      return [
        {
          barberId: targetBarber?.id || 'all',
          date: lunchDate,
          startTime: lunchBaseStart,
          endTime: sameTimeEnd,
          reason: `Intervalo de Almoço${targetBarber ? ` - ${targetBarber.name}` : ''}`,
        },
      ];
    }

    if (lunchMode === 'staggered') {
      return barbers.map((b, idx) => {
        const bStart = addMinutesToTime(lunchBaseStart, idx * lunchDuration);
        const bEnd = addMinutesToTime(bStart, lunchDuration);
        return {
          barberId: b.id,
          date: lunchDate,
          startTime: bStart,
          endTime: bEnd,
          reason: `Intervalo de Almoço - ${b.name}`,
        };
      });
    }

    if (lunchMode === 'same_time') {
      if (asGeneralBlock) {
        return [
          {
            barberId: 'all',
            date: lunchDate,
            startTime: lunchBaseStart,
            endTime: sameTimeEnd,
            reason: 'Intervalo de Almoço (Geral)',
          },
        ];
      } else {
        return barbers.map((b) => ({
          barberId: b.id,
          date: lunchDate,
          startTime: lunchBaseStart,
          endTime: sameTimeEnd,
          reason: `Intervalo de Almoço - ${b.name}`,
        }));
      }
    }

    if (lunchMode === 'custom') {
      return barbers
        .filter((b) => customSchedules[b.id]?.enabled)
        .map((b) => ({
          barberId: b.id,
          date: lunchDate,
          startTime: customSchedules[b.id]?.startTime || '12:00',
          endTime: customSchedules[b.id]?.endTime || '13:00',
          reason: `Intervalo de Almoço - ${b.name}`,
        }));
    }

    return [];
  }, [
    hasMultipleBarbers,
    barbers,
    lunchDate,
    lunchMode,
    lunchBaseStart,
    lunchDuration,
    sameTimeEnd,
    asGeneralBlock,
    customSchedules,
  ]);

  // Handle generating lunch blocks
  const handleGenerateLunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedLunchBlocks.length === 0) return;

    if (onAddBlocks) {
      onAddBlocks(calculatedLunchBlocks);
    } else {
      calculatedLunchBlocks.forEach((block) => onAddBlock(block));
    }
  };

  // Handle manual block submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || !reason) return;

    onAddBlock({
      barberId,
      date,
      startTime,
      endTime,
      reason,
    });
  };

  // Lunch blocks for this day in activeBlocks
  const lunchBlocksToday = useMemo(() => {
    return activeBlocks.filter(
      (b) => b.reason.toLowerCase().includes('almoço') || b.reason.toLowerCase().includes('almoco')
    );
  }, [activeBlocks]);

  const handleClearLunchBlocks = () => {
    if (lunchBlocksToday.length === 0) return;
    if (window.confirm(`Deseja remover os ${lunchBlocksToday.length} bloqueio(s) de almoço cadastrados para este dia?`)) {
      lunchBlocksToday.forEach((b) => onRemoveBlock(b.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl lg:max-w-2xl rounded-3xl bg-[#141416] border border-amber-500/40 p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto text-left custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Fechar modal (ESC)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-[#D4AF37] flex items-center justify-center shrink-0">
            {activeTab === 'lunch' ? (
              <ForkKnife className="w-5 h-5" weight="bold" />
            ) : (
              <Lock className="w-5 h-5" weight="bold" />
            )}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
              <span>{activeTab === 'lunch' ? 'Gerador de Intervalo de Almoço' : 'Bloquear Horário na Agenda'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                {hasMultipleBarbers ? `${barbers.length} Barbeiros no Plano` : '1 Barbeiro'}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              {activeTab === 'lunch'
                ? 'Gere bloqueios automáticos de almoço para todos ou individualize por profissional.'
                : 'Impede agendamentos no período selecionado para evitar sobreposições.'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-5 p-1 rounded-2xl bg-zinc-900/90 border border-white/5 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('lunch')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'lunch'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ForkKnife className="w-4 h-4" weight={activeTab === 'lunch' ? 'bold' : 'regular'} />
            <span>Gerar Almoço</span>
            {hasMultipleBarbers && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'lunch' ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-400'
              }`}>
                Auto
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-[#D4AF37] text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-4 h-4" weight={activeTab === 'manual' ? 'bold' : 'regular'} />
            <span>Bloqueio Avulso</span>
          </button>
        </div>

        {/* TAB 1: GERADOR DE INTERVALO DE ALMOÇO */}
        {activeTab === 'lunch' && (
          <form onSubmit={handleGenerateLunch} className="mt-5 space-y-4 animate-in fade-in duration-150">
            {/* Context Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-zinc-300 text-xs flex items-start gap-2.5">
              <Sparkle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" weight="fill" />
              <div className="space-y-0.5">
                <span className="font-bold text-white block">
                  {hasMultipleBarbers
                    ? `Plano com ${barbers.length} barbeiros ativos`
                    : `Plano individual (${barbers[0]?.name || 'Barbeiro'})`}
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {hasMultipleBarbers
                    ? 'Você pode revezar o almoço dos barbeiros em horários sequenciais (para a barbearia nunca fechar) ou definir o mesmo horário para todos.'
                    : 'Gere o bloqueio diário de almoço com 1 clique para manter sua agenda organizada.'}
                </p>
              </div>
            </div>

            {/* Data do Bloqueio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                  Data para o Almoço
                </label>
                <input
                  type="date"
                  required
                  value={lunchDate}
                  onChange={(e) => setLunchDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 block">Atalho de Data</label>
                <div className="flex gap-1.5 h-11 items-center">
                  <button
                    type="button"
                    onClick={() => setLunchDate(new Date().toISOString().split('T')[0])}
                    className="flex-1 h-full rounded-xl bg-zinc-900 border border-white/10 hover:border-amber-500/40 text-xs text-zinc-300 hover:text-white transition font-semibold"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setLunchDate(tomorrow.toISOString().split('T')[0]);
                    }}
                    className="flex-1 h-full rounded-xl bg-zinc-900 border border-white/10 hover:border-amber-500/40 text-xs text-zinc-300 hover:text-white transition font-semibold"
                  >
                    Amanhã
                  </button>
                </div>
              </div>
            </div>

            {/* Estratégia de Almoço (Quando há múltiplos barbeiros) */}
            {hasMultipleBarbers && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Estratégia de Almoço para os {barbers.length} Barbeiros
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Modo 1: Revezamento */}
                  <button
                    type="button"
                    onClick={() => setLunchMode('staggered')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                      lunchMode === 'staggered'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ArrowsClockwise className="w-3.5 h-3.5 text-amber-400" />
                        Revezamento
                      </span>
                      {lunchMode === 'staggered' && <Check className="w-3.5 h-3.5 text-[#D4AF37]" weight="bold" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 leading-tight">
                      Escalonado em sequência. <strong>A barbearia nunca fecha!</strong>
                    </span>
                  </button>

                  {/* Modo 2: Mesmo Horário */}
                  <button
                    type="button"
                    onClick={() => setLunchMode('same_time')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                      lunchMode === 'same_time'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <UsersThree className="w-3.5 h-3.5 text-amber-400" />
                        Mesmo Horário
                      </span>
                      {lunchMode === 'same_time' && <Check className="w-3.5 h-3.5 text-[#D4AF37]" weight="bold" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 leading-tight">
                      Todos almoçam juntos. Fecha o salão no intervalo.
                    </span>
                  </button>

                  {/* Modo 3: Personalizado */}
                  <button
                    type="button"
                    onClick={() => setLunchMode('custom')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                      lunchMode === 'custom'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                        Por Barbeiro
                      </span>
                      {lunchMode === 'custom' && <Check className="w-3.5 h-3.5 text-[#D4AF37]" weight="bold" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 leading-tight">
                      Ajuste horário individualmente para cada profissional.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Parâmetros do Modo Revezamento */}
            {hasMultipleBarbers && lunchMode === 'staggered' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
                <span className="text-xs font-bold text-white block">
                  Regras do Revezamento Escalonado
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Início do 1º Almoço
                    </label>
                    <input
                      type="time"
                      value={lunchBaseStart}
                      onChange={(e) => setLunchBaseStart(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400">
                      Duração por Barbeiro
                    </label>
                    <select
                      value={lunchDuration}
                      onChange={(e) => setLunchDuration(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>60 minutos (1 hora)</option>
                      <option value={90}>90 minutos (1h30)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Parâmetros do Modo Mesmo Horário (ou Solo) */}
            {(!hasMultipleBarbers || lunchMode === 'same_time') && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
                <span className="text-xs font-bold text-white block">
                  {hasMultipleBarbers ? 'Horário de Fechamento Geral para Almoço' : 'Horário de Almoço do Profissional'}
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Hora Início
                    </label>
                    <input
                      type="time"
                      value={lunchBaseStart}
                      onChange={(e) => setLunchBaseStart(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Hora Fim
                    </label>
                    <input
                      type="time"
                      value={sameTimeEnd}
                      onChange={(e) => setSameTimeEnd(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {hasMultipleBarbers && (
                  <label className="flex items-center gap-2 pt-1 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={asGeneralBlock}
                      onChange={(e) => setAsGeneralBlock(e.target.checked)}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Bloquear a agenda geral de uma só vez (bloqueio global)</span>
                  </label>
                )}
              </div>
            )}

            {/* Parâmetros do Modo Customizado por Barbeiro */}
            {hasMultipleBarbers && lunchMode === 'custom' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
                <span className="text-xs font-bold text-white block">
                  Horário Individual por Barbeiro
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {barbers.map((b) => {
                    const sched = customSchedules[b.id] || {
                      enabled: true,
                      startTime: '12:00',
                      endTime: '13:00',
                    };

                    return (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                          sched.enabled
                            ? 'bg-black/40 border-amber-500/20'
                            : 'bg-black/20 border-white/5 opacity-50'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={sched.enabled}
                            onChange={(e) => {
                              setCustomSchedules((prev) => ({
                                ...prev,
                                [b.id]: { ...sched, enabled: e.target.checked },
                              }));
                            }}
                            className="rounded accent-amber-500 w-4 h-4 shrink-0"
                          />
                          <span className="text-xs font-bold text-white truncate">{b.name}</span>
                        </label>

                        {sched.enabled && (
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="time"
                              value={sched.startTime}
                              onChange={(e) => {
                                const newStart = e.target.value;
                                setCustomSchedules((prev) => ({
                                  ...prev,
                                  [b.id]: { ...sched, startTime: newStart },
                                }));
                              }}
                              className="w-24 h-8 px-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-xs font-mono text-center focus:outline-none focus:border-[#D4AF37]"
                            />
                            <span className="text-zinc-500 text-xs font-mono">até</span>
                            <input
                              type="time"
                              value={sched.endTime}
                              onChange={(e) => {
                                const newEnd = e.target.value;
                                setCustomSchedules((prev) => ({
                                  ...prev,
                                  [b.id]: { ...sched, endTime: newEnd },
                                }));
                              }}
                              className="w-24 h-8 px-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-xs font-mono text-center focus:outline-none focus:border-[#D4AF37]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview da Escala Gerada */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider block">
                Pré-visualização dos Bloqueios ({calculatedLunchBlocks.length})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {calculatedLunchBlocks.map((blk, idx) => {
                  const targetB = barbers.find((b) => b.id === blk.barberId);
                  const barberName = blk.barberId === 'all' ? 'Todos os Barbeiros (Geral)' : targetB?.name || 'Barbeiro';

                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-zinc-900/90 border border-amber-500/20 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ForkKnife className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" weight="fill" />
                        <span className="font-semibold text-white truncate text-[11px]">
                          {barberName}
                        </span>
                      </div>
                      <span className="font-mono text-amber-400 font-bold shrink-0 text-[11px]">
                        {blk.startTime} - {blk.endTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={calculatedLunchBlocks.length === 0}
              className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-extrabold text-xs transition active:scale-[0.98] shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" weight="bold" />
              <span>
                Aplicar Bloqueio de Almoço ({calculatedLunchBlocks.length}) para {formatDatePtBR(lunchDate)}
              </span>
            </button>
          </form>
        )}

        {/* TAB 2: FORMULÁRIO MANUAL AVULSO */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="mt-5 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Barber */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">Profissional</label>
                <select
                  value={barberId}
                  onChange={(e) => setBarberId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">Todos os Barbeiros (Bloqueio Geral)</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 text-amber-400" />
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Start time */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Hora Início
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* End time */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Hora Fim
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Motivo do Bloqueio</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Almoço, Imprevisto, Folga..."
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              />
              {/* Preset pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetReasons.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => {
                      setReason(p);
                      if (p === 'Intervalo de Almoço' && hasMultipleBarbers) {
                        // Helpful suggestion
                      }
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      reason === p
                        ? 'bg-amber-500/20 text-[#D4AF37] border-amber-500/30 font-semibold'
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {reason === 'Intervalo de Almoço' && hasMultipleBarbers && (
                <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-300 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-300">
                    💡 Prefere revezar o horário entre os {barbers.length} barbeiros para não fechar a barbearia?
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('lunch')}
                    className="text-[11px] font-bold text-[#D4AF37] hover:underline shrink-0 cursor-pointer"
                  >
                    Usar Gerador de Almoço →
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-extrabold text-xs transition active:scale-[0.98] shadow-md shadow-amber-500/10 cursor-pointer"
            >
              Adicionar Bloqueio Avulso
            </button>
          </form>
        )}

        {/* Existing Blocks List */}
        <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
              Bloqueios Ativos para {formatDatePtBR(activeTab === 'lunch' ? lunchDate : date)} ({activeBlocks.length})
            </span>
            {lunchBlocksToday.length > 0 && (
              <button
                type="button"
                onClick={handleClearLunchBlocks}
                className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar almoços ({lunchBlocksToday.length})</span>
              </button>
            )}
          </div>

          {activeBlocks.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2 italic">
              Nenhum bloqueio cadastrado para este dia.
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
              {activeBlocks.map((b) => {
                const targetBarber = barbers.find((barb) => barb.id === b.barberId);
                const barberName = b.barberId === 'all' ? 'Todos os Barbeiros (Geral)' : targetBarber?.name || 'Barbeiro';
                const isLunch = b.reason.toLowerCase().includes('almoço') || b.reason.toLowerCase().includes('almoco');

                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      isLunch
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-zinc-900 border-white/5'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-medium text-white flex-wrap">
                        <span className="text-amber-400 font-mono font-bold">
                          {b.startTime} - {b.endTime}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="truncate">{barberName}</span>
                        {isLunch && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-[#D4AF37] border border-amber-500/40 inline-flex items-center gap-1">
                            <ForkKnife className="w-2.5 h-2.5" weight="fill" />
                            Almoço
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-400 text-[11px] block mt-0.5 truncate">
                        {b.reason} ({formatDatePtBR(b.date)})
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveBlock(b.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                      title="Remover bloqueio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
