/**
 * Sistema de Captura Silenciosa de Erros, Telemetria e Logs por Barbearia
 * Arquitetura SaaS Naville — Central de Diagnóstico do Super Admin
 */

import {
  SystemErrorLog,
  SystemErrorLevel,
  SystemErrorModule,
  SystemErrorEnvironment,
  SystemErrorTechnicalDetails,
} from '../types';
import { syncSystemErrorLogToPocketBase, updateSystemErrorLogResolutionInPocketBase } from './pocketbaseSchema';
import { redactSensitiveData } from '../utils/logRedactor';

const STORAGE_KEY = 'naville_system_error_logs_v1';
const TOAST_EVENT_NAME = 'naville:user-friendly-toast';
const LOG_UPDATED_EVENT_NAME = 'naville:error-logs-updated';

/**
 * Logs iniciais para demonstração realista de suporte técnico multi-tenant
 */
export const INITIAL_SYSTEM_ERROR_LOGS: SystemErrorLog[] = [
  {
    id: 'err-evo-9821',
    barbearia_id: 'tenant-navalha-ouro',
    barbearia_nome: 'Navalha de Ouro',
    nivel: 'erro_api',
    modulo: 'evolution_api',
    mensagem_erro: 'Evolution API Timeout (504): Instância navalha-ouro desconectou durante disparo de comprovante WhatsApp',
    detalhes_tecnicos: {
      httpStatus: 504,
      endpoint: 'https://api.evolution.local/message/sendText/navalha-ouro',
      errorName: 'GatewayTimeoutError',
      requestPayload: {
        number: '5511988887766',
        event: 'booking.created',
        bookingId: 'bk-novo-772',
      },
      responseBody: {
        status: 504,
        error: 'Gateway Timeout',
        message: 'WhatsApp socket closed unexpectedly. Session marked as QR_RESTART required.',
      },
      stackTrace: `Error: Evolution API Gateway Timeout (504)
    at dispatchEvolutionWebhook (webpack:///src/services/webhookService.ts:130:15)
    at async handleCreateBooking (webpack:///src/App.tsx:612:9)
    at async HTMLButtonElement.dispatch (node_modules/react-dom/cjs/react-dom.production.min.js:241:12)`,
      ambiente: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        url: 'https://naville.app/navalha-ouro',
        path: '/navalha-ouro',
        dispositivo: 'Mobile (iOS)',
        screenSize: '390x844',
      },
    },
    usuario_id: 'usr-cli-8192',
    resolvido: false,
    data_hora: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // Há 35 minutos
  },
  {
    id: 'err-pdv-4102',
    barbearia_id: 'tenant-barbearia-ls',
    barbearia_nome: 'Naville Barber (Matriz)',
    nivel: 'critico',
    modulo: 'pdv_checkout',
    mensagem_erro: 'Falha de Validação na Comanda #CMD-9021: Total divergente entre itens e forma de pagamento',
    detalhes_tecnicos: {
      httpStatus: 422,
      endpoint: '/api/pdv/fechar-comanda',
      errorName: 'UnprocessableEntityError',
      requestPayload: {
        comandaId: 'CMD-9021',
        itens: [{ id: 'srv-1', nome: 'Cabelo', valor: 40 }],
        valorPago: 35.0,
        divergencia: -5.0,
      },
      stackTrace: `ValidationError: Total pago R$ 35,00 não coincide com total líquido da comanda R$ 40,00
    at validateComandaClosing (webpack:///src/components/AdminPanel/ComandaSaleModal.tsx:410:11)
    at handleSubmit (webpack:///src/components/AdminPanel/ComandaSaleModal.tsx:520:7)
    at Object.onClick (webpack:///src/components/AdminPanel/ComandaSaleModal.tsx:645:15)`,
      ambiente: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36',
        url: 'https://naville.app/admin?tab=pdv',
        path: '/admin',
        dispositivo: 'Desktop (Windows)',
        screenSize: '1920x1080',
      },
    },
    usuario_id: 'usr-barbeiro-diego',
    resolvido: false,
    data_hora: new Date(Date.now() - 1000 * 60 * 110).toISOString(), // Há ~2 horas
  },
  {
    id: 'err-fat-3019',
    barbearia_id: 'tenant-vintage-club',
    barbearia_nome: 'Vintage Club Barbershop',
    nivel: 'aviso',
    modulo: 'faturacao',
    mensagem_erro: 'Invoice Ninja Webhook: Assinatura de webhook expirada ou payload corrompido',
    detalhes_tecnicos: {
      httpStatus: 400,
      endpoint: '/api/webhooks/invoice-ninja',
      errorName: 'SignatureVerificationFailed',
      requestPayload: {
        event: 'invoice.payment_failed',
        client_id: 'ninja_cli_9901',
      },
      stackTrace: `SecurityError: Webhook signature header x-ninja-signature does not match expected HMAC
    at verifyNinjaSignature (webpack:///src/services/invoiceNinjaService.ts:98:9)
    at processInvoiceNinjaWebhook (webpack:///src/services/invoiceNinjaService.ts:162:12)`,
      ambiente: {
        userAgent: 'InvoiceNinja-WebhookBot/5.8',
        url: 'https://naville.app/api/webhooks/invoice-ninja',
        path: '/api/webhooks/invoice-ninja',
        dispositivo: 'Server Webhook Bot',
        screenSize: 'N/A',
      },
    },
    usuario_id: null,
    resolvido: true,
    data_hora: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // Há 18 horas
    resolvido_em: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    resolvido_por: 'superadmin_suporte',
    notas_suporte: 'Chave de webhook atualizada e sincronizada com o painel do Invoice Ninja.',
  },
  {
    id: 'err-evo-2291',
    barbearia_id: 'tenant-alfa-men',
    barbearia_nome: 'Alfa Men Studio',
    nivel: 'erro_api',
    modulo: 'evolution_api',
    mensagem_erro: 'Evolution API (401 Unauthorized): API Key rejeitada pela instância alfa-men-prod',
    detalhes_tecnicos: {
      httpStatus: 401,
      endpoint: 'https://evolution.naville.pro/instance/connectionState/alfa-men',
      errorName: 'UnauthorizedError',
      stackTrace: `Error: Evolution API 401 Unauthorized - The global or instance apikey provided is invalid
    at getEvolutionConnectionState (webpack:///src/services/evolutionApi.ts:66:13)
    at checkInstanceHealth (webpack:///src/components/AdminPanel/WhatsAppConnectionCard.tsx:142:18)`,
      ambiente: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0',
        url: 'https://naville.app/admin?tab=whatsapp',
        path: '/admin',
        dispositivo: 'Desktop (macOS)',
        screenSize: '1440x900',
      },
    },
    usuario_id: 'usr-admin-roberto',
    resolvido: false,
    data_hora: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // Há 4 horas
  },
  {
    id: 'err-sys-1029',
    barbearia_id: null,
    barbearia_nome: 'Global / Plataforma',
    nivel: 'aviso',
    modulo: 'sistema_geral',
    mensagem_erro: 'Unhandled Promise Rejection: Erro de conexão transitória ao verificar status do PocketBase',
    detalhes_tecnicos: {
      httpStatus: 0,
      endpoint: 'http://127.0.0.1:8090/api/health',
      errorName: 'NetworkError',
      stackTrace: `TypeError: Failed to fetch
    at checkPocketBaseHealth (webpack:///src/services/pocketbase.ts:13:28)
    at App.tsx:100:5`,
      ambiente: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0',
        url: 'https://naville.app/',
        path: '/',
        dispositivo: 'Desktop (Windows)',
        screenSize: '1920x1080',
      },
    },
    usuario_id: null,
    resolvido: true,
    data_hora: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    resolvido_em: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    resolvido_por: 'auto_healer',
    notas_suporte: 'Fallback local ativado com sucesso sem impacto ao usuário final.',
  },
];

