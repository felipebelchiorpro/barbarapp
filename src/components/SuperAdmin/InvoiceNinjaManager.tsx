import React, { useState } from 'react';
import {
  Receipt,
  Lightning,
  ArrowsClockwise,
  CheckCircle,
  XCircle,
  WarningCircle,
  Clock,
  Gear,
  Code,
  ShieldCheck,
  Storefront,
  CurrencyDollar,
  Copy,
  Check,
  X,
  Play,
  ArrowSquareOut
} from '@phosphor-icons/react';
import {
  Invoice,
  InvoiceNinjaConfig,
  InvoiceNinjaWebhookEvent,
  InvoiceNinjaWebhookLog,
  InvoiceStatus,
  SubscriptionPlan,
  TenantConfig,
} from '../../types';
import { formatCurrency, formatDatePtBR } from '../../utils/formatters';

interface InvoiceNinjaManagerProps {
  tenants: TenantConfig[];
  invoices: Invoice[];
  plans: SubscriptionPlan[];
  config: InvoiceNinjaConfig;
  logs: InvoiceNinjaWebhookLog[];
  onUpdateConfig: (newConfig: InvoiceNinjaConfig) => void;
  onTriggerWebhook: (params: {
    eventType: InvoiceNinjaWebhookEvent;
    tenantId: string;
    invoiceId?: string;
    amount?: number;
    forcedIdempotencyKey?: string;
  }) => { actionTaken: string; isDuplicate: boolean };
  onClearLogs: () => void;
}

