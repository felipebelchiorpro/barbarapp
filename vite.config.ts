import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

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
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Naville - Gestão & Agendamento para Barbearias',
          short_name: 'Naville',
          description: 'Plataforma inteligente de agendamento online e gestão completa para barbearias.',
          theme_color: '#121214',
          background_color: '#0D0D0D',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/?source=pwa',
          scope: '/',
          categories: ['lifestyle', 'business', 'productivity'],
          shortcuts: [
            {
              name: 'Modo Cadeira (Barbeiro)',
              short_name: 'Cadeira',
              description: 'Acesso rápido à agenda do barbeiro, lançamento de comanda e extras',
              url: '/barbeiro',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: 'Painel da Barbearia',
              short_name: 'Painel',
              description: 'Gestão completa da barbearia',
              url: '/admin',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
            },
          ],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
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
