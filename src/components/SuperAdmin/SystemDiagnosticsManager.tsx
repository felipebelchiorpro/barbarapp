import React, { useState, useMemo, useEffect } from 'react';
import {
  WarningOctagon,
  CheckCircle,
  Clock,
  Funnel,
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
  ShieldCheck,
  Sparkle,
  Trash,
  SlidersHorizontal,
  Info,
} from '@phosphor-icons/react';
import {
  SystemErrorLog,
  SystemErrorLevel,
  SystemErrorModule,
  SystemErrorTechnicalDetails,
  TenantConfig,
} from '../../types';
import {
  getSystemErrorLogs,
  toggleResolveSystemError,
  bulkResolveSystemErrors,
  clearSystemErrorLogs,
  resetSystemErrorLogsToDefault,
  logSystemError,
} from '../../services/systemErrorLogService';
import { formatDatePtBR } from '../../utils/formatters';
import { WhatsAppIcon } from '../WhatsAppIcon';

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
  const [isSimulating, setIsSimulating] = useState(false);

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

      // Busca por Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = (log.mensagem_erro || '').toLowerCase();
        const tenantName = (log.barbearia_nome || '').toLowerCase();
        const tenantId = (log.barbearia_id || '').toLowerCase();
        const details = typeof log.detalhes_tecnicos === 'string'
          ? log.detalhes_tecnicos.toLowerCase()
          : JSON.stringify(log.detalhes_tecnicos || {}).toLowerCase();

        return msg.includes(q) || tenantName.includes(q) || tenantId.includes(q) || details.includes(q);
      }

      return true;
    });
  }, [logs, tenantFilter, moduleFilter, levelFilter, statusFilter, searchQuery]);

  // Alterna resolução
  const handleToggleResolve = async (logId: string) => {
    const updated = await toggleResolveSystemError(logId);
    if (updated) {
      refreshLogs();
      if (selectedLog && selectedLog.id === logId) {
        setSelectedLog(updated);
      }
    }
  };

  // Resolver todos os abertos visíveis
  const handleResolveAllVisible = async () => {
    const openIds = filteredLogs.filter((l) => !l.resolvido).map((l) => l.id);
    if (openIds.length === 0) return;
    await bulkResolveSystemErrors(openIds);
    refreshLogs();
  };

  // Copia stack trace
  const handleCopyStack = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedStack(true);
      setTimeout(() => setCopiedStack(false), 2000);
    }
  };

  // Disparar erro de simulação para testes
  const handleSimulateError = async (type: 'evolution' | 'pdv' | 'faturacao' | 'runtime') => {
    setIsSimulating(true);
    try {
      const sampleTenant = tenants[0] || { id: 'tenant-barbearia-ls', name: 'Naville Barber' };

      if (type === 'evolution') {
        await logSystemError({
          barbearia_id: sampleTenant.id,
          barbearia_nome: sampleTenant.name,
          nivel: 'erro_api',
          modulo: 'evolution_api',
          mensagem_erro: `Evolution API Connection Timeout (504): Falha ao sincronizar webhook com instância '${sampleTenant.slug || 'matriz'}'`,
          detalhes_tecnicos: {
            endpoint: `https://api.evolution.local/message/sendText/${sampleTenant.slug || 'matriz'}`,
            httpStatus: 504,
            errorName: 'TimeoutException',
            stackTrace: `TimeoutException: WhatsApp instance didn't acknowledge message within 8000ms\n    at dispatchEvolutionWebhook (webpack:///src/services/webhookService.ts:130:15)\n    at triggerEvolutionPing (webpack:///src/App.tsx:840:11)`,
          },
          showToast: true,
          toastMessage: 'Instabilidade na Evolution API detectada e registrada com sucesso no diagnóstico.',
        });
      } else if (type === 'pdv') {
        await logSystemError({
          barbearia_id: sampleTenant.id,
          barbearia_nome: sampleTenant.name,
          nivel: 'critico',
          modulo: 'pdv_checkout',
          mensagem_erro: 'Falha no Fechamento de Comanda: Conflito de transação simultânea no PDV',
          detalhes_tecnicos: {
            endpoint: '/api/pdv/checkout',
            httpStatus: 409,
            errorName: 'ConcurrentLockException',
            requestPayload: { comandaId: `CMD-${Math.floor(1000 + Math.random() * 9000)}`, valor: 85.0 },
            stackTrace: `ConcurrentLockException: Lock acquirement timed out for cash register\n    at closeComandaSession (webpack:///src/components/AdminPanel/ComandaSaleModal.tsx:430:9)`,
          },
          showToast: true,
          toastMessage: 'Ocorreu um erro no processamento do PDV. Dados preservados com segurança.',
        });
      } else if (type === 'faturacao') {
        await logSystemError({
          barbearia_id: sampleTenant.id,
          barbearia_nome: sampleTenant.name,
          nivel: 'aviso',
          modulo: 'faturacao',
          mensagem_erro: 'Invoice Ninja: Cobrança recorrente retornou status "em_processamento_bancario"',
          detalhes_tecnicos: {
            endpoint: '/api/invoice-ninja/charge',
            httpStatus: 202,
            errorName: 'PendingClearingWarning',
            stackTrace: `Warning: Pix clearing pending confirmation from central bank\n    at triggerInvoicePayment (webpack:///src/services/invoiceNinjaService.ts:240:8)`,
          },
        });
      } else {
        await logSystemError({
          barbearia_id: null,
          barbearia_nome: 'Global / Plataforma',
          nivel: 'critico',
          modulo: 'sistema_geral',
          mensagem_erro: 'Uncaught TypeError: Cannot read property "id" of null no módulo de renderização',
          detalhes_tecnicos: {
            errorName: 'TypeError',
            stackTrace: `TypeError: Cannot read properties of null (reading 'id')\n    at renderCustomerCard (webpack:///src/components/AdminPanel/CustomersManagementView.tsx:112:20)\n    at render (node_modules/react-dom/cjs/react-dom.production.min.js:189:24)`,
          },
          showToast: true,
          toastMessage: 'Instabilidade detectada. Ação interceptada silenciosamente sem travar a tela.',
        });
      }

      refreshLogs();
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper de badge por módulo
  const renderModuleBadge = (mod: SystemErrorModule) => {
    switch (mod) {
      case 'evolution_api':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
            <WhatsAppIcon variant="official" size={13} />
            <span>Evolution API</span>
          </span>
        );
      case 'pdv_checkout':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" weight="bold" />
            <span>PDV Checkout</span>
          </span>
        );
      case 'faturacao':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-[#D4AF37] border border-amber-500/20 inline-flex items-center gap-1">
            <Receipt className="w-3 h-3" weight="bold" />
            <span>Faturação</span>
          </span>
        );
      case 'agendamento':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 inline-flex items-center gap-1">
            <CalendarCheck className="w-3 h-3" weight="bold" />
            <span>Agendamento</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 inline-flex items-center gap-1">
            <TerminalWindow className="w-3 h-3" weight="bold" />
            <span>Sistema Geral</span>
          </span>
        );
    }
  };

  // Helper de badge por nível
  const renderLevelBadge = (level: SystemErrorLevel) => {
    switch (level) {
      case 'critico':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            <span>Crítico</span>
          </span>
        );
      case 'erro_api':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>Erro API</span>
          </span>
        );
      case 'aviso':
      default:
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
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

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    return `Há ${diffDays}d`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Alerta se houver incidentes abertos */}
      {stats.open > 0 && (
        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <WarningOctagon className="w-6 h-6" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Atenção de Suporte Técnico
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 font-mono">
                  {stats.open} não resolvido(s)
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Existem {stats.critical} falhas críticas e {stats.apiErrors} erros de API pendentes de averiguação pela equipe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResolveAllVisible}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs font-semibold transition cursor-pointer"
            >
              Resolver Visíveis
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition border border-white/10 cursor-pointer"
            >
              Filtrar Apenas Abertos
            </button>
          </div>
        </div>
      )}

      {/* Header & Descrição da Seção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Bug className="w-3.5 h-3.5" weight="bold" /> Central de Diagnóstico
            </span>
            <span className="text-xs text-zinc-400 font-mono">Telemetria & Erros por Barbearia</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
            Logs de Incidentes & Suporte Técnico
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Captura silenciosa de falhas da Evolution API, timeouts, crashes de renderização e exceções de pagamento sem impacto visual ao usuário final.
          </p>
        </div>

        {/* Controles de Atualização e Ações Globais */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refreshLogs}
            className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            title="Atualizar logs"
          >
            <ArrowsClockwise className="w-4 h-4 text-amber-400" weight="bold" />
            <span>Atualizar</span>
          </button>

          <button
            onClick={resetSystemErrorLogsToDefault}
            className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            title="Recarregar dados de exemplo"
          >
            <Sparkle className="w-4 h-4 text-purple-400" weight="regular" />
            <span>Mocks Padrão</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja limpar todos os logs técnicos?')) {
                clearSystemErrorLogs();
                refreshLogs();
              }
            }}
            className="h-9 px-3 rounded-xl bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-xs font-semibold transition cursor-pointer"
            title="Limpar logs"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards de Telemetria Técnica */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Ocorrências */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Incidentes</span>
          <div className="text-2xl font-bold font-mono text-white">{stats.total}</div>
          <span className="text-[10px] text-zinc-400 block">Histórico persistido</span>
        </div>

        {/* Não Resolvidos */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-red-500/20 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-red-400 block">Em Aberto</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{stats.open}</div>
          <span className="text-[10px] text-zinc-400 block">Aguardando análise</span>
        </div>

        {/* Críticos */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">Falhas Críticas</span>
          <div className="text-2xl font-bold font-mono text-amber-300">{stats.critical}</div>
          <span className="text-[10px] text-zinc-400 block">PDV ou Runtime</span>
        </div>

        {/* Erros de API */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-purple-400 block">Erros de API</span>
          <div className="text-2xl font-bold font-mono text-purple-300">{stats.apiErrors}</div>
          <span className="text-[10px] text-zinc-400 block">Evolution / Webhooks</span>
        </div>

        {/* Taxa de Resolução */}
        <div className="p-4 rounded-2xl bg-[#18181B] border border-emerald-500/20 space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Taxa Resolução</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats.resolutionRate.toFixed(0)}%
          </div>
          <span className="text-[10px] text-zinc-400 block">{stats.resolved} baixas efetuadas</span>
        </div>
      </div>

      {/* Barra de Simulação Rápida para QA / Demonstração */}
      <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Sparkle className="w-4 h-4 text-[#D4AF37]" weight="bold" />
          <strong className="text-zinc-200">Simulador de QA:</strong>
          <span>Dispare incidentes de teste para validar a captura silenciosa e visualização técnica:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleSimulateError('evolution')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
          >
            + Falha Evolution API
          </button>
          <button
            onClick={() => handleSimulateError('pdv')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
          >
            + Erro no PDV
          </button>
          <button
            onClick={() => handleSimulateError('faturacao')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#D4AF37] border border-amber-500/20 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
          >
            + Falha Faturação
          </button>
          <button
            onClick={() => handleSimulateError('runtime')}
            disabled={isSimulating}
            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
          >
            + Crash de Runtime
          </button>
        </div>
      </div>

      {/* Filtros da Tabela */}
      <div className="p-4 rounded-2xl bg-[#18181B] border border-white/5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Busca por Texto */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em mensagens, stack trace, endpoints..."
              className="w-full h-9 pl-8 pr-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
            />
            <MagnifyingGlass className="w-4 h-4 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Filtros em Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Barbearia */}
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-zinc-300 text-xs focus:outline-none focus:border-[#D4AF37] cursor-pointer"
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
              className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-zinc-300 text-xs focus:outline-none focus:border-[#D4AF37] cursor-pointer"
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
              className="h-9 px-3 rounded-xl bg-black/40 border border-white/10 text-zinc-300 text-xs focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">Todos os Níveis</option>
              <option value="critico">Crítico</option>
              <option value="erro_api">Erro de API</option>
              <option value="aviso">Aviso</option>
            </select>

            {/* Status */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10">
              <button
                onClick={() => setStatusFilter('open')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'open'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Abertos ({logs.filter((l) => !l.resolvido).length})
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'resolved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Resolvidos ({logs.filter((l) => l.resolvido).length})
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#D4AF37] text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todos ({logs.length})
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Incidentes */}
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#141416] text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-white/5">
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
            <tbody className="divide-y divide-white/5 bg-[#18181B]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" weight="duotone" />
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
                      className={`hover:bg-white/[0.02] transition ${
                        !log.resolvido ? 'border-l-2 border-l-red-500/70' : ''
                      }`}
                    >
                      {/* Data / Hora */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="font-mono text-zinc-200 font-semibold">
                          {formatTimeAgo(log.data_hora)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {formatDatePtBR(log.data_hora.split('T')[0])} {log.data_hora.split('T')[1]?.substring(0, 5)}
                        </div>
                      </td>

                      {/* Barbearia */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-white text-xs">
                          {tenantDisplayName}
                        </div>
                        {log.barbearia_id ? (
                          <div className="text-[10px] text-zinc-500 font-mono">
                            ID: {log.barbearia_id}
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic">Geral / Sem tenant</span>
                        )}
                      </td>

                      {/* Módulo */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {renderModuleBadge(log.modulo)}
                      </td>

                      {/* Nível */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {renderLevelBadge(log.nivel)}
                      </td>

                      {/* Mensagem Resumida */}
                      <td className="py-3.5 px-3.5 max-w-xs md:max-w-md">
                        <div className="text-zinc-200 font-medium truncate" title={log.mensagem_erro}>
                          {log.mensagem_erro}
                        </div>
                        {typeof log.detalhes_tecnicos === 'object' && log.detalhes_tecnicos?.endpoint && (
                          <div className="text-[10px] text-zinc-500 font-mono truncate">
                            {log.detalhes_tecnicos.endpoint}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        {log.resolvido ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" weight="bold" />
                            <span>Resolvido</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            <span>Aberto</span>
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer border border-white/5"
                          >
                            Inspecionar
                          </button>

                          <button
                            onClick={() => handleToggleResolve(log.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                              log.resolvido
                                ? 'bg-zinc-900 text-zinc-400 hover:text-white border-white/5'
                                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30'
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#141416] border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#18181B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37]">
                  <Bug className="w-5 h-5" weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono">{selectedLog.id}</span>
                    {renderLevelBadge(selectedLog.nivel)}
                    {renderModuleBadge(selectedLog.modulo)}
                  </div>
                  <span className="text-xs text-zinc-400">
                    Registrado em {new Date(selectedLog.data_hora).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Técnico com Scroll */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Status & Barbearia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Estabelecimento Afetado</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {selectedLog.barbearia_nome || 'Global / Sem barbearia específica'}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    ID: {selectedLog.barbearia_id || 'null'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Estado de Resolução</span>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedLog.resolvido ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" weight="bold" />
                        <span>Resolvido por {selectedLog.resolvido_por || 'superadmin'}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                        <WarningOctagon className="w-3.5 h-3.5" weight="bold" />
                        <span>Incidente Aberto / Requer Análise</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mensagem de Erro Principal */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Mensagem do Erro</span>
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200 font-medium">
                  {selectedLog.mensagem_erro}
                </div>
              </div>

              {/* Informações de Ambiente / Cliente */}
              {typeof selectedLog.detalhes_tecnicos === 'object' && selectedLog.detalhes_tecnicos?.ambiente && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Informações de Ambiente</span>
                  <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1.5 text-zinc-300 font-mono text-[11px]">
                    <div>
                      <strong className="text-zinc-500">URL: </strong>
                      <span className="text-[#D4AF37]">{selectedLog.detalhes_tecnicos.ambiente.url}</span>
                    </div>
                    <div>
                      <strong className="text-zinc-500">Dispositivo: </strong>
                      <span>{selectedLog.detalhes_tecnicos.ambiente.dispositivo} ({selectedLog.detalhes_tecnicos.ambiente.screenSize || 'N/A'})</span>
                    </div>
                    <div className="truncate">
                      <strong className="text-zinc-500">User Agent: </strong>
                      <span className="text-zinc-400">{selectedLog.detalhes_tecnicos.ambiente.userAgent}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stack Trace Técnico */}
              {typeof selectedLog.detalhes_tecnicos === 'object' &&
                selectedLog.detalhes_tecnicos !== null &&
                'stackTrace' in selectedLog.detalhes_tecnicos &&
                selectedLog.detalhes_tecnicos.stackTrace && (() => {
                  const stack = (selectedLog.detalhes_tecnicos as SystemErrorTechnicalDetails).stackTrace || '';
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">
                          Stack Trace Técnico
                        </span>
                        <button
                          onClick={() => handleCopyStack(stack)}
                          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedStack ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedStack ? 'Copiado!' : 'Copiar Stack'}</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-black border border-white/10 text-red-300/90 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed max-h-48">
                        {stack}
                      </pre>
                    </div>
                  );
                })()}

              {/* Payload da Requisição / Endpoint se disponível */}
              {typeof selectedLog.detalhes_tecnicos === 'object' && (selectedLog.detalhes_tecnicos?.endpoint || selectedLog.detalhes_tecnicos?.requestPayload) && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">
                    Detalhes da Requisição & Endpoint
                  </span>
                  <pre className="p-3 rounded-xl bg-black border border-white/10 text-emerald-300 font-mono text-[11px] overflow-x-auto whitespace-pre max-h-40">
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

              {/* Notas de Suporte */}
              {selectedLog.notas_suporte && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                  <strong className="block text-[10px] uppercase font-bold">Nota de Resolução:</strong>
                  <p className="mt-0.5">{selectedLog.notas_suporte}</p>
                </div>
              )}
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="p-4 border-t border-white/10 bg-[#18181B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleResolve(selectedLog.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    selectedLog.resolvido
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  <Check className="w-4 h-4" weight="bold" />
                  <span>{selectedLog.resolvido ? 'Reabrir Incidente' : 'Marcar como Resolvido'}</span>
                </button>

                {selectedLog.barbearia_id && (
                  <button
                    onClick={() => {
                      onSelectTenant(selectedLog.barbearia_id!);
                      onNavigateTenantAdmin(selectedLog.barbearia_id!);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowSquareOut className="w-4 h-4" />
                    <span>Ver Painel da Barbearia</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
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