export const InvoiceNinjaManager: React.FC<InvoiceNinjaManagerProps> = ({
  tenants,
  invoices,
  plans,
  config,
  logs,
  onUpdateConfig,
  onTriggerWebhook,
  onClearLogs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'simulator' | 'logs' | 'settings'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  // Simulator State
  const [simTenantId, setSimTenantId] = useState<string>(tenants[0]?.id || '');
  const [simEventType, setSimEventType] = useState<InvoiceNinjaWebhookEvent>('invoice.paid');
  const [lastSimResult, setLastSimResult] = useState<{
    message: string;
    isDuplicate: boolean;
    timestamp: string;
  } | null>(null);
  const [lastUsedKey, setLastUsedKey] = useState<string>('');

  // Inspect Payload Modal
  const [inspectingLog, setInspectingLog] = useState<InvoiceNinjaWebhookLog | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchesTenant = tenantFilter === 'all' || inv.tenantId === tenantFilter;
    return matchesStatus && matchesTenant;
  });

  // KPI Calculations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((acc, inv) => acc + inv.amount, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((acc, inv) => acc + inv.amount, 0);
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const handleRunSimulation = (repeatWithSameKey = false) => {
    const targetTenant = tenants.find((t) => t.id === simTenantId);
    const targetInvoice = invoices.find((inv) => inv.tenantId === simTenantId);

    const idempotencyKey = repeatWithSameKey && lastUsedKey
      ? lastUsedKey
      : `ninja-evt-${simTenantId}-${targetInvoice?.invoiceNumber || 'INV-SIM'}-${simEventType}-${Date.now()}`;

    setLastUsedKey(idempotencyKey);

    const result = onTriggerWebhook({
      eventType: simEventType,
      tenantId: simTenantId,
      invoiceId: targetInvoice?.id,
      amount: targetInvoice?.amount,
      forcedIdempotencyKey: idempotencyKey,
    });

    setLastSimResult({
      message: result.actionTaken,
      isDuplicate: result.isDuplicate,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 4 Invoice Ninja Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-400" /> Total Faturas
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-white tabular-nums my-1">
            {invoices.length}
          </div>
          <div className="text-[11px] text-zinc-400">{formatCurrency(totalInvoiced)} emitidos</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Pagas & Ativas
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-400 tabular-nums my-1">
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-[11px] text-zinc-400">
            {invoices.filter((i) => i.status === 'paid').length} recebidas
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <WarningCircle className="w-4 h-4" /> Em Atraso / Kill Switch
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-red-400 tabular-nums my-1">
            {formatCurrency(totalOverdue)}
          </div>
          <div className="text-[11px] text-zinc-400">{overdueCount} tenant(s) bloqueado(s)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Lightning className="w-4 h-4 text-[#D4AF37]" /> Webhooks Processados
          </span>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-[#D4AF37] tabular-nums my-1">
            {logs.length}
          </div>
          <div className="text-[11px] text-zinc-400">Auditoria & Idempotência ativa</div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Faturas Emitidas ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'simulator'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Simulador de Webhooks & Kill Switch</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Logs de Auditoria ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-[#D4AF37] text-black shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white'
          }`}
        >
          <Gear className="w-4 h-4" />
          <span>Configuração da API</span>
        </button>
      </div>

      {/* 1. Invoices Tab */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#18181B] border border-white/5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Status:</span>
              {(['all', 'paid', 'pending', 'overdue', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    statusFilter === st
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'
                  }`}
                >
                  {st === 'all'
                    ? 'Todas'
                    : st === 'paid'
                    ? 'Pagas'
                    : st === 'pending'
                    ? 'Pendentes'
                    : st === 'overdue'
                    ? 'Vencidas'
                    : 'Canceladas'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Barbearia:</span>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="h-9 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="all">Todas as Barbearias</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="p-5 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Fatura / ID</th>
                    <th className="pb-3 font-semibold">Barbearia (Tenant)</th>
                    <th className="pb-3 font-semibold">Emissão / Vencimento</th>
                    <th className="pb-3 font-semibold">Valor Total</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredInvoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    const isOverdue = inv.status === 'overdue';
                    const targetTenant = tenants.find((t) => t.id === inv.tenantId);

                    return (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 font-mono font-bold text-white">
                          <div>{inv.invoiceNumber}</div>
                          {inv.ninjaInvoiceId && (
                            <span className="text-[10px] text-zinc-500 font-normal">
                              Ninja: {inv.ninjaInvoiceId}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-white">{inv.tenantName}</div>
                          <span className="text-[11px] text-zinc-400">
                            Status Atual: <strong className={targetTenant?.status === 'blocked' ? 'text-red-400' : 'text-emerald-400'}>{targetTenant?.status}</strong>
                          </span>
                        </td>
                        <td className="py-3 text-zinc-400">
                          <div>{formatDatePtBR(inv.issueDate)}</div>
                          <div className="text-[11px] text-zinc-500">Vence: {formatDatePtBR(inv.dueDate)}</div>
                        </td>
                        <td className="py-3 font-bold text-white tabular-nums text-sm">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPaid
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : isOverdue
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle className="w-3 h-3" weight="fill" />
                                <span>Paga</span>
                              </>
                            ) : isOverdue ? (
                              <>
                                <XCircle className="w-3 h-3" weight="fill" />
                                <span>Vencida / Bloqueada</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" weight="bold" />
                                <span>Pendente</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isPaid && (
                              <button
                                onClick={() => {
                                  onTriggerWebhook({
                                    eventType: 'invoice.paid',
                                    tenantId: inv.tenantId,
                                    invoiceId: inv.id,
                                    amount: inv.amount,
                                  });
                                }}
                                className="h-7 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-[10px] transition cursor-pointer"
                                title="Simula webhook de pagamento recebido pelo Invoice Ninja"
                              >
                                Forçar Pagamento
                              </button>
                            )}

                            {isPaid && (
                              <button
                                onClick={() => {
                                  onTriggerWebhook({
                                    eventType: 'invoice.past_due',
                                    tenantId: inv.tenantId,
                                    invoiceId: inv.id,
                                    amount: inv.amount,
                                  });
                                }}
                                className="h-7 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold text-[10px] transition cursor-pointer"
                                title="Simula atraso de fatura e aciona o Kill Switch"
                              >
                                Forçar Inadimplência
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Simulator Tab */}
      {activeSubTab === 'simulator' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Lightning className="w-5 h-5 text-[#D4AF37]" weight="fill" />
              <h3 className="text-base font-bold text-white">
                Simulador de Webhooks Invoice Ninja & Teste de Idempotência
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Teste o fluxo de ponta a ponta: dispare eventos reais de cobrança e veja o Kill Switch ser ativado ou desativado em tempo real, sem necessidade de chaves de produção.
            </p>
          </div>

          {/* Simulation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-900 border border-white/5">
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                Barbearia Alvo (Tenant):
              </label>
              <select
                value={simTenantId}
                onChange={(e) => setSimTenantId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#141416] border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Status Atual: {t.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                Tipo de Evento do Webhook:
              </label>
              <select
                value={simEventType}
                onChange={(e) => setSimEventType(e.target.value as InvoiceNinjaWebhookEvent)}
                className="w-full h-11 px-3 rounded-xl bg-[#141416] border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="invoice.paid">invoice.paid — Fatura Paga (Desbloqueia Tenant / Kill Switch Off)</option>
                <option value="payment.created">payment.created — Pagamento Recebido (Desbloqueia Tenant)</option>
                <option value="invoice.past_due">invoice.past_due — Fatura Vencida (Ativa Kill Switch! Bloqueia Tenant)</option>
                <option value="invoice.payment_failed">invoice.payment_failed — Falha no Pagamento (Bloqueia Tenant)</option>
                <option value="subscription.renewed">subscription.renewed — Renovação de Assinatura (+30 dias)</option>
                <option value="subscription.cancelled">subscription.cancelled — Assinatura Cancelada</option>
              </select>
            </div>
          </div>

          {/* Trigger Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleRunSimulation(false)}
              className="h-11 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black font-bold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Play className="w-4 h-4" weight="bold" />
              <span>Disparar Webhook Simulado</span>
            </button>

            <button
              disabled={!lastUsedKey}
              onClick={() => handleRunSimulation(true)}
              className="h-11 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer border border-white/10"
              title="Testa reenvio da mesma chave de idempotência para comprovar bloqueio de duplicatas"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Testar Idempotência (Reenviar Mesmo Evento)</span>
            </button>
          </div>

          {/* Last Result Banner */}
          {lastSimResult && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 animate-fade-in ${
                lastSimResult.isDuplicate
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {lastSimResult.isDuplicate ? (
                  <WarningCircle className="w-5 h-5 text-amber-400" weight="fill" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-400" weight="fill" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {lastSimResult.isDuplicate ? 'Proteção de Idempotência Ativada' : 'Webhook Processado com Sucesso'}
                  </span>
                  <span className="text-[10px] font-mono opacity-70">{lastSimResult.timestamp}</span>
                </div>
                <p className="text-xs mt-1">{lastSimResult.message}</p>
                <div className="text-[11px] font-mono opacity-80 mt-1">
                  Chave utilizada: {lastUsedKey}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Logs Tab */}
      {activeSubTab === 'logs' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Inbox de Webhooks & Auditoria Financeira</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Histórico imutável de todos os eventos recebidos do Invoice Ninja com deduplicação por chave.
              </p>
            </div>
            <button
              onClick={onClearLogs}
              className="text-xs text-zinc-400 hover:text-red-400 font-semibold transition cursor-pointer"
            >
              Limpar Logs
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Nenhum log de webhook registrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Horário</th>
                    <th className="pb-3 font-semibold">Evento</th>
                    <th className="pb-3 font-semibold">Barbearia</th>
                    <th className="pb-3 font-semibold">Fatura / Valor</th>
                    <th className="pb-3 font-semibold">Idempotência</th>
                    <th className="pb-3 font-semibold">Ação Executada</th>
                    <th className="pb-3 font-semibold text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 font-mono text-zinc-400 text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="py-3 font-mono font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-200">
                          {log.eventType}
                        </span>
                      </td>
                      <td className="py-3 text-white font-medium">{log.tenantName}</td>
                      <td className="py-3 font-mono text-zinc-300">
                        {log.invoiceNumber}
                        <span className="text-[#D4AF37] block font-bold">{formatCurrency(log.amount)}</span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.status === 'applied'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {log.status === 'applied' ? 'Aplicado' : 'Duplicado Ignorado'}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-300 max-w-xs truncate" title={log.actionTaken}>
                        {log.actionTaken}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setInspectingLog(log)}
                          className="h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Ver JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Settings Tab */}
      {activeSubTab === 'settings' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#18181B] border border-white/5 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Configurações da Conexão Invoice Ninja v5</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Defina as credenciais da API e as regras de disparo automático do Kill Switch por inadimplência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Base URL do Invoice Ninja:
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => onUpdateConfig({ ...config, baseUrl: e.target.value })}
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                API Token (X-Ninja-Token):
              </label>
              <input
                type="password"
                value={config.apiToken}
                onChange={(e) => onUpdateConfig({ ...config, apiToken: e.target.value })}
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Webhook Secret (X-Ninja-Signature):
              </label>
              <input
                type="password"
                value={config.webhookSecret}
                onChange={(e) => onUpdateConfig({ ...config, webhookSecret: e.target.value })}
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Dias de Tolerância após Vencimento (Carência):
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={config.gracePeriodDays}
                onChange={(e) => onUpdateConfig({ ...config, gracePeriodDays: parseInt(e.target.value) || 0 })}
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoBlockOnOverdue}
                onChange={(e) => onUpdateConfig({ ...config, autoBlockOnOverdue: e.target.checked })}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-0 bg-zinc-900 border-white/20"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Ativar Kill Switch Automático ao Receber Webhook de Inadimplência
                </span>
                <span className="text-[11px] text-zinc-400">
                  Bloqueia imediatamente a barbearia quando o Invoice Ninja notificar que a fatura venceu sem pagamento.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.isSandbox}
                onChange={(e) => onUpdateConfig({ ...config, isSandbox: e.target.checked })}
                className="w-4 h-4 rounded text-[#D4AF37] focus:ring-0 bg-zinc-900 border-white/20"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Modo Sandbox / Homologação Ativo
                </span>
                <span className="text-[11px] text-zinc-400">
                  Permite simular eventos e pagamentos sem movimentação financeira bancária real.
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Inspect JSON Payload Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl p-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Payload do Webhook</h4>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              <div className="text-[11px] text-zinc-400 mb-1.5 flex items-center justify-between">
                <span>Idempotency Key: <strong className="text-white font-mono">{inspectingLog.idempotencyKey}</strong></span>
                <button
                  onClick={() => handleCopyText(JSON.stringify(inspectingLog.payload, null, 2))}
                  className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedPayload ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPayload ? 'Copiado' : 'Copiar JSON'}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-zinc-950 border border-white/5 text-amber-200/90 font-mono text-[11px] overflow-x-auto max-h-72">
                {JSON.stringify(inspectingLog.payload, null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setInspectingLog(null)}
                className="h-9 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
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
