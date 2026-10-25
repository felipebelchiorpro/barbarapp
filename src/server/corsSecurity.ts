/**
 * CORS Security Middleware & Origin Validator
 * DevSecOps & Application Security Specialist (Naville SaaS)
 * Bloqueio de Wildcard '*' e Whitelist Estrita de Domínios Autorizados
 */

import { Request, Response, NextFunction } from 'express';

// Origens padrão autorizadas em ambiente de desenvolvimento e produção
export const DEFAULT_ALLOWED_ORIGINS = [
  'https://navillebarber.pro',
  'https://www.navillebarber.pro',
  'http://navillebarber.pro',
  'http://www.navillebarber.pro',
  'https://naville.app',
  'https://www.naville.app',
  'https://barber.naville.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Obtém a lista atualizada de origens permitidas via variável de ambiente ou default
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (!envOrigins) return DEFAULT_ALLOWED_ORIGINS;

  return envOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Verifica se a origem da requisição é estritamente permitida
 * Suporta subdomínios confiáveis do Cloudflare Pages (*.pages.dev) e da Naville (*.naville.app e *.navillebarber.pro)
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    // Requisições diretas de servidor para servidor (ex: cURL, webhooks backend, cron jobs) não enviam Origin
    return true;
  }

  const allowedList = getAllowedOrigins();

  // Verificação exata
  if (allowedList.includes(origin)) {
    return true;
  }

  // Verificação de subdomínios autorizados (Cloudflare Pages e Naville)
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Subdomínios oficiais da Naville (ex: tenant.naville.app ou tenant.navillebarber.pro)
    if (hostname.endsWith('.naville.app') || hostname.endsWith('.navillebarber.pro') || hostname === 'navillebarber.pro') {
      return true;
    }

    // Subdomínios do Cloudflare Pages da nossa organização
    if (hostname.endsWith('.pages.dev') && (hostname.includes('naville') || hostname.includes('barber'))) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Middleware express/connect para aplicação de CORS estrito e seguro
 */
export function strictCorsMiddleware(req: Request | any, res: Response | any, next: NextFunction | any) {
  const origin = req.headers?.origin;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Permite chamadas locais / backend sem header Origin
  } else {
    // Origem não autorizada: NÃO envia Access-Control-Allow-Origin
    // O navegador automaticamente bloqueará a leitura da resposta
    if (req.method === 'OPTIONS') {
      if (res.status) {
        return res.status(403).json({ error: 'CORS policy violation: Origin not allowed' });
      }
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'CORS policy violation: Origin not allowed' }));
    }
  }

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, X-Api-Secret, X-Ninja-Token, Authorization, X-Tenant-Id'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache pre-flight por 24 horas

  if (req.method === 'OPTIONS') {
    if (res.sendStatus) {
      return res.sendStatus(204);
    }
    res.writeHead(204);
    return res.end();
  }

  if (typeof next === 'function') {
    next();
  }
}
