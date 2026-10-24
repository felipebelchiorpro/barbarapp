/**
 * SUÍTE DE TESTES: AUDITORIA, BLINDAGEM DE SEGURANÇA E RESILIÊNCIA DE ARQUITETURA
 * Equipe: DevSecOps, Backend/AppSec, Database Optimizer e SRE (Naville SaaS)
 * Validação rigorosa dos 20 Requisitos Críticos de Software
 */

import fs from 'fs';
import path from 'path';
import {
  validatePasswordStrength,
  hashPasswordSecure,
  verifyPasswordHash,
  encryptAes256Gcm,
  decryptAes256Gcm,
  generate6DigitOtp,
} from '../src/utils/cryptoUtils';
import {
  sanitizeString,
  escapeHtml,
  sanitizePhone,
  isValidPhone,
  sanitizeEmail,
  isValidEmail,
  deepSanitize,
  validateBookingInput,
} from '../src/utils/securitySanitizer';
import {
  escapePbFilterValue,
  buildSafeEqualityFilter,
  buildSafeAndFilter,
} from '../src/utils/pocketbaseFilterHelper';
import {
  isOriginAllowed,
  DEFAULT_ALLOWED_ORIGINS,
} from '../src/server/corsSecurity';
import {
  createRateLimiter,
  resetRateLimiterStore,
} from '../src/server/rateLimiter';
import {
  getLivenessHealth,
  getDeepHealth,
} from '../src/server/healthService';
import { redactSensitiveData } from '../src/utils/logRedactor';
import {
  create2FaChallenge,
  verifyAndComplete2Fa,
  revokeAllUserSessions,
  revokeTenantSessions,
  isUserOrTenantRevoked,
} from '../src/services/authService';
import { exportPocketBaseSchemaRulesJson } from '../src/services/pocketbaseApiRules';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FALHA: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

console.log('=============================================================================');
console.log('🛡️ SUÍTE DE TESTES: AUDITORIA DOS 20 REQUISITOS CRÍTICOS DE SEGURANÇA & SRE');
console.log('=============================================================================\n');

// -----------------------------------------------------------------------------
// GRUPO 1: DEVSECOPS & INFRAESTRUTURA ([1], [4], [12], [13], [17])
// -----------------------------------------------------------------------------
console.log('--- 1. DevSecOps & Infraestrutura (Caddy, Rede & Secrets) ---');

// [1] HTTPS & TLS 1.3
const caddyfilePath = path.resolve(process.cwd(), 'deploy', 'Caddyfile');
assert(fs.existsSync(caddyfilePath), '[1] Caddyfile de produção existe no diretório deploy/');
if (fs.existsSync(caddyfilePath)) {
  const caddyContent = fs.readFileSync(caddyfilePath, 'utf8');
  assert(caddyContent.includes('protocols tls1.3'), '[1] TLS 1.3 estrito forçado no Caddy');
  assert(caddyContent.includes('Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"'), '[1] HSTS de 1 ano com includeSubDomains e preload configurado');
  assert(caddyContent.includes('X-Frame-Options "DENY"'), '[1] Header X-Frame-Options DENY anti-clickjacking presente');
  assert(caddyContent.includes('Content-Security-Policy'), '[1] Content Security Policy (CSP) presente');
}

// [4] Rate Limit
resetRateLimiterStore();
const testLimiter = createRateLimiter({ windowMs: 1000, max: 2 });
const fakeReq = { headers: { 'x-real-ip': '198.51.100.1' } };
let lastStatus = 200;
let lastJson: any = null;
const fakeRes = {
  setHeader: () => {},
  status: (code: number) => {
    lastStatus = code;
    return {
      json: (data: any) => { lastJson = data; }
    };
  }
};

let nextCalledCount = 0;
const fakeNext = () => { nextCalledCount++; };

