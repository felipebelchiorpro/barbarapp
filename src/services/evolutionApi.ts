import { EvolutionApiConfig, WhatsAppConnectionStatus } from '../types';
import { logSystemError } from './systemErrorLogService';

export interface EvolutionConnectResult {
  base64?: string;
  pairingCode?: string | null;
  code?: string;
  count?: number;
}

/**
 * Normaliza a URL base da Evolution API
 */
function cleanBaseUrl(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}

/**
 * Normaliza os headers padrão de autenticação da Evolution API v2
 */
function getHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: (apiKey || '').trim(),
  };
}

/**
 * Faz fetch com timeout leve para evitar congelar a interface caso o servidor demore
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * 1. Consulta o estado atual da conexão da instância
 * Prioriza o proxy seguro do backend (/api/whatsapp/status) para não expor API Keys no cliente.
 */
export async function getEvolutionConnectionState(
  config: EvolutionApiConfig
): Promise<{ status: WhatsAppConnectionStatus; phone?: string | null }> {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const instance = encodeURIComponent(config.instanceName.trim() || 'barbearia');

  // Verifica se acessa direto ou via proxy reverso / PocketBase
  const isDirectEvolution = baseUrl && (baseUrl.includes(':8080') || baseUrl.includes('whatsapp.naville.app'));
  const endpoint = isDirectEvolution
    ? `${baseUrl}/instance/connectionState/${instance}`
    : `/api/barbearia/whatsapp/status?tenant_id=${instance}&barbearia_id=${instance}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': config.instanceName || 'barbearia',
    };
    if (isDirectEvolution && config.apiKey) {
      headers.apikey = config.apiKey.trim();
    }

    const response = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) return { status: 'close' };
      return { status: 'close' };
    }

    const data = await response.json();
    const rawState =
      data?.status ||
      data?.instance?.state ||
      data?.state ||
      (typeof data === 'string' ? data : 'close');

    const phone = data?.phone || data?.instance?.owner || data?.owner || null;
    const state = String(rawState).toLowerCase();

    if (state === 'open' || state === 'connected') {
      return { status: 'open', phone };
    }
    if (state === 'connecting') {
      return { status: 'connecting', phone };
    }
    return { status: 'close', phone };
  } catch (error: unknown) {
    console.warn('[Evolution API] Falha ao verificar connectionState:', error);
    return { status: 'close' };
  }
}

/**
 * 2. Solicita a conexão e obtém o QR Code em Base64
 * Prioriza o endpoint de gestão seguro /api/barbearia/whatsapp/qrcode
 */
export async function getEvolutionConnectQRCode(config: EvolutionApiConfig): Promise<EvolutionConnectResult> {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const instance = encodeURIComponent(config.instanceName.trim() || 'barbearia');

  const isDirectEvolution = baseUrl && (baseUrl.includes(':8080') || baseUrl.includes('whatsapp.naville.app'));
  const endpoint = isDirectEvolution
    ? `${baseUrl}/instance/connect/${instance}`
    : `/api/barbearia/whatsapp/qrcode?tenant_id=${instance}&barbearia_id=${instance}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': config.instanceName || 'barbearia',
  };
  if (isDirectEvolution && config.apiKey) {
    headers.apikey = config.apiKey.trim();
  }

  const response = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Erro ao gerar QR Code (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();

  let base64 = data?.base64 || data?.qrcode?.base64 || '';
  if (base64 && !base64.startsWith('data:image')) {
    base64 = `data:image/png;base64,${base64}`;
  }

  return {
    base64: base64 || undefined,
    pairingCode: data?.pairingCode || null,
    code: data?.code || undefined,
    count: data?.count,
  };
}

/**
 * 3. Encerra a sessão da instância
 * Prioriza o endpoint de gestão seguro /api/barbearia/whatsapp/logout
 */
export async function logoutEvolutionInstance(config: EvolutionApiConfig): Promise<boolean> {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const instance = encodeURIComponent(config.instanceName.trim() || 'barbearia');

  const isDirectEvolution = baseUrl && (baseUrl.includes(':8080') || baseUrl.includes('whatsapp.naville.app'));
  const endpoint = isDirectEvolution
    ? `${baseUrl}/instance/logout/${instance}`
    : `/api/barbearia/whatsapp/logout`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': config.instanceName || 'barbearia',
  };
  if (isDirectEvolution && config.apiKey) {
    headers.apikey = config.apiKey.trim();
  }

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: isDirectEvolution ? 'DELETE' : 'POST',
      headers,
      body: isDirectEvolution ? undefined : JSON.stringify({ tenant_id: config.instanceName, barbearia_id: config.instanceName }),
    });

    return response.ok;
  } catch (error: unknown) {
    console.error('[Evolution API] Erro ao deslogar instância:', error);
    return false;
  }
}
