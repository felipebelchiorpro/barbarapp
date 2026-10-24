import React, { useState } from 'react';
import { X, Pulse as Activity, PaperPlaneTilt as Send, CheckCircle, ArrowsClockwise as RefreshCw, Gear as Settings, ArrowSquareOut as ExternalLink, Code as Code2 } from '@phosphor-icons/react';
import { EvolutionApiConfig, WebhookLog, Booking } from '../../types';

interface WebhookMonitorModalProps {
  logs: WebhookLog[];
  config: EvolutionApiConfig;
  bookings: Booking[];
  onClose: () => void;
  onUpdateConfig: (newConfig: EvolutionApiConfig) => void;
  onTriggerTestReminder: (booking: Booking) => void;
  onClearLogs: () => void;
}

export const WebhookMonitorModal: React.FC<WebhookMonitorModalProps> = ({
  logs,
  config,
  bookings,
  onClose,
  onUpdateConfig,
  onTriggerTestReminder,
  onClearLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'config'>('logs');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(logs[0]?.id || null);
  const [editConfig, setEditConfig] = useState<EvolutionApiConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(editConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-display text-white">
                  Evolution API &amp; Webhooks
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Disparos automáticos de confirmação e lembretes por WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'logs'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Logs de Disparo ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'config'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Configurações da API
            </button>
          </div>

          {activeTab === 'logs' && logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-[11px] text-zinc-400 hover:text-red-400 transition"
            >
              Limpar Logs
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'logs' ? (
            <div className="space-y-4">
              {/* Quick Simulator Bar */}
              <div className="p-3 rounded-2xl bg-zinc-900 border border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Simulador de Lembrete Automático (Evolution API)
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Dispara mensagem de lembrete com botões de confirmação para agendamentos de hoje:
                    </span>
                  </div>

                  {bookings.length > 0 ? (
                    <button
                      onClick={() => onTriggerTestReminder(bookings[0])}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap self-start sm:self-auto cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Simular Lembrete ({bookings[0].customerName.split(' ')[0]})</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-500">Nenhum agendamento para simular</span>
                  )}
                </div>
              </div>

              {/* Logs Content */}
              {logs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  Nenhum webhook disparado ainda. Faça um agendamento para gerar o primeiro evento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* List of events */}
                  <div className="md:col-span-5 space-y-2 max-h-80 overflow-y-auto pr-1">
                    {logs.map((log) => {
                      const isSelected = selectedLog?.id === log.id;
                      const timeStr = new Date(log.timestamp).toLocaleTimeString('pt-BR');

                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLogId(log.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                            isSelected
                              ? 'bg-zinc-900 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                              : 'bg-zinc-900/60 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                              {log.eventType}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{timeStr}</span>
                          </div>

                          <div className="text-xs font-semibold text-white mt-1 truncate">
                            {log.customerName}
                          </div>

                          <div className="flex items-center justify-between mt-1 text-[11px]">
                            <span className="text-zinc-400 font-mono">{log.customerPhone}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                log.status === 'delivered'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {log.status === 'delivered' ? 'Enviado' : 'Simulado'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Payload Viewer */}
                  <div className="md:col-span-7 bg-[#121212] border border-white/10 rounded-2xl p-4 text-xs font-mono overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-zinc-400 shrink-0">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Code2 className="w-3.5 h-3.5" /> Payload JSON (Evolution API)
                      </span>
                      <span>HTTP 200 OK</span>
                    </div>

                    <div className="mt-2 text-[11px] text-zinc-400 space-y-1">
                      <div>
                        <strong className="text-zinc-300">Endpoint:</strong> {selectedLog?.endpoint}
                      </div>
                      <div>
                        <strong className="text-zinc-300">Status:</strong>{' '}
                        <span className="text-emerald-400">{selectedLog?.responseMessage}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex-1 overflow-y-auto bg-black/50 p-3 rounded-xl text-[11px] text-emerald-300 leading-relaxed max-h-64 border border-white/5">
                      <pre className="whitespace-pre-wrap font-mono">
                        {JSON.stringify(selectedLog?.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Config Tab */
            <form onSubmit={handleSaveConfig} className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  URL Base da Evolution API
                </label>
                <input
                  type="url"
                  value={editConfig.baseUrl}
                  onChange={(e) => setEditConfig({ ...editConfig, baseUrl: e.target.value })}
                  placeholder="https://sua-evolution-api.com"
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="text-[11px] text-zinc-500 block">
                  Exemplo: https://api.seudominio.com.br
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Nome da Instância (WhatsApp)
                </label>
                <input
                  type="text"
                  value={editConfig.instanceName}
                  onChange={(e) => setEditConfig({ ...editConfig, instanceName: e.target.value })}
                  placeholder="barbearia_navalha_arte"
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  API Key / Global Token
                </label>
                <input
                  type="password"
                  value={editConfig.apiKey}
                  onChange={(e) => setEditConfig({ ...editConfig, apiKey: e.target.value })}
                  placeholder="Sua chave secreta da Evolution API"
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Horas de Antecedência para Lembrete
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={editConfig.reminderHoursBefore}
                  onChange={(e) =>
                    setEditConfig({
                      ...editConfig,
                      reminderHoursBefore: parseInt(e.target.value) || 2,
                    })
                  }
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="auto-send"
                  checked={editConfig.autoSendEnabled}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, autoSendEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[#D4AF37] focus:ring-0 bg-zinc-900 border-zinc-700"
                />
                <label htmlFor="auto-send" className="text-xs text-zinc-300 cursor-pointer">
                  Disparar comprovante instantâneo logo após o agendamento
                </label>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Configurações Salvas!</span>
                  </>
                ) : (
                  <span>Salvar Parâmetros da Evolution API</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