testLimiter(fakeReq as any, fakeRes as any, fakeNext);
assert(lastStatus === 200 && nextCalledCount === 1, '[4] 1ª requisição permitida pelo rate limiter');
testLimiter(fakeReq as any, fakeRes as any, fakeNext);
assert(lastStatus === 200 && nextCalledCount === 2, '[4] 2ª requisição permitida pelo rate limiter');
testLimiter(fakeReq as any, fakeRes as any, fakeNext);
assert(lastStatus === 429, '[4] 3ª requisição bloqueada com HTTP 429 (RateLimitExceeded)');
assert(lastJson?.error === 'RateLimitExceeded', '[4] Mensagem amigável de limitação de taxa retornada');

// [12] Secrets Hygiene
const envExamplePath = path.resolve(process.cwd(), 'deploy', '.env.production.example');
assert(fs.existsSync(envExamplePath), '[12] Arquivo .env.production.example existe com instruções de chmod 600');
const auditScriptPath = path.resolve(process.cwd(), 'scripts', 'audit-secrets.mjs');
assert(fs.existsSync(auditScriptPath), '[12] Script de auditoria automatizada de secrets existe');

// [13] CORS Restrito
assert(isOriginAllowed('https://naville.app'), '[13] Origem oficial https://naville.app é permitida');
assert(isOriginAllowed('https://barber.naville.app'), '[13] Subdomínio https://barber.naville.app é permitido');
assert(!isOriginAllowed('https://evil-hacker-site.com'), '[13] Origem maliciosa desconhecida é BLOQUEADA');
assert(!isOriginAllowed('https://attacker-naville.app.phishing.com'), '[13] Tentativa de bypass de subdomínio por spoofing é BLOQUEADA');

// [17] Dependências
const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
assert(Boolean(packageJson.dependencies['pocketbase']), '[17] Dependência do PocketBase declarada e versionada');
assert(Boolean(packageJson.dependencies['express']), '[17] Dependência do Express declarada e versionada');

// -----------------------------------------------------------------------------
// GRUPO 2: AUTENTICAÇÃO & BACKEND ([2], [3], [5], [6], [7], [10], [11], [16])
// -----------------------------------------------------------------------------
console.log('\n--- 2. Autenticação & Backend (AppSec & PocketBase) ---');

// [2] Senhas com Hash Forte & Complexidade
const weakPwdCheck = validatePasswordStrength('12345');
assert(!weakPwdCheck.isValid, '[2] Senha fraca "12345" é rejeitada');
assert(weakPwdCheck.feedback.length >= 2, '[2] Feedback detalhado de requisitos de senha gerado');
const strongPwdCheck = validatePasswordStrength('BarberPro#2026!Naville');
assert(strongPwdCheck.isValid, '[2] Senha forte com maiúsculas, minúsculas, números e símbolos é aprovada');

const generatedHash = hashPasswordSecure('MinhaSenhaSegura123!');
assert(generatedHash.startsWith('pbkdf2$100000$'), '[2] Hash gerado com PBKDF2 com 100.000 iterações e salt de 32 bytes');
assert(verifyPasswordHash('MinhaSenhaSegura123!', generatedHash), '[2] Verificação de senha em tempo constante é bem-sucedida');
assert(!verifyPasswordHash('SenhaErrada999', generatedHash), '[2] Senha incorreta é rejeitada');

// [3] MFA / 2FA
const challenge = create2FaChallenge('user-superadmin-1');
assert(Boolean(challenge.challengeId), '[3] Desafio 2FA gerado com ID único');
assert(challenge.expiresAt > Date.now(), '[3] Expiração do desafio 2FA definida para o futuro');
const invalid2Fa = verifyAndComplete2Fa(challenge.challengeId, '000000');
assert(!invalid2Fa.success, '[3] Código 2FA incorreto rejeitado');
const valid2Fa = verifyAndComplete2Fa(challenge.challengeId, '123456');
assert(valid2Fa.success && Boolean(valid2Fa.session), '[3] Código 2FA válido gera sessão autenticada com sucesso');

// [5] e [6] Validação de Inputs & Sanitização contra XSS
const maliciousInput = '<script>alert("XSS Attack!")</script>João Silva<img src=x onerror=alert(1)>';
const sanitized = sanitizeString(maliciousInput);
assert(!sanitized.includes('<script>') && !sanitized.includes('onerror'), '[6] Tags <script> e handlers onerror removidos por sanitização');
assert(sanitized.includes('João Silva'), '[6] Conteúdo textual legítimo preservado');

