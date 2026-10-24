import React, { useState, useEffect } from 'react';
import {
  PaperPlaneTilt,
  Key,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  ArrowsClockwise,
  Copy,
  Eye,
  EyeSlash,
  Sparkle,
  ShieldCheck,
  Code,
  SlidersHorizontal,
  Trash,
  Info,
  Check,
} from '@phosphor-icons/react';
import {
  CrmWebhookConfig,
  CrmWebhookEventType,
  CrmWebhookLog,
  TenantConfig,
} from '../../types';
import {
  DEFAULT_CRM_WEBHOOK_CONFIG,
  buildCrmEventPayload,
  dispatchCrmWebhook,
  loadCrmLogs,
} from '../../services/crmWebhookService';

interface CrmWebhooksManagerProps {
  tenants: TenantConfig[];
  crmConfig?: CrmWebhookConfig;
  onUpdateCrmConfig?: (config: CrmWebhookConfig) => void;
}

const ALL_EVENTS: { id: CrmWebhookEventType; label: string; desc: string; badgeColor: string }[] = [
  {
    id: 'saas.lead.cadastro_iniciado',
    label: 'Lead: Cadastro Iniciado',
    desc: 'Disparado quando um novo dono de barbearia inicia o registo na landing page (pipeline de vendas do CRM)',
    badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'saas.barbearia.ativada',
    label: 'Barbearia: Assinatura Ativada',
    desc: 'Disparado quando o pagamento é confirmado e o tenant é liberado para atendimento',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'saas.upsell.vaga_adicionada',
    label: 'Upsell: Vaga de Barbeiro Adicionada',
    desc: 'Disparado quando a barbearia adiciona barbeiros extras além da cota do plano (+R$ 25/mês)',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'saas.cobranca.em_atraso',
    label: 'Cobrança: Em Atraso (D+1)',
    desc: 'Disparado no primeiro dia de atraso do pagamento (para o CRM ativar time comercial ou retenção)',
    badgeColor: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  {
    id: 'saas.cobranca.cancelada_ou_bloqueada',
    label: 'Suspensão: Tenant Bloqueado',
    desc: 'Disparado quando ocorre a suspensão definitiva ou bloqueio por inadimplência prolongada',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
];

export const CrmWebhooksManager: React.FC<CrmWebhooksManagerProps> = ({
  tenants,
  crmConfig: initialConfig,
  onUpdateCrmConfig,
}) => {
  const [config, setConfig] = useState<CrmWebhookConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('naville_crm_config_v1');
      if (saved) return JSON.parse(saved);
    }
    return initialConfig || DEFAULT_CRM_WEBHOOK_CONFIG;
  });

  const [logs, setLogs] = useState<CrmWebhookLog[]>(() => loadCrmLogs());
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulator State
  const [testEvent, setTestEvent] = useState<CrmWebhookEventType>('saas.lead.cadastro_iniciado');
  const [testTenantId, setTestTenantId] = useState<string>(tenants[0]?.id || '');
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastDispatchLog, setLastDispatchLog] = useState<CrmWebhookLog | null>(null);
  const [inspectLog, setInspectLog] = useState<CrmWebhookLog | null>(null);

  // Save config
  const handleSaveConfig = () => {
    const updated = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    setConfig(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('naville_crm_config_v1', JSON.stringify(updated));
    }
    onUpdateCrmConfig?.(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleGenerateSecret = () => {
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setConfig((prev) => ({ ...prev, secretKey: `naville_crm_sec_${rand}` }));
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(config.secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleToggleEvent = (eventId: CrmWebhookEventType) => {
    setConfig((prev) => {
      const exists = prev.activeEvents.includes(eventId);
      return {
        ...prev,
        activeEvents: exists
          ? prev.activeEvents.filter((e) => e !== eventId)
          : [...prev.activeEvents, eventId],
      };
    });
  };

  // Preview payload for selected test
  const selectedTenant = tenants.find((t) => t.id === testTenantId) || tenants[0];
  const previewPayload = buildCrmEventPayload(testEvent, {
    tenant: selectedTenant,
    lead: {
      nome_responsavel: 'Felipe Alcantara',
      telefone: '11987654321',
      nome_barbearia: 'Barbearia Vintage Imperial',
      email: 'felipe@vintageimperial.com.br',
      cidade: 'São Paulo - SP',
      plano_interesse: 'pro',
    },
    upsell: {
      vagas_anteriores: selectedTenant?.max_barbeiros || 2,
      novas_vagas: (selectedTenant?.max_barbeiros || 2) + 2,
      vagas_adicionais: 2,
      valor_recorrente_adicional: 50.0,
    },
    motivoBloqueio: 'Inadimplência de 8 dias - Execução automática do Kill Switch',
  });

  // Execute test dispatch
  const handleTestDispatch = async () => {
    setIsDispatching(true);
    try {
      const resultLog = await dispatchCrmWebhook(testEvent, previewPayload, config);
      setLastDispatchLog(resultLog);
      setLogs(loadCrmLogs());
    } finally {
      setIsDispatching(false);
    }
  };

  const handleClearLogs = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('naville_crm_webhook_logs_v1');
    }
    setLogs([]);
    setLastDispatchLog(null);
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in">
      {/* Top Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" weight="bold" /> Pipeline de Vendas & CRM
            </span>
            <span className="text-xs text-zinc-400 font-mono">Webhooks Globais do Super Admin</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
            Sincronização com CRM Externo
          </h2>
          <p className="text-xs text-zinc-400">
            Envie eventos de ciclo de vida (leads, assinaturas, upsells e cobranças) para automações no n8n, Typebot ou plataformas de vendas.
          </p>
        </div>

        <button
          onClick={handleSaveConfig}
          className="h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A880] text-black font-extrabold text-xs tracking-wide uppercase shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-black" weight="bold" /> Configuração Salva!
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-black" weight="bold" /> Salvar Webhook CRM
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" weight="bold" />
          <span>Configurações do Webhook de CRM salvas com sucesso! As novas credenciais já estão em vigor.</span>
        </div>
      )}

      {/* Grid: 1. Configuração Global | 2. Eventos Subscritos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Conexão & Segurança (URL e x-naville-signature) */}
        <div className="p-5 rounded-2xl bg-[#18181B] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-400" weight="bold" />
              Parâmetros de Destino do CRM
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-2 text-[10px] font-bold uppercase text-zinc-400">
                {config.enabled ? 'Ativo' : 'Pausado'}
              </span>
            </label>
          </div>

          {/* Webhook URL Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-zinc-400 block">
              URL de Destino do CRM / n8n / Typebot (POST JSON)
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://n8n.seuservidor.com/webhook/crm-saas"
              className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
            />
            <p className="text-[10px] text-zinc-500">
              Receberá requisições POST com cabeçalho <code className="text-amber-300">x-naville-signature: sha256=...</code>
            </p>
          </div>

          {/* Secret Key Input */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Chave Secreta de Assinatura (HMAC Secret)
              </label>
              <button
                type="button"
                onClick={handleGenerateSecret}
                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
              >
                Gerar Nova Chave
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={config.secretKey}
                  onChange={(e) => setConfig((prev) => ({ ...prev, secretKey: e.target.value }))}
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  title={showSecret ? 'Ocultar' : 'Visualizar'}
                >
                  {showSecret ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopySecret}
                className="h-11 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Copiar chave secreta"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Utilize esta chave no seu servidor para validar a autenticidade dos dados recebidos via SHA-256 HMAC.
            </p>
          </div>
        </div>

        {/* Card 2: Eventos Ativos Subscritos */}
        <div className="p-5 rounded-2xl bg-[#18181B] border border-white/5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" weight="bold" />
                Eventos em Tempo Real Subscritos ({config.activeEvents.length}/5)
              </span>
              <span className="text-[10px] text-zinc-500">Ativação granular</span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Selecione quais etapas do ciclo de vida da barbearia devem disparar payloads para o seu CRM:
            </p>
          </div>

          <div className="space-y-2">
            {ALL_EVENTS.map((ev) => {
              const isChecked = config.activeEvents.includes(ev.id);
              return (
                <label
                  key={ev.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                    isChecked
                      ? 'bg-black/30 border-white/10 hover:border-amber-500/40'
                      : 'bg-zinc-900/30 border-white/5 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleEvent(ev.id)}
                    className="mt-1 rounded border-zinc-700 text-[#D4AF37] focus:ring-amber-500/30 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{ev.label}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${ev.badgeColor}`}>
                        {ev.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">{ev.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Simulador Interativo & Testador de Webhook */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1C1A16] to-[#141416] border border-amber-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
              <Sparkle className="w-4 h-4 text-[#D4AF37]" weight="fill" />
              Simulador de Disparos em Tempo Real
            </span>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dispare um teste real contra seu webhook cadastrado para validar contratos de payload e headers de segurança.
            </p>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleTestDispatch}
            disabled={isDispatching}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:brightness-110 text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isDispatching ? (
              <>
                <ArrowsClockwise className="w-4 h-4 animate-spin" />
                <span>Enviando Payload...</span>
              </>
            ) : (
              <>
                <PaperPlaneTilt className="w-4 h-4" weight="bold" />
                <span>Disparar Webhook para o CRM</span>
              </>
            )}
          </button>
        </div>

        {/* Controls: Event Picker & Tenant Picker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-400 block">Evento a Testar</label>
            <select
              value={testEvent}
              onChange={(e) => setTestEvent(e.target.value as CrmWebhookEventType)}
              className="w-full h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              {ALL_EVENTS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label} ({e.id})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-zinc-400 block">Barbearia de Exemplo</label>
            <select
              value={testTenantId}
              onChange={(e) => setTestTenantId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan?.toUpperCase()} · {t.cidade || 'SP'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feedback do Último Disparo */}
        {lastDispatchLog && (
          <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in ${
            lastDispatchLog.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}>
            <div className="flex items-center gap-2.5">
              {lastDispatchLog.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" weight="bold" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" weight="bold" />
              )}
              <div>
                <span className="font-bold">
                  Resposta do CRM: {lastDispatchLog.statusCode} {lastDispatchLog.statusText} ({lastDispatchLog.durationMs}ms)
                </span>
                <p className="text-[11px] text-zinc-400 mt-0.5 font-mono truncate max-w-xl">
                  {lastDispatchLog.responseSummary}
                </p>
              </div>
            </div>

            <button
              onClick={() => setInspectLog(lastDispatchLog)}
              className="text-xs font-bold text-amber-300 hover:text-white underline shrink-0 cursor-pointer"
            >
              Ver Resposta Completa
            </button>
          </div>
        )}

        {/* Payload Preview with Syntax Look */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
              <Code className="w-3.5 h-3.5 text-amber-400" />
              Pré-visualização do Payload JSON Enviado
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Headers: x-naville-signature, x-naville-event
            </span>
          </div>

          <pre className="p-3.5 rounded-xl bg-black/80 border border-white/10 text-amber-300 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
            {JSON.stringify(previewPayload, null, 2)}
          </pre>
        </div>
      </div>

      {/* 3. Tabela de Logs de Entregas Recentes */}
      <div className="p-5 rounded-2xl bg-[#18181B] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" weight="bold" />
                Histórico de Entregas & Auditoria de Webhooks ({logs.length})
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Registro auditável de todos os eventos disparados para o CRM com latência e status code retornado.
            </p>
          </div>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Limpar Histórico</span>
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-black/20 border border-white/5 text-zinc-500 text-xs">
            Nenhum webhook registrado no histórico. Use o simulador acima para efetuar o primeiro disparo!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#141416] text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-white/5">
                <tr>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Evento</th>
                  <th className="py-3 px-3.5">Destino</th>
                  <th className="py-3 px-3.5 text-center">Latência</th>
                  <th className="py-3 px-3.5">Data & Hora</th>
                  <th className="py-3 px-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#18181B]">
                {logs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition">
                      {/* Status */}
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          log.success
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}>
                          {log.statusCode} {log.statusText}
                        </span>
                      </td>

                      {/* Evento */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-xs font-bold text-white">
                          {log.event}
                        </span>
                      </td>

                      {/* Destino */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-zinc-400 truncate max-w-[220px]">
                        {log.url}
                      </td>

                      {/* Latência */}
                      <td className="py-3 px-3.5 text-center font-mono text-zinc-300">
                        {log.durationMs}ms
                      </td>

                      {/* Data & Hora */}
                      <td className="py-3 px-3.5 text-zinc-400 text-[11px] font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>

                      {/* Detalhes */}
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-[#D4AF37] hover:text-black text-zinc-300 text-[11px] font-bold transition cursor-pointer"
                        >
                          Inspecionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Inspeção Completa do Log */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 font-mono">
                  Log ID: {inspectLog.id}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Detalhes do Disparo: {inspectLog.event}
                </h3>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-zinc-400 font-mono text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Status:</span>
                  <strong className={inspectLog.success ? 'text-emerald-400' : 'text-rose-400'}>
                    {inspectLog.statusCode} {inspectLog.statusText}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Duração:</span>
                  <strong className="text-white">{inspectLog.durationMs}ms</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500 block">Assinatura x-naville-signature:</span>
                  <code className="text-amber-300 text-[10px] break-all">{inspectLog.signature}</code>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Payload Enviado:</span>
                <pre className="p-3 rounded-xl bg-black/70 border border-white/10 text-amber-200 text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(inspectLog.payload, null, 2)}
                </pre>
              </div>

              {inspectLog.responseSummary && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Resposta do CRM:</span>
                  <pre className="p-3 rounded-xl bg-black/70 border border-white/10 text-zinc-300 text-[11px] font-mono overflow-x-auto max-h-28">
                    {inspectLog.responseSummary}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectLog(null)}
                className="h-9 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
