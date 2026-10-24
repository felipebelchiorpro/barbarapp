import express, { Request, Response } from 'express';
import {
  handleInvoiceNinjaWebhookRequest,
  getServerState,
} from './invoiceNinjaWebhookHandler';
import { strictCorsMiddleware } from './corsSecurity';
import { rateLimitPresets } from './rateLimiter';
import { getLivenessHealth, getDeepHealth } from './healthService';
import {
  handleWhatsAppStatus,
  handleWhatsAppConnectQRCode,
  handleWhatsAppLogout,
  handleWhatsAppSendMessage,
  handleEvolutionWebhook,
} from './whatsappProxyService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares para CORS estrito (sem wildcard *) e JSON parsing
app.use(strictCorsMiddleware);
app.use(express.json());

// [4] Rate limit global para mitigar DDoS
app.use(rateLimitPresets.generalApi);

// [19] Health check leve (Liveness Probe para Caddy / Docker / Cloudflare)
app.get('/api/health', (req: Request, res: Response) => {
  res.json(getLivenessHealth());
});

// [19] Health check profundo (Readiness Probe com checagem do SQLite, Memória e Dependências)
app.get('/api/health/deep', async (req: Request, res: Response) => {
  try {
    const health = await getDeepHealth(getServerState);
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: String(err) });
  }
});

// Status dos tenants e faturas no servidor
app.get('/api/billing/state', (req: Request, res: Response) => {
  res.json(getServerState());
});

// [3] WhatsApp Gateway Blindado (Proxy isolado multi-tenant para Evolution API)
app.get('/api/whatsapp/status', (req: Request, res: Response) => {
  handleWhatsAppStatus(req, res);
});

app.get('/api/whatsapp/qrcode', (req: Request, res: Response) => {
  handleWhatsAppConnectQRCode(req, res);
});

app.post('/api/whatsapp/disconnect', (req: Request, res: Response) => {
  handleWhatsAppLogout(req, res);
});

app.post('/api/whatsapp/send-message', rateLimitPresets.webhooks, (req: Request, res: Response) => {
  handleWhatsAppSendMessage(req, res);
});

// [3] Webhook seguro recebido da Evolution API
app.post('/api/webhooks/evolution', rateLimitPresets.webhooks, (req: Request, res: Response) => {
  handleEvolutionWebhook(req, res);
});

// [4] Endpoint oficial de webhook do Invoice Ninja protegido com Rate Limiting específico
app.post(
  '/api/webhooks/invoice-ninja',
  rateLimitPresets.webhooks,
  (req: Request, res: Response) => {
    handleInvoiceNinjaWebhookRequest(req, res);
  }
);

// Iniciar servidor caso executado diretamente
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`💈 Naville Secure Webhook & Health Server rodando na porta ${PORT}`);
    console.log(`📡 Endpoint de Webhook ativo em: http://localhost:${PORT}/api/webhooks/invoice-ninja`);
    console.log(`🏥 Health check ativo em: http://localhost:${PORT}/api/health (e /api/health/deep)`);
    console.log(`🛡️ CORS estrito e Rate Limiting ativados com sucesso.`);
  });
}

export default app;