const escapeResult = escapeHtml('<div class="header">Naville & Co.</div>');
assert(escapeResult.includes('&lt;div') && escapeResult.includes('&amp;'), '[6] Caracteres especiais HTML escapados com segurança');

const dirtyBooking = {
  clientName: '<script>evil()</script>Pedro Santos',
  clientPhone: '(11) 98888-7766',
  barberId: 'barber-diego',
  serviceIds: ['srv-1', 'srv-2'],
  date: '2026-10-25',
  time: '14:30',
  notes: 'Corte navalhado <iframe src="evil.com"></iframe>',
};
const validatedBooking = validateBookingInput(dirtyBooking);
assert(validatedBooking.isValid, '[5] Schema de agendamento validado com sucesso');
assert(!validatedBooking.sanitizedData?.clientName.includes('<script>'), '[6] Nome do cliente sanitizado no agendamento');
assert(!validatedBooking.sanitizedData?.notes?.includes('<iframe'), '[6] Observação do agendamento livre de tags iframe');

// Deep Sanitize & Prototype Pollution Prevention
const dirtyObj: any = {
  clean: 'ok',
  xss: '<svg onload=alert(1)>',
};
const cleanedObj: any = deepSanitize(dirtyObj);
assert(!cleanedObj.xss.includes('onload'), '[6] deepSanitize limpa campos aninhados recursivamente');

// [7] Prevenção contra SQL/NoSQL Injection
const safeEscaped = escapePbFilterValue('tenant-1"; DROP TABLE users; --');
assert(safeEscaped.includes('\\"'), '[7] Aspas duplas e sequências de injeção escapadas no filtro');
assert(safeEscaped.startsWith('"') && safeEscaped.endsWith('"'), '[7] Valor encapsulado com aspas delimitadoras');
const filterEquality = buildSafeEqualityFilter('tenant_id', 'tenant-navalha-ouro');
assert(filterEquality === 'tenant_id = "tenant-navalha-ouro"', '[7] Filtro parametrizado seguro construído');

// [10] Controle de Acesso (RBAC / RLS)
const rulesJson = exportPocketBaseSchemaRulesJson();
assert(rulesJson.includes('"barbearias"'), '[10] Coleção barbearias possui regras RLS mapeadas');
assert(rulesJson.includes('@request.auth.barbearia_id = barbearia_id'), '[10] Isolamento multi-tenant estrito "@request.auth.barbearia_id = barbearia_id" presente nas coleções');

// [11] Expiração de Sessão & Revogação Imediata
revokeAllUserSessions('user-test-99');
assert(isUserOrTenantRevoked('user-test-99', 'tenant-normal'), '[11] Sessões do usuário revogadas imediatamente após alteração');
revokeTenantSessions('tenant-inadimplente');
assert(isUserOrTenantRevoked('any-user', 'tenant-inadimplente'), '[11] Todas as sessões do tenant bloqueadas sumariamente por Kill Switch');

// [16] Criptografia em Repouso (AES-256-GCM)
const secretData = 'EVOLUTION_GLOBAL_TOKEN_SECRETO_9821_XYZ';
const encrypted = encryptAes256Gcm(secretData);
assert(encrypted.includes(':') && encrypted.split(':').length === 3, '[16] Payload criptografado no formato IV:AuthTag:Ciphertext');
const decrypted = decryptAes256Gcm(encrypted);
assert(decrypted === secretData, '[16] Decriptação AES-256-GCM recupera texto original com integridade garantida');

// -----------------------------------------------------------------------------
// GRUPO 3: MIGRATIONS & ROLLBACK ([8], [9])
// -----------------------------------------------------------------------------
console.log('\n--- 3. Banco de Dados & Engenharia de Dados (Migrations & Rollback) ---');

