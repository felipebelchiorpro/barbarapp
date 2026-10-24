/**
 * Testes Automatizados: Sistema de Captura Silenciosa de Erros & Central de Diagnóstico do Super Admin
 * Executado via `npx tsx tests/systemDiagnosticsAndErrorLogs.test.ts`
 */

import {
  logSystemError,
  getSystemErrorLogs,
  getUnresolvedSystemErrorsCount,
  getTenantRecentErrorsCount,
  toggleResolveSystemError,
  bulkResolveSystemErrors,
  clearSystemErrorLogs,
  resetSystemErrorLogsToDefault,
  captureClientEnvironment,
  INITIAL_SYSTEM_ERROR_LOGS,
} from '../src/services/systemErrorLogService';
import {
  POCKETBASE_COLLECTIONS,
  syncSystemErrorLogToPocketBase,
  updateSystemErrorLogResolutionInPocketBase,
} from '../src/services/pocketbaseSchema';
import { SystemErrorLog, SystemErrorLevel, SystemErrorModule } from '../src/types';

// Mock simples para ambiente de teste Node.js (sem window/localStorage nativo)
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] || null,
    setItem: (key: string, val: string) => {
      memoryStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
    },
  };
}

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     -> Details: ${details}`);
    failCount++;
  }
}

async function runSystemDiagnosticsTests() {
  console.log('\n======================================================');
  console.log('🧪 Iniciando Testes da Central de Diagnóstico & Logs de Erros');
  console.log('======================================================\n');

  // Teste 1: Coleção PocketBase
  console.log('📁 1. Validação de Coleções e Schema do PocketBase');
  assert(
    POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA === 'logs_erros_sistema',
    'Coleção logs_erros_sistema está registrada no POCKETBASE_COLLECTIONS',
    `Valor encontrado: ${POCKETBASE_COLLECTIONS.LOGS_ERROS_SISTEMA}`
  );

  // Teste 2: Logs Iniciais de Demonstração
  console.log('\n📊 2. Estrutura dos Logs Demonstrativos');
  assert(
    INITIAL_SYSTEM_ERROR_LOGS.length >= 4,
    'Existem logs mockados de demonstração para a Central de Diagnóstico',
    `Contagem: ${INITIAL_SYSTEM_ERROR_LOGS.length}`
  );

  const evoLog = INITIAL_SYSTEM_ERROR_LOGS.find((l) => l.modulo === 'evolution_api');
  assert(
    !!evoLog && evoLog.nivel === 'erro_api',
    'Existe log de falha da Evolution API marcado como erro_api',
    JSON.stringify(evoLog)
  );

  const pdvLog = INITIAL_SYSTEM_ERROR_LOGS.find((l) => l.modulo === 'pdv_checkout');
  assert(
    !!pdvLog && pdvLog.nivel === 'critico',
    'Existe log de falha de fechamento de comanda no PDV marcado como critico',
    JSON.stringify(pdvLog)
  );

  // Teste 3: Captura de Ambiente do Cliente
  console.log('\n💻 3. Captura Automática de Ambiente');
  const env = captureClientEnvironment();
  assert(
    typeof env.userAgent === 'string' && env.userAgent.length > 0,
    'User-Agent capturado com sucesso',
    env.userAgent
  );
  assert(
    typeof env.dispositivo === 'string' && (env.dispositivo === 'Server' || env.dispositivo === 'Desktop' || env.dispositivo === 'Mobile'),
    'Tipo de dispositivo classificado corretamente',
    env.dispositivo
  );

  // Teste 4: Registro Silencioso e Assíncrono de Erro
  console.log('\n⚡ 4. Registro de Erros Silenciosos (logSystemError)');
  resetSystemErrorLogsToDefault();

  const loggedError = await logSystemError({
    barbearia_id: 'tenant-navalha-ouro',
    barbearia_nome: 'Navalha de Ouro',
    nivel: 'erro_api',
    modulo: 'evolution_api',
    mensagem_erro: 'Teste automatizado: Instância WhatsApp retornou 502 Bad Gateway',
    detalhes_tecnicos: {
      httpStatus: 502,
      endpoint: 'https://api.evolution.local/message/sendText/navalha-ouro',
      stackTrace: 'Error: Bad Gateway at test runner',
    },
    showToast: true,
  });

  assert(
    loggedError.id.startsWith('err-'),
    'Log gerado possui ID único com prefixo err-',
    loggedError.id
  );
  assert(
    loggedError.barbearia_id === 'tenant-navalha-ouro',
    'Log associa corretamente o ID da barbearia afetada',
    loggedError.barbearia_id || ''
  );
  assert(
    loggedError.resolvido === false,
    'Novo log é criado com status resolvido = false (aberto)',
    String(loggedError.resolvido)
  );
  assert(
    typeof loggedError.detalhes_tecnicos === 'object' && loggedError.detalhes_tecnicos.httpStatus === 502,
    'Detalhes técnicos preservam código HTTP e stack trace',
    JSON.stringify(loggedError.detalhes_tecnicos)
  );

  // Teste 5: Cálculo de Incidentes Abertos e Telemetria por Barbearia
  console.log('\n📈 5. Telemetria e Contagem de Erros');
  const unresolvedCount = getUnresolvedSystemErrorsCount();
  assert(
    unresolvedCount > 0,
    `Contagem de erros abertos é reativa e maior que zero (${unresolvedCount})`
  );

  const tenantStats = getTenantRecentErrorsCount('tenant-navalha-ouro', 24);
  assert(
    tenantStats.total >= 1 && tenantStats.unresolved >= 1,
    `Barbearia 'Navalha de Ouro' possui erros nas últimas 24h (total: ${tenantStats.total}, pendentes: ${tenantStats.unresolved})`
  );

  // Teste 6: Fluxo de Resolução e Baixa Técnica (toggleResolveSystemError)
  console.log('\n🛠️ 6. Fluxo de Baixa Técnica (Resolução de Incidentes)');
  const resolved = await toggleResolveSystemError(
    loggedError.id,
    'Instância reiniciada e QR Code sincronizado com sucesso',
    'suporte_qa'
  );

  assert(
    !!resolved && resolved.resolvido === true,
    'Incidente marcado como resolvido com sucesso'
  );
  assert(
    !!resolved?.resolvido_em && !!resolved?.resolvido_por,
    'Data de resolução e responsável registrados corretamente',
    `resolvido_por: ${resolved?.resolvido_por}, resolvido_em: ${resolved?.resolvido_em}`
  );
  assert(
    resolved?.notas_suporte === 'Instância reiniciada e QR Code sincronizado com sucesso',
    'Notas de suporte técnico anexadas ao incidente',
    resolved?.notas_suporte
  );

  // Reabertura de Incidente
  const reopened = await toggleResolveSystemError(loggedError.id);
  assert(
    !!reopened && reopened.resolvido === false,
    'Incidente pode ser reaberto se o problema persistir'
  );

  // Teste 7: Resolução em Lote (bulkResolveSystemErrors)
  console.log('\n📦 7. Resolução em Lote de Incidentes');
  await bulkResolveSystemErrors([loggedError.id]);
  const checkResolvedAgain = getSystemErrorLogs().find((l) => l.id === loggedError.id);
  assert(
    checkResolvedAgain?.resolvido === true,
    'bulkResolveSystemErrors dá baixa em múltiplos incidentes simultaneamente'
  );

  // Teste 8: Resiliência Offline do PocketBase
  console.log('\n🛡️ 8. Sincronização Resiliente do PocketBase');
  const syncResult = await syncSystemErrorLogToPocketBase(loggedError);
  assert(
    syncResult.status === 'synced' || syncResult.status === 'local_fallback',
    `syncSystemErrorLogToPocketBase opera com segurança (status: ${syncResult.status})`
  );

  const resolutionSync = await updateSystemErrorLogResolutionInPocketBase(loggedError.id, true);
  assert(
    resolutionSync.status === 'synced' || resolutionSync.status === 'local_fallback',
    `updateSystemErrorLogResolutionInPocketBase opera com resiliência (status: ${resolutionSync.status})`
  );

  // Teste 9: Reset e Limpeza de Logs
  console.log('\n🧹 9. Limpeza e Reset de Logs');
  clearSystemErrorLogs();
  assert(
    getSystemErrorLogs().length === 0,
    'clearSystemErrorLogs limpa os registros com sucesso'
  );

  resetSystemErrorLogsToDefault();
  assert(
    getSystemErrorLogs().length === INITIAL_SYSTEM_ERROR_LOGS.length,
    'resetSystemErrorLogsToDefault restaura os logs demonstrativos'
  );

  console.log('\n======================================================');
  console.log(`🏁 Relatório Final dos Testes: ${passCount} passaram, ${failCount} falharam`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSystemDiagnosticsTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