/**
 * Detecta ambiente atual do navegador
 */
export function captureClientEnvironment(): SystemErrorEnvironment {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'Server-side / Node.js',
      url: 'N/A',
      dispositivo: 'Server',
    };
  }

  const userAgent = navigator.userAgent || 'Unknown';
  const url = window.location.href;
  const path = window.location.pathname;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const dispositivo = isMobile ? 'Mobile' : 'Desktop';
  const screenSize = `${window.innerWidth}x${window.innerHeight}`;

  return {
    userAgent,
    url,
    path,
    dispositivo,
    screenSize,
    appVersion: 'Naville SaaS v2.5.0',
  };
}

let memoryLogsCache: SystemErrorLog[] | null = null;

/**
 * Lê todos os logs persistidos no LocalStorage (com fallback para os mocks iniciais)
 */
export function getSystemErrorLogs(): SystemErrorLog[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SYSTEM_ERROR_LOGS));
        return INITIAL_SYSTEM_ERROR_LOGS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : INITIAL_SYSTEM_ERROR_LOGS;
    } catch (err) {
      console.warn('[SystemErrorLog] Erro ao carregar logs do localStorage:', err);
    }
  }

  if (!memoryLogsCache) {
    memoryLogsCache = [...INITIAL_SYSTEM_ERROR_LOGS];
  }
  return memoryLogsCache;
}