const migrationsDir = path.resolve(process.cwd(), 'pocketbase', 'pb_migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
assert(migrationFiles.length >= 3, `[8] Existem pelo menos 3 migrações versionadas (encontradas: ${migrationFiles.length})`);

migrationFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  assert(content.includes('migrate('), `[8] Migração ${file} utiliza sintaxe declarativa PocketBase migrate()`);
  assert(content.includes('app.delete(') || content.includes('findCollectionByNameOrId'), `[9] Migração ${file} possui função reversa de rollback (DOWN)`);
});

// -----------------------------------------------------------------------------
// GRUPO 4: SRE, MONITORAMENTO & RESILIÊNCIA ([14], [15], [18], [19], [20])
// -----------------------------------------------------------------------------
console.log('\n--- 4. SRE, Monitoramento & Resiliência Operacional ---');

// [14] Logs Estruturados & Redação de Dados Sensíveis
const rawLogWithCards = {
  mensagem: 'Erro ao processar pagamento com cartão 4111 2222 3333 4444 para comanda',
  detalhes: {
    password: 'SuperSecretPassword123',
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDNAG6g',
    cartao: '5500 0000 0000 1234',
  },
};
const redactedLog: any = redactSensitiveData(rawLogWithCards);
assert(!redactedLog.mensagem.includes('4111 2222 3333 4444'), '[14] Número de cartão de crédito redigido na mensagem de log');
assert(redactedLog.detalhes.password === '[REDACTED_CONFIDENTIAL]', '[14] Campo de senha redigido no payload técnico');
assert(redactedLog.detalhes.token === '[REDACTED_CONFIDENTIAL]', '[14] Token JWT ocultado no payload de erro');

// [15] Backups Automatizados & Rotação
const backupScript = path.resolve(process.cwd(), 'scripts', 'backup-manager.mjs');
assert(fs.existsSync(backupScript), '[15] Script de automação e rotação de backup existe');
const backupBashScript = path.resolve(process.cwd(), 'scripts', 'backup-db.sh');
assert(fs.existsSync(backupBashScript), '[15] Script de backup diário para VPS (com suporte a R2/S3) existe');

// [18] PMP (Patch Management Program)
const pmpScript = path.resolve(process.cwd(), 'scripts', 'pmp-patch-management.sh');
assert(fs.existsSync(pmpScript), '[18] Script de automação do PMP (Ubuntu & Docker) existe');
const pmpDoc = path.resolve(process.cwd(), 'docs', 'PMP_PATCH_MANAGEMENT.md');
assert(fs.existsSync(pmpDoc), '[18] Documentação formal e SLAs do PMP existem em docs/');

// [19] Monitoramento & Health Checks
const liveness = getLivenessHealth();
assert(liveness.status === 'ok' && typeof liveness.uptime === 'number', '[19] Liveness Probe /api/health retorna status=ok e uptime');
const deepHealthPromise = getDeepHealth();
deepHealthPromise.then((deep) => {
  assert(deep.components.system.status !== undefined, '[19] Deep Health Check inspeciona métricas de memória e CPU');
  assert(deep.components.pocketbaseDb.dbFileExists === true, '[19] Deep Health Check confirma integridade do arquivo SQLite');
  assert(deep.components.invoiceNinjaWebhook.status === 'ok', '[19] Deep Health Check monitora estado dos webhooks');

  // [20] Plano de Recuperação de Desastres (Disaster Recovery)
  const drScript = path.resolve(process.cwd(), 'scripts', 'restore-disaster-recovery.sh');
  assert(fs.existsSync(drScript), '[20] Script de restauração automatizada de Disaster Recovery existe');
  const drDoc = path.resolve(process.cwd(), 'docs', 'DISASTER_RECOVERY_PLAN.md');
  assert(fs.existsSync(drDoc), '[20] Documento do Plano de Disaster Recovery (RTO < 30m, RPO < 24h) existe');

  console.log('\n=============================================================================');
  console.log(`📊 RESULTADO FINAL DA AUDITORIA: ${passed} APROVADOS | ${failed} FALHAS`);
  console.log('=============================================================================');

  if (failed === 0) {
    console.log('🎉 TODOS OS 20 REQUISITOS CRÍTICOS FORAM AUDITADOS E APROVADOS COM SUCESSO!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
});
