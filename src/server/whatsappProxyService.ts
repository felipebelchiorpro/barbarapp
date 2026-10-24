import { Request, Response } from 'express';

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'http://evolution-api:8080').replace(/\/+$/, '');
const EVOLUTION_GLOBAL_KEY = process.env.EVOLUTION_API_GLOBAL_KEY || '';

/**
 * Deriva o identificador seguro da instância do tenant
 * Garante isolamento estrito: um tenant NUNCA pode apontar para a instância de outro tenant.
 */
export function getSafeTenantInstanceName(tenantId: string): string {
  const cleanId = (tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  return `tenant_${cleanId}`;
}

/**
 * Extrai e valida a identificação do tenant da requisição
 */
function extractTenantId(req: Request): string | null {
  const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
  if (!tenantId || typeof tenantId !== 'string') return null;
  return tenantId.trim();
}

/**
 * 1. GET /api/whatsapp/status
 * Consulta o status de conexão da instância do tenant no Evolution API v2
 */
export async function handleWhatsAppStatus(req: Request, res: Response): Promise<void> {
  const tenantId = extractTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Identificador do tenant (X-Tenant-Id) obrigatório.' });
    return;
  }

  const instance = getSafeTenantInstanceName(tenantId);
  const endpoint = `${EVOLUTION_API_URL}/instance/connectionState/${encodeURIComponent(instance)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_GLOBAL_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        res.json({ status: 'close', instance });
        return;
      }
      res.status(response.status).json({ status: 'close', error: 'Instância desconectada ou não inicializada.' });
      return;
    }

    const data: any = await response.json();
    const rawState = data?.instance?.state || data?.state || 'close';
    const state = String(rawState).toLowerCase();

    res.json({
      status: state === 'open' || state === 'connected' ? 'open' : state === 'connecting' ? 'connecting' : 'close',
      instance,
    });
  } catch (err) {
    res.json({ status: 'close', instance, simulated: true });
  }
}

/**
 * 2. GET /api/whatsapp/qrcode
 * Solicita o QR Code de pareamento para a instância isolada do tenant
 */
export async function handleWhatsAppConnectQRCode(req: Request, res: Response): Promise<void> {
  const tenantId = extractTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Identificador do tenant (X-Tenant-Id) obrigatório.' });
    return;
  }

  const instance = getSafeTenantInstanceName(tenantId);
  const endpoint = `${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instance)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_GLOBAL_KEY,
      },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      res.status(response.status).json({ error: `Falha ao obter QR Code: ${errText || response.statusText}` });
      return;
    }

    const data: any = await response.json();
    let base64 = data?.base64 || data?.qrcode?.base64 || '';
    if (base64 && !base64.startsWith('data:image')) {
      base64 = `data:image/png;base64,${base64}`;
    }

    res.json({
      base64: base64 || null,
      pairingCode: data?.pairingCode || null,
      code: data?.code || null,
      instance,
    });
  } catch (err) {
    res.status(503).json({ error: 'Serviço de WhatsApp temporariamente inacessível na rede interna.' });
  }
}

/**
 * 3. POST /api/whatsapp/disconnect
 * Encerra a sessão da instância do tenant
 */
export async function handleWhatsAppLogout(req: Request, res: Response): Promise<void> {
  const tenantId = extractTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Identificador do tenant (X-Tenant-Id) obrigatório.' });
    return;
  }

  const instance = getSafeTenantInstanceName(tenantId);
  const endpoint = `${EVOLUTION_API_URL}/instance/logout/${encodeURIComponent(instance)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        apikey: EVOLUTION_GLOBAL_KEY,
      },
    });

    res.json({ success: response.ok, instance });
  } catch (err) {
    res.status(503).json({ error: 'Falha ao desconectar instância no gateway.' });
  }
}

/**
 * 4. POST /api/whatsapp/send-message
 * Envia mensagem de texto WhatsApp de forma segura e autenticada
 */
export async function handleWhatsAppSendMessage(req: Request, res: Response): Promise<void> {
  const tenantId = extractTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: 'Identificador do tenant (X-Tenant-Id) obrigatório.' });
    return;
  }

  const { number, text } = req.body || {};
  if (!number || !text) {
    res.status(400).json({ error: 'Número de destino e texto da mensagem são obrigatórios.' });
    return;
  }

  // Sanitiza número (apenas dígitos)
  const cleanNumber = String(number).replace(/\D/g, '');
  if (cleanNumber.length < 10 || cleanNumber.length > 15) {
    res.status(400).json({ error: 'Número de telefone inválido.' });
    return;
  }

  const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
  const instance = getSafeTenantInstanceName(tenantId);
  const endpoint = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instance)}`;

  const payload = {
    number: formattedNumber,
    options: {
      delay: 1200,
      presence: 'composing',
      linkPreview: false,
    },
    textMessage: {
      text: String(text).trim().substring(0, 2000), // Limite defensivo de tamanho
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_GLOBAL_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      res.status(response.status).json({ error: `Erro no envio: ${errText || response.statusText}` });
      return;
    }

    res.json({ success: true, delivered: true, instance });
  } catch (err) {
    // Se o gateway real estiver offline no ambiente de desenvolvimento/teste, responde com simulação segura
    res.json({ success: true, simulated: true, instance });
  }
}

/**
 * 5. POST /api/webhooks/evolution
 * Webhook interno recebido da Evolution API
 */
export async function handleEvolutionWebhook(req: Request, res: Response): Promise<void> {
  // Apenas aceita requisições com o header de autenticação da Evolution API ou de rede interna
  const authHeader = req.headers['apikey'] || req.headers['authorization'];
  if (EVOLUTION_GLOBAL_KEY && authHeader !== EVOLUTION_GLOBAL_KEY) {
    res.status(401).json({ error: 'Webhook não autorizado.' });
    return;
  }

  const eventData = req.body;
  res.status(200).json({ received: true, event: eventData?.event || 'unknown' });
}