/**
 * Salva a lista de logs no LocalStorage e dispara evento reativo
 */
function saveSystemErrorLogs(logs: SystemErrorLog[]): void {
  memoryLogsCache = logs;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (err) {
      console.error('[SystemErrorLog] Erro ao salvar logs:', err);
    }
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(LOG_UPDATED_EVENT_NAME, { detail: { count: logs.length } }));
    } catch {
      // Ignora erro de dispatch em ambientes limitados
    }
  }
}

/**
 * Retorna contagem de incidentes não resolvidos
 */
export function getUnresolvedSystemErrorsCount(): number {
  const logs = getSystemErrorLogs();
  return logs.filter((l) => !l.resolvido).length;
}

/**
 * Retorna telemetria de erros para uma barbearia específica nas últimas X horas
 */
export function getTenantRecentErrorsCount(
  tenantId: string,
  hours = 24
): { total: number; unresolved: number } {
  const logs = getSystemErrorLogs();
  const threshold = Date.now() - hours * 60 * 60 * 1000;

  const tenantLogs = logs.filter((l) => {
    if (l.barbearia_id !== tenantId) return false;
    const time = new Date(l.data_hora).getTime();
    return time >= threshold;
  });

  return {
    total: tenantLogs.length,
    unresolved: tenantLogs.filter((l) => !l.resolvido).length,
  };
}

export interface LogSystemErrorParams {
  barbearia_id?: string | null;
  barbearia_nome?: string;
  nivel: SystemErrorLevel;
  modulo: SystemErrorModule;
  mensagem_erro: string;
  detalhes_tecnicos?: SystemErrorTechnicalDetails | string;
  usuario_id?: string | null;
  showToast?: boolean;
  toastMessage?: string;
}

/**
 * Registra um erro de forma 100% silenciosa e assíncrona (não-bloqueante)
 * - Nunca quebra a execução do chamador
 * - Persiste no LocalStorage e sincroniza com PocketBase
 * - Dispara toast amigável se solicitado (sem jargão técnico)
 */
export async function logSystemError(params: LogSystemErrorParams): Promise<SystemErrorLog> {
  const env = captureClientEnvironment();

  // Normaliza detalhes técnicos
  let techDetails: SystemErrorTechnicalDetails = {};
  if (typeof params.detalhes_tecnicos === 'string') {
    techDetails = { stackTrace: params.detalhes_tecnicos, ambiente: env };
  } else if (params.detalhes_tecnicos && typeof params.detalhes_tecnicos === 'object') {
    techDetails = {
      ...params.detalhes_tecnicos,
      ambiente: params.detalhes_tecnicos.ambiente || env,
    };
  } else {
    techDetails = { ambiente: env };
  }

  // [14] Redação automática de dados sensíveis (cartões, senhas, tokens)
  const safeMessage = redactSensitiveData(params.mensagem_erro);
  const safeDetails = redactSensitiveData(techDetails);

  const newLog: SystemErrorLog = {
    id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    barbearia_id: params.barbearia_id !== undefined ? params.barbearia_id : null,
    barbearia_nome: params.barbearia_nome,
    nivel: params.nivel,
    modulo: params.modulo,
    mensagem_erro: safeMessage,
    detalhes_tecnicos: safeDetails,
    usuario_id: params.usuario_id || null,
    resolvido: false,
    data_hora: new Date().toISOString(),
  };

  // 1. Persistência local imediata
  try {
    const current = getSystemErrorLogs();
    // Limita tamanho total para no máximo 150 ocorrências mais recentes
    const updated = [newLog, ...current].slice(0, 150);
    saveSystemErrorLogs(updated);
  } catch (err) {
    console.warn('[SystemErrorLog] Falha ao persistir erro localmente:', err);
  }

  // 2. Dispara notificação sutil e amigável para o usuário final (se solicitado)
  if (params.showToast && typeof window !== 'undefined') {
    const friendlyMessage =
      params.toastMessage ||
      'Não foi possível concluir a ação no momento. Tente novamente em instantes.';
    window.dispatchEvent(
      new CustomEvent(TOAST_EVENT_NAME, {
        detail: {
          message: friendlyMessage,
          level: params.nivel,
        },
      })
    );
  }

  // 3. Sincronização assíncrona não-bloqueante com PocketBase
  setTimeout(() => {
    syncSystemErrorLogToPocketBase(newLog).catch((err) => {
      // Ignora erro de rede silenciosamente
      console.debug('[SystemErrorLog] PocketBase offline, fallback local ativo:', err);
    });
  }, 0);

  return newLog;
}

