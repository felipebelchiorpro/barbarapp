/**
 * Multi-Service Health Check & Observability Service
 * SRE & Resiliência Operacional Specialist (Naville SaaS)
 * Endpoints: /api/health (liveness) e /api/health/deep (readiness & dependências)
 */

import os from 'os';
import fs from 'fs';
import path from 'path';

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  components: {
    system: {
      status: 'ok' | 'warning' | 'critical';
      memoryUsedMb: number;
      memoryTotalMb: number;
      memoryFreePercent: number;
      cpuLoadAvg: number[];
      nodeVersion: string;
      platform: string;
    };
    pocketbaseDb: {
      status: 'ok' | 'offline';
      dbFileExists: boolean;
      dbSizeBytes?: number;
      walFileExists?: boolean;
      message?: string;
    };
    evolutionApi: {
      status: 'ok' | 'unreachable' | 'not_configured';
      endpoint?: string;
      responseTimeMs?: number;
    };
    invoiceNinjaWebhook: {
      status: 'ok';
      processedEventsCount: number;
      activeTenantsCount: number;
    };
  };
}

let startTime = Date.now();

/**
 * Retorna liveness probe rápido (HTTP 200) para Caddy, Docker e Cloudflare
 */
export function getLivenessHealth() {
  return {
    status: 'ok',
    service: 'Naville SaaS Core API',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retorna diagnóstico profundo e detalhado das dependências do sistema
 */
export async function getDeepHealth(mockServerState?: () => any): Promise<ServiceHealthStatus> {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const totalMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  const usedMem = totalMem - freeMem;
  const freePercent = Math.round((freeMem / totalMem) * 100);

  // 1. Checa SQLite local do PocketBase
  let pbDbStatus: 'ok' | 'offline' = 'offline';
  let dbSize = 0;
  let walExists = false;
  let pbMsg = 'Arquivo de banco não localizado';

  try {
    const dbPath = path.resolve(process.cwd(), 'pocketbase', 'pb_data', 'data.db');
    const walPath = path.resolve(process.cwd(), 'pocketbase', 'pb_data', 'data.db-wal');

    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      dbSize = stat.size;
      pbDbStatus = 'ok';
      pbMsg = 'SQLite operando normalmente com WAL';
    }
    walExists = fs.existsSync(walPath);
  } catch (err) {
    pbMsg = `Erro ao inspecionar SQLite: ${String(err)}`;
  }

  // 2. Checa Evolution API (se configurado)
  const evoUrl = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
  let evoStatus: 'ok' | 'unreachable' | 'not_configured' = 'not_configured';
  let evoLatency: number | undefined;

  if (process.env.EVOLUTION_API_URL) {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${evoUrl}/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      evoLatency = Date.now() - t0;
      evoStatus = res.ok || res.status === 404 ? 'ok' : 'unreachable';
    } catch {
      evoStatus = 'unreachable';
    }
  }

  // 3. Checa estado interno dos Webhooks
  let serverState = { tenants: [], invoices: [], webhookEventsCount: 0 };
  if (mockServerState) {
    try {
      serverState = mockServerState();
    } catch {
      // Ignora erro
    }
  }

  // Status geral consolidado
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (pbDbStatus === 'offline') {
    overallStatus = 'degraded';
  }
  if (freePercent < 5) {
    overallStatus = 'unhealthy';
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    environment: process.env.NODE_ENV || 'production',
    version: '2.5.0-resilient',
    components: {
      system: {
        status: freePercent < 10 ? 'warning' : 'ok',
        memoryUsedMb: usedMem,
        memoryTotalMb: totalMem,
        memoryFreePercent: freePercent,
        cpuLoadAvg: os.loadavg ? os.loadavg() : [0, 0, 0],
        nodeVersion: process.version,
        platform: `${os.type()} ${os.arch()}`,
      },
      pocketbaseDb: {
        status: pbDbStatus,
        dbFileExists: pbDbStatus === 'ok',
        dbSizeBytes: dbSize,
        walFileExists: walExists,
        message: pbMsg,
      },
      evolutionApi: {
        status: evoStatus,
        endpoint: evoUrl,
        responseTimeMs: evoLatency,
      },
      invoiceNinjaWebhook: {
        status: 'ok',
        processedEventsCount: serverState.webhookEventsCount || 0,
        activeTenantsCount: Array.isArray(serverState.tenants) ? serverState.tenants.length : 0,
      },
    },
  };
}
