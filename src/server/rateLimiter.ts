/**
 * Rate Limiting Middleware para Caddy e Servidores Node/Express
 * DevSecOps & Application Security Specialist (Naville SaaS)
 * Proteção contra Brute-Force, Abuso de API e DDoS
 */

import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number; // Janela de tempo em milissegundos
  max: number; // Máximo de requisições permitidas por IP na janela
  message?: string;
  statusCode?: number;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request | any) => string;
}

interface ClientBucket {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, ClientBucket>();

// Limpeza periódica de buckets expirados para evitar vazamento de memória (a cada 5 minutos)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore.entries()) {
      if (now > bucket.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Extrai o IP real do cliente mesmo atrás de Caddy, Cloudflare ou Nginx
 */
export function getClientIp(req: Request | any): string {
  // Cloudflare Connecting IP
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : String(cfIp).trim();

  // X-Forwarded-For (primeiro IP da lista é o cliente original)
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded)).split(',');
    return ips[0].trim();
  }

  // X-Real-IP (Caddy / Nginx)
  const realIp = req.headers?.['x-real-ip'];
  if (realIp) return Array.isArray(realIp) ? realIp[0] : String(realIp).trim();

  // Socket remoto
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Cria middleware de limitação de requisições por IP
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 60;
  const statusCode = options.statusCode || 429;
  const message = options.message || 'Muitas requisições originadas deste IP. Tente novamente mais tarde.';
  const keyGen = options.keyGenerator || getClientIp;

  return function rateLimiterMiddleware(req: Request | any, res: Response | any, next: NextFunction | any) {
    const clientKey = `${req.baseUrl || ''}_${keyGen(req)}`;
    const now = Date.now();

    let bucket = memoryStore.get(clientKey);

    if (!bucket || now > bucket.resetTime) {
      bucket = {
        count: 1,
        resetTime: now + windowMs,
      };
      memoryStore.set(clientKey, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetTime - now) / 1000);

    // Standard IETF RateLimit Headers
    if (res.setHeader) {
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(resetSeconds));
      res.setHeader('Retry-After', String(resetSeconds));
    }

    if (bucket.count > max) {
      if (typeof res.status === 'function') {
        const chained = res.status(statusCode);
        if (chained && typeof chained.json === 'function') {
          return chained.json({
            error: 'RateLimitExceeded',
            message,
            retryAfterSeconds: resetSeconds,
          });
        }
      }
      if (typeof res.json === 'function') {
        return res.json({
          error: 'RateLimitExceeded',
          message,
          retryAfterSeconds: resetSeconds,
        });
      }
      if (res.writeHead && res.end) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            error: 'RateLimitExceeded',
            message,
            retryAfterSeconds: resetSeconds,
          })
        );
      }
    }

    if (typeof next === 'function') {
      next();
    }
  };
}

/**
 * Presets recomendados para as rotas da arquitetura Naville
 */
export const rateLimitPresets = {
  // [4] Rotas de autenticação (mitigação de força bruta contra senhas e OTPs): 10 tentativas / min
  auth: createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Bloqueio de segurança temporário: limite de tentativas de autenticação excedido. Aguarde 1 minuto.',
  }),

  // [4] Webhooks externos (Invoice Ninja / Evolution API): 60 requisições / min
  webhooks: createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Taxa excessiva de envio de webhooks detectada.',
  }),

  // [4] Agendamentos públicos: 30 requisições / min por IP
  agendamentos: createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Muitas consultas ou tentativas de agendamento em curto período. Aguarde 1 minuto.',
  }),

  // Geral API: 120 requisições / min
  generalApi: createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Muitas requisições à API. Por favor, reduza a frequência.',
  }),
};

/**
 * Limpa o histórico de rate limit (útil para testes unitários)
 */
export function resetRateLimiterStore(): void {
  memoryStore.clear();
}