/**
 * Alterna status de resolução de um log de erro
 */
export async function toggleResolveSystemError(
  id: string,
  notas?: string,
  resolvidoPor = 'superadmin'
): Promise<SystemErrorLog | null> {
  const logs = getSystemErrorLogs();
  const index = logs.findIndex((l) => l.id === id);
  if (index === -1) return null;

  const target = logs[index];
  const nextResolvido = !target.resolvido;

  const updatedLog: SystemErrorLog = {
    ...target,
    resolvido: nextResolvido,
    resolvido_em: nextResolvido ? new Date().toISOString() : undefined,
    resolvido_por: nextResolvido ? resolvidoPor : undefined,
    notas_suporte: notas !== undefined ? notas : target.notas_suporte,
  };

  logs[index] = updatedLog;
  saveSystemErrorLogs(logs);

  // Sync PocketBase em background
  setTimeout(() => {
    updateSystemErrorLogResolutionInPocketBase(
      id,
      nextResolvido,
      resolvidoPor,
      updatedLog.resolvido_em
    ).catch(() => {});
  }, 0);

  return updatedLog;
}

/**
 * Marca múltiplos logs como resolvidos de uma vez
 */
export async function bulkResolveSystemErrors(ids: string[]): Promise<void> {
  const logs = getSystemErrorLogs();
  const idSet = new Set(ids);
  const now = new Date().toISOString();

  const updated = logs.map((l) => {
    if (idSet.has(l.id)) {
      return {
        ...l,
        resolvido: true,
        resolvido_em: now,
        resolvido_por: 'superadmin_bulk',
      };
    }
    return l;
  });

  saveSystemErrorLogs(updated);

  ids.forEach((id) => {
    setTimeout(() => {
      updateSystemErrorLogResolutionInPocketBase(id, true, 'superadmin_bulk', now).catch(() => {});
    }, 0);
  });
}

/**
 * Limpa todos os logs do sistema
 */
export function clearSystemErrorLogs(): void {
  saveSystemErrorLogs([]);
}

/**
 * Reseta para os logs demonstrativos padrão
 */
export function resetSystemErrorLogsToDefault(): void {
  saveSystemErrorLogs(INITIAL_SYSTEM_ERROR_LOGS.map((l) => ({ ...l })));
}

/**
 * Interceptor global de erros de runtime e rejeições de promessa não tratadas
 * Registra o erro silenciosamente no backend/localStorage e exibe toast amigável
 */
let interceptorsInitialized = false;

export function initGlobalErrorInterceptors(): void {
  if (interceptorsInitialized || typeof window === 'undefined') return;
  interceptorsInitialized = true;

  // 1. window.onerror: exceções não tratadas de scripts
  window.addEventListener('error', (event: ErrorEvent) => {
    // Ignora erros de scripts de extensões do Chrome/navegador
    const filename = event.filename || '';
    if (
      filename.includes('chrome-extension://') ||
      filename.includes('moz-extension://') ||
      filename.includes('safari-web-extension://')
    ) {
      return;
    }

    const message = event.message || 'Erro inesperado no cliente de navegação';
    const stack = event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;

    // Obtém tenant ativo da URL ou rota se disponível
    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');

    logSystemError({
      barbearia_id: tenantParam || null,
      nivel: 'critico',
      modulo: 'sistema_geral',
      mensagem_erro: `Runtime Exception: ${message}`,
      detalhes_tecnicos: {
        errorName: event.error?.name || 'Error',
        stackTrace: stack,
        lineno: event.lineno,
        colno: event.colno,
        filename: event.filename,
      },
      showToast: true,
      toastMessage: 'Ocorreu uma instabilidade pontual. Suas informações foram preservadas.',
    }).catch(() => {});
  });

  // 2. window.onunhandledrejection: promessas assíncronas rejeitadas
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      typeof reason === 'string'
        ? reason
        : reason?.message || 'Falha assíncrona não tratada (Promise Rejection)';
    const stack = reason?.stack || '';

    // Evita loop de erros de conexões de telemetria / pocketbase local
    if (message.includes('PocketBase') || message.includes('logs_erros_sistema')) {
      return;
    }

    logSystemError({
      nivel: 'aviso',
      modulo: 'sistema_geral',
      mensagem_erro: `Promise Rejection: ${message}`,
      detalhes_tecnicos: {
        errorName: reason?.name || 'UnhandledPromiseRejection',
        stackTrace: stack,
        reasonString: String(reason),
      },
      showToast: false, // Rejeições leves não precisam incomodar com toast a menos que críticas
    }).catch(() => {});
  });
}
