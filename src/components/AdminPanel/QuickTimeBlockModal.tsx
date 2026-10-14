import React, { useState } from 'react';
import { X, Lock, Clock, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Barber, TimeBlock } from '../../types';
import { formatDatePtBR } from '../../utils/formatters';

interface QuickTimeBlockModalProps {
  barbers: Barber[];
  activeBlocks: TimeBlock[];
  selectedDate: string;
  onClose: () => void;
  onAddBlock: (block: Omit<TimeBlock, 'id' | 'createdAt'>) => void;
  onRemoveBlock: (blockId: string) => void;
}

export const QuickTimeBlockModal: React.FC<QuickTimeBlockModalProps> = ({
  barbers,
  activeBlocks,
  selectedDate,
  onClose,
  onAddBlock,
  onRemoveBlock,
}) => {
  const [barberId, setBarberId] = useState<string>('all');
  const [date, setDate] = useState<string>(selectedDate);
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('13:00');
  const [reason, setReason] = useState<string>('Intervalo de Almoço');

  const presetReasons = [
    'Intervalo de Almoço',
    'Imprevisto Pessoal',
    'Treinamento / Reunião',
    'Manutenção do Espaço',
    'Folga Programada',
  ];

  const handleSubmit = (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-[#18181B] border border-white/10 p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-white">
              Bloquear Horário na Agenda
            </h3>
            <p className="text-xs text-zinc-400">
              Impede agendamentos no período selecionado para evitar sobreposições.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                  onClick={() => setReason(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                    reason === p
                      ? 'bg-amber-500/20 text-[#D4AF37] border-amber-500/30 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs transition active:scale-[0.98] shadow-md shadow-amber-500/10 cursor-pointer"
          >
            Adicionar Bloqueio
          </button>
        </form>

        {/* Existing Blocks List */}
        <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
            Bloqueios Ativos ({activeBlocks.length})
          </span>

          {activeBlocks.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2 italic">
              Nenhum bloqueio cadastrado para este dia.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activeBlocks.map((b) => {
                const targetBarber = barbers.find((barb) => barb.id === b.barberId);
                const barberName = b.barberId === 'all' ? 'Todos os Barbeiros' : targetBarber?.name || 'Barbeiro';

                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-white">
                        <span className="text-amber-400 font-mono font-bold">
                          {b.startTime} - {b.endTime}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span>{barberName}</span>
                      </div>
                      <span className="text-zinc-400 text-[11px] block mt-0.5">
                        {b.reason} ({formatDatePtBR(b.date)})
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveBlock(b.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
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
