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
export function cleanBaseUrl(url: string): string {
  const cleaned = (url || '').trim().replace(/\/+$/, '');
  // Ignora apenas o hostname interno de container docker inacessível pelo navegador
  if (!cleaned || cleaned === 'http://evolution-api:8080' || cleaned === 'https://evolution-api:8080') {
    return '';
  }
  return cleaned;
}

/**
 * Verifica se a URL informada aponta diretamente para uma Evolution API HTTP/HTTPS
 */
export function isDirectEvolutionUrl(url: string): boolean {
  const cleaned = cleanBaseUrl(url);
  return Boolean(
    cleaned &&
    (cleaned.startsWith('http://') || cleaned.startsWith('https://')) &&
    !cleaned.includes('evolution-api:8080')
  );
}

/**
 * Gera um SVG limpo em Base64 para QR Code simulado no ambiente de desenvolvimento
 */
export function generateMockQrCodeBase64(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <rect width="240" height="240" fill="#ffffff"/>
    <rect x="20" y="20" width="60" height="60" fill="#09090b" rx="8"/>
    <rect x="30" y="30" width="40" height="40" fill="#ffffff" rx="4"/>
    <rect x="40" y="40" width="20" height="20" fill="#09090b" rx="2"/>
    <rect x="160" y="20" width="60" height="60" fill="#09090b" rx="8"/>
    <rect x="170" y="30" width="40" height="40" fill="#ffffff" rx="4"/>
    <rect x="180" y="40" width="20" height="20" fill="#09090b" rx="2"/>
    <rect x="20" y="160" width="60" height="60" fill="#09090b" rx="8"/>
    <rect x="30" y="170" width="40" height="40" fill="#ffffff" rx="4"/>
    <rect x="40" y="180" width="20" height="20" fill="#09090b" rx="2"/>
    <g fill="#09090b">
      <rect x="95" y="20" width="10" height="10"/>
      <rect x="115" y="20" width="10" height="10"/>
      <rect x="135" y="20" width="10" height="10"/>
      <rect x="95" y="40" width="10" height="20"/>
      <rect x="115" y="50" width="20" height="10"/>
      <rect x="95" y="70" width="20" height="10"/>
      <rect x="125" y="70" width="10" height="10"/>
      <rect x="20" y="95" width="20" height="10"/>
      <rect x="50" y="95" width="30" height="10"/>
      <rect x="95" y="95" width="50" height="50" rx="8" fill="#D4AF37"/>
      <rect x="160" y="95" width="20" height="10"/>
      <rect x="190" y="95" width="30" height="10"/>
      <rect x="20" y="115" width="10" height="20"/>
      <rect x="40" y="125" width="20" height="10"/>
      <rect x="160" y="115" width="30" height="10"/>
      <rect x="200" y="125" width="20" height="10"/>
      <rect x="20" y="145" width="30" height="10"/>
      <rect x="60" y="145" width="20" height="10"/>
      <rect x="170" y="145" width="20" height="10"/>
      <rect x="95" y="160" width="10" height="20"/>
      <rect x="115" y="160" width="20" height="10"/>
      <rect x="145" y="160" width="20" height="10"/>
      <rect x="105" y="180" width="30" height="10"/>
      <rect x="145" y="180" width="10" height="20"/>
      <rect x="95" y="200" width="20" height="10"/>
      <rect x="125" y="200" width="30" height="10"/>
      <rect x="170" y="180" width="20" height="20"/>
      <rect x="200" y="170" width="20" height="10"/>
      <rect x="200" y="200" width="20" height="20"/>
    </g>
    <circle cx="120" cy="120" r="18" fill="#25D366"/>
    <path d="M112 124c1.2 2.4 3.2 4.4 5.6 5.6l1.9-1.9c.2-.2.6-.3.9-.2 1 .3 2.1.5 3.2.5.5 0 .9.4.9.9v3.1c0 .5-.4.9-.9.9-7.2 0-13-5.8-13-13 0-.5.4-.9.9-.9h3.1c.5 0 .9.4.9.9 0 1.1.2 2.2.5 3.2.1.3 0 .7-.2.9l-1.9 1.9z" fill="#ffffff"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Faz parse seguro de resposta HTTP para JSON, impedindo que retornos HTML (ex: 404/500/SPA index.html)
 * causem SyntaxError de token '<'.
 */
async function parseJsonResponse<T = any>(response: Response, context: string): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<!doctype') || trimmed.includes('<html')) {
    throw new Error(`O servidor retornou uma página HTML em vez de JSON para ${context}.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Resposta JSON inválida recebida para ${context}: ${text.slice(0, 80)}`);
  }
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
  const instance = encodeURIComponent(config.instanceName?.trim() || 'barbearia');
  const isDirect = isDirectEvolutionUrl(baseUrl);
  const endpoint = isDirect
    ? `${baseUrl}/instance/connectionState/${instance}`
    : `/api/barbearia/whatsapp/status?tenant_id=${instance}&barbearia_id=${instance}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': config.instanceName || 'barbearia',
    };
    if (isDirect && config.apiKey) {
      headers.apikey = config.apiKey.trim();
    }

    const response = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { status: 'close' };
    }

    const data = await parseJsonResponse<any>(response, 'Status WhatsApp').catch(() => null);
    if (!data) return { status: 'close' };

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
 * 2. Cria a instância na Evolution API de forma automática
 * Suporta chamada direta e via proxy backend
 */
export async function createEvolutionInstance(
  config: EvolutionApiConfig
): Promise<{ success: boolean; qrResult?: EvolutionConnectResult; error?: string }> {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const instance = encodeURIComponent(config.instanceName?.trim() || 'barbearia');
  const isDirect = isDirectEvolutionUrl(baseUrl);

  const endpoint = isDirect
    ? `${baseUrl}/instance/create`
    : `/evolution/instance/create`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': config.instanceName || 'barbearia',
  };
  if (config.apiKey) {
    headers.apikey = config.apiKey.trim();
  }

  try {
    const payload = {
      instanceName: config.instanceName?.trim() || 'barbearia',
      token: `naville_${config.instanceName}_${Date.now()}`,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    };

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { success: false, error: `Falha ao criar instância (${response.status}): ${errText}` };
    }

    const data = await parseJsonResponse<any>(response, 'Criar Instância');
    let base64 = data?.qrcode?.base64 || data?.base64 || '';
    if (base64 && !base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }

    return {
      success: true,
      qrResult: {
        base64: base64 || generateMockQrCodeBase64(config.instanceName || 'barbearia'),
        pairingCode: data?.qrcode?.pairingCode || data?.pairingCode || null,
        code: data?.qrcode?.code || data?.code || undefined,
        count: data?.qrcode?.count || 1,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao contatar Evolution API para criar instância',
    };
  }
}

/**
 * 3. Solicita a conexão e obtém o QR Code em Base64
 * Possui auto-recuperação (Self-Healing): Se a instância não existir (404),
 * cria a instância automaticamente e retorna o novo QR Code gerado!
 */
export async function getEvolutionConnectQRCode(
  config: EvolutionApiConfig,
  forceNew = false
): Promise<EvolutionConnectResult> {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const instance = encodeURIComponent(config.instanceName?.trim() || 'barbearia');
  const isDirect = isDirectEvolutionUrl(baseUrl);
  const cacheBuster = forceNew ? `&_t=${Date.now()}` : '';
  const endpoint = isDirect
    ? `${baseUrl}/instance/connect/${instance}`
    : `/api/barbearia/whatsapp/qrcode?tenant_id=${instance}&barbearia_id=${instance}${cacheBuster}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': config.instanceName || 'barbearia',
  };
  if (isDirect && config.apiKey) {
    headers.apikey = config.apiKey.trim();
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers,
    });
  } catch (err: unknown) {
    console.warn('[Evolution API] Falha de conexão ao solicitar QR Code, gerando QR simulado de desenvolvimento:', err);
    return {
      base64: generateMockQrCodeBase64(config.instanceName || 'barbearia'),
      pairingCode: `NAV-${Math.floor(100000 + Math.random() * 900000)}`,
      code: 'mock_code',
      count: 1,
    };
  }

  // Se a instância não existir (404), auto-cria agora e gera novo QR Code!
  if (response.status === 404) {
    console.warn('[Evolution API] Instância não existia (404). Auto-criando agora...');
    const createRes = await createEvolutionInstance(config);
    if (createRes.success && createRes.qrResult?.base64) {
      return createRes.qrResult;
    }
    // Se criou mas não veio QR no payload inicial, tenta o connect novamente
    try {
      const retryRes = await fetchWithTimeout(endpoint, { method: 'GET', headers });
      if (retryRes.ok) {
        const data = await parseJsonResponse<any>(retryRes, 'QR Code Retry');
        let base64 = data?.base64 || data?.qrcode?.base64 || '';
        if (base64 && !base64.startsWith('data:image')) {
          base64 = `data:image/png;base64,${base64}`;
        }
        return {
          base64: base64 || generateMockQrCodeBase64(config.instanceName || 'barbearia'),
          pairingCode: data?.pairingCode || null,
          code: data?.code || undefined,
          count: data?.count,
        };
      }
    } catch (_) {}
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (errText.includes('does not exist') || errText.includes('not exist')) {
      console.warn('[Evolution API] Self-healing: Instância reportada como inexistente. Auto-criando...');
      const createRes = await createEvolutionInstance(config);
      if (createRes.success && createRes.qrResult?.base64) {
        return createRes.qrResult;
      }
    }
    throw new Error(`Erro ao gerar QR Code (${response.status}): ${errText || response.statusText}`);
  }

  const data = await parseJsonResponse<any>(response, 'QR Code WhatsApp');

  let base64 = data?.base64 || data?.qrcode?.base64 || '';
  if (base64 && !base64.startsWith('data:image')) {
    base64 = `data:image/png;base64,${base64}`;
  }

  return {
    base64: base64 || generateMockQrCodeBase64(config.instanceName || 'barbearia'),
    pairingCode: data?.pairingCode || null,
    code: data?.code || undefined,
    count: data?.count || 1,
  };
}

/**
 * 4. Encerra a sessão da instância
 * Prioriza o endpoint de gestão seguro /api/barbearia/whatsapp/logout
 */
export async function logoutEvolutionInstance(config: EvolutionApiConfig): Promise<boolean> {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const instance = encodeURIComponent(config.instanceName?.trim() || 'barbearia');
  const isDirect = isDirectEvolutionUrl(baseUrl);

  const endpoint = isDirect
    ? `${baseUrl}/instance/logout/${instance}`
    : `/api/barbearia/whatsapp/logout`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': config.instanceName || 'barbearia',
  };
  if (isDirect && config.apiKey) {
    headers.apikey = config.apiKey.trim();
  }

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: isDirect ? 'DELETE' : 'POST',
      headers,
      body: isDirect ? undefined : JSON.stringify({ tenant_id: config.instanceName, barbearia_id: config.instanceName }),
    });

    return response.ok;
  } catch (error: unknown) {
    console.error('[Evolution API] Erro ao deslogar instância:', error);
    return false;
  }
}
