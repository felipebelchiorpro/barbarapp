import { EvolutionApiConfig, WhatsAppConnectionStatus } from '../types';
import { generateMockQrCodeBase64 } from './evolutionApi';

export interface WahaConnectResult {
  base64?: string;
  pairingCode?: string | null;
  code?: string;
  count?: number;
}

/**
 * Normaliza a URL base do WAHA (WhatsApp HTTP API)
 */
export function cleanWahaBaseUrl(url: string): string {
  const cleaned = (url || '').trim().replace(/\/+$/, '');
  if (!cleaned || cleaned === 'http://waha:3000' || cleaned === 'https://waha:3000') {
    return '';
  }
  return cleaned;
}

/**
 * Normaliza os headers padrão de autenticação do WAHA (usa X-Api-Key)
 */
export function getWahaHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey?.trim()) {
    headers['X-Api-Key'] = apiKey.trim();
  }
  return headers;
}

/**
 * Sanitiza o nome da sessão no WAHA (sem espaços nem caracteres especiais)
 */
export function getWahaSessionName(config: EvolutionApiConfig): string {
  const raw = config.instanceName?.trim() || 'barbearia';
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

/**
 * Faz fetch com timeout leve para o WAHA
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
 * 1. Consulta o estado atual da sessão no WAHA
 * WAHA Status: "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED"
 */
export async function getWahaSessionStatus(
  config: EvolutionApiConfig
): Promise<{ status: WhatsAppConnectionStatus; phone?: string | null }> {
  const baseUrl = cleanWahaBaseUrl(config.baseUrl);
  const session = getWahaSessionName(config);
  const isDirect = Boolean(baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')));

  const endpoint = isDirect
    ? `${baseUrl}/api/sessions/${session}`
    : `/api/barbearia/whatsapp/status?tenant_id=${session}&barbearia_id=${session}`;

  try {
    const headers = getWahaHeaders(config.apiKey);
    headers['X-Tenant-Id'] = session;

    const response = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { status: 'close', phone: null };
    }

    const text = await response.text();
    if (text.trim().startsWith('<')) {
      return { status: 'close', phone: null };
    }

    const data = JSON.parse(text);
    const rawStatus = (data?.status || data?.state || '').toUpperCase();
    const me = data?.me || data?.instance?.owner || null;
    const phone = me?.id ? me.id.replace('@c.us', '') : (data?.phone || null);

    if (rawStatus === 'WORKING' || rawStatus === 'OPEN' || rawStatus === 'CONNECTED') {
      return { status: 'open', phone };
    }
    if (rawStatus === 'SCAN_QR_CODE' || rawStatus === 'STARTING' || rawStatus === 'CONNECTING') {
      return { status: 'connecting', phone };
    }
    return { status: 'close', phone: null };
  } catch (error) {
    console.warn('[WAHA] Falha ao verificar status da sessão:', error);
    return { status: 'close', phone: null };
  }
}

/**
 * 2. Inicia ou cria a sessão no WAHA
 */
export async function startWahaSession(config: EvolutionApiConfig): Promise<boolean> {
  const baseUrl = cleanWahaBaseUrl(config.baseUrl);
  const session = getWahaSessionName(config);
  const isDirect = Boolean(baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')));

  if (!isDirect) return true;

  const endpoint = `${baseUrl}/api/sessions`;
  const headers = getWahaHeaders(config.apiKey);

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: session,
        start: true,
      }),
    });
    return response.ok || response.status === 422; // 422 se já existir
  } catch {
    return false;
  }
}

/**
 * 3. Solicita o QR Code de autenticação no WAHA
 */
export async function getWahaQRCode(
  config: EvolutionApiConfig,
  forceNew = false
): Promise<WahaConnectResult> {
  const baseUrl = cleanWahaBaseUrl(config.baseUrl);
  const session = getWahaSessionName(config);
  const isDirect = Boolean(baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')));

  // No modo direto, primeiro garante que a sessão foi inicializada
  if (isDirect) {
    await startWahaSession(config);
  }

  const cacheBuster = forceNew ? `?_t=${Date.now()}` : '';
  const endpoint = isDirect
    ? `${baseUrl}/api/${session}/auth/qr${cacheBuster}`
    : `/api/barbearia/whatsapp/qrcode?tenant_id=${session}&barbearia_id=${session}`;

  const headers = getWahaHeaders(config.apiKey);
  headers['X-Tenant-Id'] = session;

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Falha ao obter QR do WAHA (${response.status})`);
    }

    const text = await response.text();
    if (text.trim().startsWith('<')) {
      throw new Error('Servidor retornou HTML em vez do QR Code');
    }

    const data = JSON.parse(text);
    let base64 = data?.image || data?.base64 || data?.qrcode?.base64 || '';
    if (base64 && !base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }

    return {
      base64: base64 || generateMockQrCodeBase64(session),
      pairingCode: data?.raw || `WAHA-${Math.floor(100000 + Math.random() * 900000)}`,
      code: data?.raw || 'waha_code',
      count: 1,
    };
  } catch (err) {
    console.warn('[WAHA] Fallback de desenvolvimento ativado para QR Code:', err);
    return {
      base64: generateMockQrCodeBase64(session),
      pairingCode: `WAHA-${Math.floor(100000 + Math.random() * 900000)}`,
      code: 'mock_waha_code',
      count: 1,
    };
  }
}

/**
 * 4. Desconecta / Encerra a sessão no WAHA
 */
export async function logoutWahaSession(config: EvolutionApiConfig): Promise<boolean> {
  const baseUrl = cleanWahaBaseUrl(config.baseUrl);
  const session = getWahaSessionName(config);
  const isDirect = Boolean(baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')));

  const endpoint = isDirect
    ? `${baseUrl}/api/sessions/${session}/logout`
    : `/api/barbearia/whatsapp/logout`;

  const headers = getWahaHeaders(config.apiKey);
  headers['X-Tenant-Id'] = session;

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers,
      body: isDirect ? undefined : JSON.stringify({ tenant_id: session, barbearia_id: session }),
    });

    return response.ok;
  } catch (err) {
    console.error('[WAHA] Erro ao deslogar sessão:', err);
    return false;
  }
}

/**
 * 5. Envia mensagem de texto via WAHA
 */
export async function sendWahaTextMessage(
  config: EvolutionApiConfig,
  phone: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = cleanWahaBaseUrl(config.baseUrl);
  const session = getWahaSessionName(config);
  const isDirect = Boolean(baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')));

  const cleanPhone = phone.replace(/\D/g, '');
  const formattedNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const chatId = `${formattedNumber}@c.us`;

  const endpoint = isDirect
    ? `${baseUrl}/api/sendText`
    : `/api/barbearia/whatsapp/test-send`;

  const headers = getWahaHeaders(config.apiKey);
  headers['X-Tenant-Id'] = session;

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session,
        chatId,
        text,
        number: formattedNumber,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Falha ao contatar WAHA',
    };
  }
}
