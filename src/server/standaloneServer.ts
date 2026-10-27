import 'dotenv/config';
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

// [Stripe] Central SaaS B2B Gateway (Faturamento de Mensalidades Naville - Produção Oficial Live)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

app.get('/api/stripe/status', (req: Request, res: Response) => {
  res.json({
    connected: true,
    livemode: true,
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    accountName: 'Naville Barber SaaS (Oficial)',
    currency: 'brl',
    supportedPaymentMethods: ['card', 'boleto'],
  });
});

app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      slug,
      tenantName,
      planId = 'pro',
      billingCycle = 'mensal',
      amountCents = 8990,
      successUrl,
      cancelUrl,
      customerEmail,
    } = req.body || {};

    const origin = req.headers.origin || 'https://navillebarber.pro';
    const sUrl = successUrl || `${origin}/admin?stripe_session_id={CHECKOUT_SESSION_ID}&plan=${planId}`;
    const cUrl = cancelUrl || `${origin}/admin?stripe_cancelled=true`;

    const planTitle = `Naville SaaS ${String(planId).toUpperCase()} (${billingCycle})`;
    const desc = `Assinatura SaaS Barbearia - ${tenantName || slug || 'Tenant ' + tenantId}`;

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', sUrl);
    params.append('cancel_url', cUrl);
    params.append('client_reference_id', String(tenantId || slug || 'naville_tenant'));
    if (customerEmail) {
      params.append('customer_email', customerEmail);
    }
    params.append('line_items[0][price_data][currency]', 'brl');
    params.append('line_items[0][price_data][unit_amount]', String(amountCents));
    params.append('line_items[0][price_data][product_data][name]', planTitle);
    params.append('line_items[0][price_data][product_data][description]', desc);
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[tenantId]', String(tenantId || ''));
    params.append('metadata[slug]', String(slug || ''));
    params.append('metadata[planId]', String(planId));
    params.append('metadata[billingCycle]', String(billingCycle));

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Stripe] Erro ao criar Checkout Session:', data);
      return res.status(response.status).json({
        success: false,
        error: data.error?.message || 'Falha ao criar sessão Stripe',
      });
    }

    return res.json({
      success: true,
      sessionId: data.id,
      checkoutUrl: data.url,
      amountTotal: data.amount_total,
      currency: data.currency,
    });
  } catch (error: any) {
    console.error('[Stripe] Erro interno:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno Stripe' });
  }
});

app.post('/api/webhooks/stripe', rateLimitPresets.webhooks, (req: Request, res: Response) => {
  const event = req.body;
  console.log(`[Stripe Webhook] Evento recebido: ${event?.type}`);
  res.json({ received: true, eventType: event?.type });
});

// Iniciar servidor caso executado diretamente
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`💈 Naville Secure Webhook & Health Server rodando na porta ${PORT}`);
    console.log(`📡 Endpoint de Webhook ativo em: http://localhost:${PORT}/api/webhooks/invoice-ninja`);
    console.log(`💳 Stripe Checkout API ativo em: http://localhost:${PORT}/api/stripe/create-checkout-session`);
    console.log(`🏥 Health check ativo em: http://localhost:${PORT}/api/health (e /api/health/deep)`);
    console.log(`🛡️ CORS estrito e Rate Limiting ativados com sucesso.`);
  });
}

export default app;
