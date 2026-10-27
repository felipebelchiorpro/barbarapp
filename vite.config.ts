import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function navilleServerPlugin() {
  return {
    name: 'naville-server-api-endpoint',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const urlPath = req.url ? req.url.split('?')[0] : '';
        
        // Health check probes
        if (urlPath === '/api/health') {
          const { getLivenessHealth } = await import('./src/server/healthService');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(getLivenessHealth()));
          return;
        }

        if (urlPath === '/api/health/deep') {
          const { getDeepHealth } = await import('./src/server/healthService');
          const health = await getDeepHealth();
          res.writeHead(health.status === 'unhealthy' ? 503 : 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(health));
          return;
        }

        // Invoice Ninja Webhooks
        if (urlPath === '/api/webhooks/invoice-ninja') {
          const { handleInvoiceNinjaWebhookRequest } = await import('./src/server/invoiceNinjaWebhookHandler');
          handleInvoiceNinjaWebhookRequest(req, res);
          return;
        }

        // WhatsApp API Endpoints (Proxy & Fallback for Dev Server)
        if (urlPath === '/api/barbearia/whatsapp/status' || urlPath === '/api/whatsapp/status') {
          try {
            const pbRes = await fetch(`http://127.0.0.1:8090${req.url}`, {
              headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] || '' },
              signal: AbortSignal.timeout(1200),
            });
            if (pbRes.ok) {
              const data = await pbRes.json();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
              return;
            }
          } catch (_) {}

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'close', phone: null, instance: { state: 'close' }, simulated: true }));
          return;
        }

        if (urlPath === '/api/barbearia/whatsapp/qrcode' || urlPath === '/api/whatsapp/qrcode') {
          try {
            const pbRes = await fetch(`http://127.0.0.1:8090${req.url}`, {
              headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] || '' },
              signal: AbortSignal.timeout(1500),
            });
            if (pbRes.ok) {
              const data = await pbRes.json();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
              return;
            }
          } catch (_) {}

          const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><rect width="240" height="240" fill="#ffffff"/><rect x="20" y="20" width="60" height="60" fill="#09090b" rx="8"/><rect x="30" y="30" width="40" height="40" fill="#ffffff" rx="4"/><rect x="40" y="40" width="20" height="20" fill="#09090b" rx="2"/><rect x="160" y="20" width="60" height="60" fill="#09090b" rx="8"/><rect x="170" y="30" width="40" height="40" fill="#ffffff" rx="4"/><rect x="180" y="40" width="20" height="20" fill="#09090b" rx="2"/><rect x="20" y="160" width="60" height="60" fill="#09090b" rx="8"/><rect x="30" y="170" width="40" height="40" fill="#ffffff" rx="4"/><rect x="40" y="180" width="20" height="20" fill="#09090b" rx="2"/><g fill="#09090b"><rect x="95" y="20" width="10" height="10"/><rect x="115" y="20" width="10" height="10"/><rect x="135" y="20" width="10" height="10"/><rect x="95" y="40" width="10" height="20"/><rect x="115" y="50" width="20" height="10"/><rect x="95" y="70" width="20" height="10"/><rect x="125" y="70" width="10" height="10"/><rect x="20" y="95" width="20" height="10"/><rect x="50" y="95" width="30" height="10"/><rect x="95" y="95" width="50" height="50" rx="8" fill="#D4AF37"/><rect x="160" y="95" width="20" height="10"/><rect x="190" y="95" width="30" height="10"/><rect x="20" y="115" width="10" height="20"/><rect x="40" y="125" width="20" height="10"/><rect x="160" y="115" width="30" height="10"/><rect x="200" y="125" width="20" height="10"/><rect x="20" y="145" width="30" height="10"/><rect x="60" y="145" width="20" height="10"/><rect x="170" y="145" width="20" height="10"/><rect x="95" y="160" width="10" height="20"/><rect x="115" y="160" width="20" height="10"/><rect x="145" y="160" width="20" height="10"/><rect x="105" y="180" width="30" height="10"/><rect x="145" y="180" width="10" height="20"/><rect x="95" y="200" width="20" height="10"/><rect x="125" y="200" width="30" height="10"/><rect x="170" y="180" width="20" height="20"/><rect x="200" y="170" width="20" height="10"/><rect x="200" y="200" width="20" height="20"/></g><circle cx="120" cy="120" r="18" fill="#25D366"/><path d="M112 124c1.2 2.4 3.2 4.4 5.6 5.6l1.9-1.9c.2-.2.6-.3.9-.2 1 .3 2.1.5 3.2.5.5 0 .9.4.9.9v3.1c0 .5-.4.9-.9.9-7.2 0-13-5.8-13-13 0-.5.4-.9.9-.9h3.1c.5 0 .9.4.9.9 0 1.1.2 2.2.5 3.2.1.3 0 .7-.2.9l-1.9 1.9z" fill="#ffffff"/></svg>`;
          const mockBase64 = `data:image/svg+xml;utf8,${encodeURIComponent(mockSvg)}`;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            base64: mockBase64,
            pairingCode: `NAV-${Math.floor(100000 + Math.random() * 900000)}`,
            code: 'mock_code',
            count: 1,
            simulated: true,
          }));
          return;
        }

        if (urlPath === '/api/barbearia/whatsapp/logout' || urlPath === '/api/whatsapp/disconnect') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Desconectado com sucesso' }));
          return;
        }

        if (urlPath === '/api/barbearia/whatsapp/templates') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, templates: [] }));
          return;
        }

        if (urlPath === '/api/barbearia/whatsapp/test-send' || urlPath === '/api/whatsapp/send-message') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Mensagem enviada com sucesso (Simulação Dev)',
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        if (urlPath === '/api/barbearia/whatsapp/history') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, history: [] }));
          return;
        }

        if (urlPath === '/api/barbearia/whatsapp/post-cut' || urlPath === '/api/barbearia/whatsapp/booking-created') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, recorded: true }));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      navilleServerPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/pocketbase/**', '**/.git/**', '**/.agents/**'],
      },
    },
  };
});
