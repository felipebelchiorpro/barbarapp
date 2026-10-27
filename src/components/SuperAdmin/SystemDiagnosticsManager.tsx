import React, { useState, useMemo, useEffect } from 'react';
import {
  WarningOctagon,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  ArrowsClockwise,
  Receipt,
  ShoppingCart,
  CalendarCheck,
  TerminalWindow,
  Copy,
  Check,
  ArrowSquareOut,
  X,
  Bug,
  Trash,
} from '@phosphor-icons/react';
import {
  SystemErrorLog,
  SystemErrorLevel,
  SystemErrorTechnicalDetails,
  TenantConfig,
} from '../../types';
import {
  getSystemErrorLogs,
  toggleResolveSystemError,
  bulkResolveSystemErrors,
  clearSystemErrorLogs,
} from '../../services/systemErrorLogService';
import { formatDatePtBR } from '../../utils/formatters';

interface SystemDiagnosticsManagerProps {
  tenants: TenantConfig[];
  onSelectTenant: (tenantId: string) => void;
  onNavigateTenantAdmin: (tenantId: string) => void;
}

export const SystemDiagnosticsManager: React.FC<SystemDiagnosticsManagerProps> = ({
  tenants,
  onSelectTenant,
  onNavigateTenantAdmin,
}) => {
  const [logs, setLogs] = useState<SystemErrorLog[]>(() => getSystemErrorLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [selectedLog, setSelectedLog] = useState<SystemErrorLog | null>(null);
  const [copiedStack, setCopiedStack] = useState(false);

  // Escuta atualizações reativas de novos erros
  useEffect(() => {
    const handleUpdate = () => {
      setLogs(getSystemErrorLogs());
    };
    window.addEventListener('naville:error-logs-updated' as any, handleUpdate);
    return () => {
      window.removeEventListener('naville:error-logs-updated' as any, handleUpdate);
    };
  }, []);

  const refreshLogs = () => {
    setLogs(getSystemErrorLogs());
  };

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const total = logs.length;
    const open = logs.filter((l) => !l.resolvido).length;
    const resolved = logs.filter((l) => l.resolvido).length;
    const critical = logs.filter((l) => l.nivel === 'critico' && !l.resolvido).length;
    const apiErrors = logs.filter((l) => l.nivel === 'erro_api' && !l.resolvido).length;
    const resolutionRate = total > 0 ? (resolved / total) * 100 : 100;

    return { total, open, resolved, critical, apiErrors, resolutionRate };
  }, [logs]);

  // Logs filtrados
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtro de Tenant
      if (tenantFilter !== 'all') {
        if (tenantFilter === 'global' && log.barbearia_id !== null) return false;
        if (tenantFilter !== 'global' && log.barbearia_id !== tenantFilter) return false;
      }

      // Filtro de Módulo
      if (moduleFilter !== 'all' && log.modulo !== moduleFilter) {
        return false;
      }

      // Filtro de Nível
      if (levelFilter !== 'all' && log.nivel !== levelFilter) {
        return false;
      }

      // Filtro de Status
      if (statusFilter === 'open' && log.resolvido) return false;
      if (statusFilter === 'resolved' && !log.resolvido) return false;

      // Busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = log.mensagem_erro.toLowerCase().includes(q);
        const matchesTenantName = (log.barbearia_nome || '').toLowerCase().includes(q);
        const matchesId = log.id.toLowerCase().includes(q);
        const matchesStack = typeof log.detalhes_tecnicos === 'object' &&
          'stackTrace' in (log.detalhes_tecnicos || {}) &&
          ((log.detalhes_tecnicos as SystemErrorTechnicalDetails).stackTrace || '').toLowerCase().includes(q);

        return matchesMsg || matchesTenantName || matchesId || matchesStack;
      }

      return true;
    });
  }, [logs, tenantFilter, moduleFilter, levelFilter, statusFilter, searchQuery]);

  // Ação de Resolver / Reabrir
  const handleToggleResolve = (logId: string) => {
    toggleResolveSystemError(logId, 'superadmin');
    refreshLogs();
    if (selectedLog && selectedLog.id === logId) {
      setSelectedLog((prev) => (prev ? { ...prev, resolvido: !prev.resolvido } : null));
    }
  };

  // Resolver todos visíveis
  const handleResolveAllVisible = () => {
    const openVisibleIds = filteredLogs.filter((l) => !l.resolvido).map((l) => l.id);
    if (openVisibleIds.length === 0) return;
    bulkResolveSystemErrors(openVisibleIds);
    refreshLogs();
  };

  // Copiar Stack Trace
  const handleCopyStack = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStack(true);
    setTimeout(() => setCopiedStack(false), 2000);
  };

  // Helper de badge por módulo
  const renderModuleBadge = (modulo: string) => {
    switch (modulo) {
      case 'evolution_api':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 inline-flex items-center gap-1">
            <span>Evolution API</span>
          </span>
        );
      case 'pdv_checkout':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/40 inline-flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            <span>PDV Checkout</span>
          </span>
        );
      case 'faturacao':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 inline-flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            <span>Faturação</span>
          </span>
        );
      case 'agendamento':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/40 inline-flex items-center gap-1">
            <CalendarCheck className="w-3 h-3" />
            <span>Agendamento</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 inline-flex items-center gap-1">
            <TerminalWindow className="w-3 h-3" />
            <span>Sistema</span>
          </span>
        );
    }
  };

  // Helper de badge por nível
  const renderLevelBadge = (level: SystemErrorLevel) => {
    switch (level) {
      case 'critico':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Crítico</span>
          </span>
        );
      case 'erro_api':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/40 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>Erro API</span>
          </span>
        );
      case 'aviso':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Aviso</span>
          </span>
        );
    }
  };

  // Formata tempo relativo
  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    return `Há ${diffDays}d`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Alerta se houver incidentes abertos */}
      {stats.open > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 border border-rose-200 dark:bg-rose-900/40 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <WarningOctagon className="w-5 h-5" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Incidentes Técnicos
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-rose-200/60 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
                  {stats.open} pendente(s)
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                Existem {stats.critical} falhas críticas e {stats.apiErrors} erros de API pendentes de averiguação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResolveAllVisible}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition cursor-pointer shadow-xs"
            >
              Resolver Visíveis
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium transition border border-slate-200 dark:border-zinc-800 cursor-pointer shadow-xs"
            >
              Filtrar Abertos
            </button>
          </div>
        </div>
      )}

      {/* Header & Descrição da Seção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 flex items-center gap-1">
              <Bug className="w-3.5 h-3.5" /> Auditoria Técnica
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">Telemetria & Erros</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight mt-1">
            Logs de Incidentes & Diagnóstico
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-2xl">
            Monitoramento de falhas de rede, requisições de API, timeouts e exceções silenciosas do sistema.
          </p>
        </div>

        {/* Controles de Atualização e Ações Globais */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refreshLogs}
            className="h-8 px-3 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Atualizar logs"
          >
            <ArrowsClockwise className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => {
              clearSystemErrorLogs();
              refreshLogs();
            }}
            className="h-8 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Limpar histórico de incidentes"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>Limpar Logs</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Telemetria Técnica */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Ocorrências */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-zinc-400 block">Total Incidentes</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-zinc-100">{stats.total}</div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Histórico persistido</span>
        </div>

        {/* Não Resolvidos */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-medium text-rose-600 dark:text-rose-400 block">Em Aberto</span>
            {stats.open > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">{stats.open}</div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Aguardando análise</span>
        </div>

        {/* Críticos */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-medium text-amber-600 dark:text-amber-400 block">Falhas Críticas</span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.critical}</div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">PDV ou Runtime</span>
        </div>

        {/* Erros de API */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-medium text-purple-600 dark:text-purple-400 block">Erros de API</span>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">{stats.apiErrors}</div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Evolution / Webhooks</span>
        </div>

        {/* Taxa de Resolução */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-medium text-emerald-600 dark:text-emerald-400 block">Taxa Resolução</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.resolutionRate.toFixed(0)}%
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">{stats.resolved} baixas efetuadas</span>
        </div>
      </div>

      {/* Filtros da Tabela */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-[#121215] dark:border-zinc-800 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Busca por Texto */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em mensagens, stack trace, endpoints..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600"
            />
            <MagnifyingGlass className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Filtros em Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Barbearia */}
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600 cursor-pointer"
            >
              <option value="all">Todas as Barbearias</option>
              <option value="global">Global / Sem Tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Módulo */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600 cursor-pointer"
            >
              <option value="all">Todos os Módulos</option>
              <option value="evolution_api">Evolution API</option>
              <option value="pdv_checkout">PDV Checkout</option>
              <option value="faturacao">Faturação & Invoices</option>
              <option value="agendamento">Agendamento</option>
              <option value="sistema_geral">Sistema Geral</option>
            </select>

            {/* Nível */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-8 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600 cursor-pointer"
            >
              <option value="all">Todos os Níveis</option>
              <option value="critico">Crítico</option>
              <option value="erro_api">Erro de API</option>
              <option value="aviso">Aviso</option>
            </select>

            {/* Status */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setStatusFilter('open')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  statusFilter === 'open'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                Abertos ({logs.filter((l) => !l.resolvido).length})
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  statusFilter === 'resolved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                Resolvidos ({logs.filter((l) => l.resolvido).length})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs font-semibold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                Todos ({logs.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Incidentes */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-zinc-300">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-[10px] uppercase font-medium tracking-wider text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-3.5">Data / Hora</th>
                <th className="py-3 px-3.5">Barbearia Afetada</th>
                <th className="py-3 px-3.5">Módulo</th>
                <th className="py-3 px-3.5">Nível</th>
                <th className="py-3 px-3.5">Mensagem Resumida</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 bg-white dark:bg-[#121215]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-zinc-500">
                    <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                    Nenhum incidente encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const associatedTenant = tenants.find((t) => t.id === log.barbearia_id);
                  const tenantDisplayName = log.barbearia_nome || associatedTenant?.name || (log.barbearia_id ? log.barbearia_id : 'Global / Plataforma');

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition ${
                        !log.resolvido ? 'border-l-2 border-l-rose-500' : ''
                      }`}
                    >
                      {/* Data / Hora */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-mono text-slate-800 dark:text-zinc-200 font-medium">
                          {formatTimeAgo(log.data_hora)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                          {formatDatePtBR(log.data_hora.split('T')[0])} {log.data_hora.split('T')[1]?.substring(0, 5)}
                        </div>
                      </td>

                      {/* Barbearia */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900 dark:text-zinc-100 text-xs">
                          {tenantDisplayName}
                        </div>
                        {log.barbearia_id && (
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            ID: {log.barbearia_id}
                          </div>
                        )}
                      </td>

                      {/* Módulo */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {renderModuleBadge(log.modulo)}
                      </td>

                      {/* Nível */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {renderLevelBadge(log.nivel)}
                      </td>

                      {/* Mensagem Resumida */}
                      <td className="py-3 px-3.5 max-w-xs md:max-w-md">
                        <div className="text-slate-800 dark:text-zinc-200 font-medium truncate" title={log.mensagem_erro}>
                          {log.mensagem_erro}
                        </div>
                        {typeof log.detalhes_tecnicos === 'object' && log.detalhes_tecnicos?.endpoint && (
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono truncate">
                            {log.detalhes_tecnicos.endpoint}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {log.resolvido ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Resolvido</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Aberto</span>
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium transition cursor-pointer border border-slate-200 dark:border-zinc-700 shadow-xs"
                          >
                            Inspecionar
                          </button>

                          <button
                            onClick={() => handleToggleResolve(log.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
                              log.resolvido
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-800'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 dark:border-emerald-800/40'
                            }`}
                            title={log.resolvido ? 'Reabrir incidente' : 'Dar baixa como resolvido'}
                          >
                            {log.resolvido ? 'Reabrir' : 'Dar Baixa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Gaveta de Inspeção Técnica Detalhada */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300">
                  <Bug className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-900 dark:text-zinc-100">{selectedLog.id}</span>
                    {renderLevelBadge(selectedLog.nivel)}
                    {renderModuleBadge(selectedLog.modulo)}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Registrado em {new Date(selectedLog.data_hora).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Técnico */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {/* Estabelecimento & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-zinc-400 block">Estabelecimento</span>
                  <div className="font-semibold text-slate-900 dark:text-zinc-100 mt-0.5">
                    {selectedLog.barbearia_nome || 'Global / Plataforma'}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                    ID: {selectedLog.barbearia_id || 'null'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-zinc-400 block">Status</span>
                  <div className="mt-1">
                    {selectedLog.resolvido ? (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 inline-flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Resolvido por {selectedLog.resolvido_por || 'superadmin'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 inline-flex items-center gap-1">
                        <WarningOctagon className="w-3 h-3" />
                        <span>Aberto</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mensagem de Erro Principal */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-zinc-400">Mensagem do Erro</span>
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 font-medium">
                  {selectedLog.mensagem_erro}
                </div>
              </div>

              {/* Stack Trace Técnico */}
              {typeof selectedLog.detalhes_tecnicos === 'object' &&
                selectedLog.detalhes_tecnicos !== null &&
                'stackTrace' in selectedLog.detalhes_tecnicos &&
                selectedLog.detalhes_tecnicos.stackTrace && (() => {
                  const stack = (selectedLog.detalhes_tecnicos as SystemErrorTechnicalDetails).stackTrace || '';
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-zinc-400">
                          Stack Trace Técnico
                        </span>
                        <button
                          onClick={() => handleCopyStack(stack)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedStack ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedStack ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-900 text-rose-300 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed max-h-48">
                        {stack}
                      </pre>
                    </div>
                  );
                })()}

              {/* Detalhes de Requisição / Endpoint */}
              {typeof selectedLog.detalhes_tecnicos === 'object' && (selectedLog.detalhes_tecnicos?.endpoint || selectedLog.detalhes_tecnicos?.requestPayload) && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-medium text-slate-500 dark:text-zinc-400">
                    Detalhes da Requisição
                  </span>
                  <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre max-h-40">
                    {JSON.stringify(
                      {
                        endpoint: selectedLog.detalhes_tecnicos?.endpoint,
                        httpStatus: selectedLog.detalhes_tecnicos?.httpStatus,
                        errorName: selectedLog.detalhes_tecnicos?.errorName,
                        requestPayload: selectedLog.detalhes_tecnicos?.requestPayload,
                        responseBody: selectedLog.detalhes_tecnicos?.responseBody,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between gap-2">
              <button
                onClick={() => handleToggleResolve(selectedLog.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  selectedLog.resolvido
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{selectedLog.resolvido ? 'Reabrir Incidente' : 'Marcar como Resolvido'}</span>
              </button>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs font-medium transition cursor-pointer"
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
