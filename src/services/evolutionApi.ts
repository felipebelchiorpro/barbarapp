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
 * 2. Cria a instância na Evolution API de forma automática
 * Suporta chamada direta e via proxy backend
 */
export async function createEvolutionInstance(
  config: EvolutionApiConfig
): Promise<{ success: boolean; qrResult?: EvolutionConnectResult; error?: string }> {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const instance = encodeURIComponent(config.instanceName.trim() || 'barbearia');
  const isDirectEvolution = baseUrl && (baseUrl.includes(':8080') || baseUrl.includes('whatsapp.naville.app'));

  const endpoint = isDirectEvolution
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
      instanceName: config.instanceName.trim() || 'barbearia',
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

    const data = await response.json();
    let base64 = data?.qrcode?.base64 || data?.base64 || '';
    if (base64 && !base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }

    return {
      success: true,
      qrResult: {
        base64: base64 || undefined,
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
  const instance = encodeURIComponent(config.instanceName.trim() || 'barbearia');

  const isDirectEvolution = baseUrl && (baseUrl.includes(':8080') || baseUrl.includes('whatsapp.naville.app'));
  const cacheBuster = forceNew ? `&_t=${Date.now()}` : '';
  const endpoint = isDirectEvolution
    ? `${baseUrl}/instance/connect/${instance}`
    : `/api/barbearia/whatsapp/qrcode?tenant_id=${instance}&barbearia_id=${instance}${cacheBuster}`;

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

  // Se a instância não existir (404), auto-cria agora e gera novo QR Code!
  if (response.status === 404) {
    console.warn('[Evolution API] Instância não existia (404). Auto-criando agora...');
    const createRes = await createEvolutionInstance(config);
    if (createRes.success && createRes.qrResult?.base64) {
      return createRes.qrResult;
    }
    // Se criou mas não veio QR no payload inicial, tenta o connect novamente
    const retryRes = await fetchWithTimeout(endpoint, { method: 'GET', headers });
    if (retryRes.ok) {
      const data = await retryRes.json();
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
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    // Se o texto de erro indicar que a instância não existe, tenta o self-healing
    if (errText.includes('does not exist') || errText.includes('not exist')) {
      console.warn('[Evolution API] Self-healing: Instância reportada como inexistente. Auto-criando...');
      const createRes = await createEvolutionInstance(config);
      if (createRes.success && createRes.qrResult?.base64) {
        return createRes.qrResult;
      }
    }
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
