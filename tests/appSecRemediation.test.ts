import assert from 'node:assert';
import { enforceMultiTenantAccess } from '../src/services/pocketbaseApiRules';
import { sanitizeString, sanitizeUrl } from '../src/utils/securitySanitizer';
import { getSafeTenantInstanceName } from '../src/server/whatsappProxyService';
import { AuthUser } from '../src/types';

console.log('======================================================');
console.log('🛡️ SUITE: AUDITORIA DEFENSIVA & REMEDIAÇÃO APPSEC');
console.log('======================================================\n');

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. RBAC & Isolamento Multi-Tenant
console.log('📌 Bloco 1: RBAC Interno & Isolamento Multi-Tenant');

const barberUser: AuthUser = {
  id: 'usr-barber-1',
  email: 'carlos@navalha.com',
  name: 'Carlos Barbeiro',
  role: 'barber',
  barbearia_id: 'tenant-navalha',
  barber_id: 'barber-carlos-123',
  status: 'active',
  createdAt: new Date().toISOString(),
};

const ownerUser: AuthUser = {
  id: 'usr-owner-1',
  email: 'dono@navalha.com',
  name: 'Seu Zé Dono',
  role: 'owner',
  barbearia_id: 'tenant-navalha',
  status: 'active',
  createdAt: new Date().toISOString(),
};

test('Barbeiro é BLOQUEADO de listar ou visualizar vendas de outros barbeiros em vendas_balcao', () => {
  const result = enforceMultiTenantAccess(barberUser, 'cash_transactions', 'view', {
    barbearia_id: 'tenant-navalha',
    barberId: 'barber-outro-456',
    valor_total: 150,
  });
  assert.strictEqual(result.allowed, false, 'Deveria bloquear acesso à venda de outro barbeiro');
  assert.strictEqual(result.code, 403);
});

test('Barbeiro pode visualizar e registrar suas PRÓPRIAS vendas em vendas_balcao', () => {
  const result = enforceMultiTenantAccess(barberUser, 'cash_transactions', 'view', {
    barbearia_id: 'tenant-navalha',
    barberId: 'barber-carlos-123',
    valor_total: 80,
  });
  assert.strictEqual(result.allowed, true, 'Deveria permitir visualização de sua própria comanda');
});

test('Barbeiro é BLOQUEADO de alterar ou criar produtos e preços', () => {
  const result = enforceMultiTenantAccess(barberUser, 'products', 'update', {
    barbearia_id: 'tenant-navalha',
    nome: 'Pomada Matte',
    preco_venda: 10,
  });
  assert.strictEqual(result.allowed, false, 'Barbeiro não pode atualizar produtos');
  assert.strictEqual(result.code, 403);
});

test('Dono da barbearia é BLOQUEADO de alterar plano SaaS ou zerar mensalidade diretamente (Anti-BFLA)', () => {
  const result = enforceMultiTenantAccess(ownerUser, 'tenants', 'update', {
    id: 'tenant-navalha',
    plan: 'enterprise',
    plan_base_price: 0,
    max_barbeiros: 999,
  });
  assert.strictEqual(result.allowed, false, 'Dono não pode auto-promover seu plano');
  assert.strictEqual(result.code, 403);
});

test('Dono da barbearia pode atualizar dados comerciais comuns de sua barbearia', () => {
  const result = enforceMultiTenantAccess(ownerUser, 'tenants', 'update', {
    id: 'tenant-navalha',
    nome_fantasia: 'Navalha de Ouro Nova',
    logradouro: 'Rua Augusta, 500',
  });
  assert.strictEqual(result.allowed, true, 'Dono pode alterar nome e endereço');
});

// 2. Evolution API & Isolamento de Instâncias
console.log('\n📌 Bloco 2: Superfície da Evolution API & Isolamento de Instâncias');

test('getSafeTenantInstanceName sanitiza tenant ID e gera namespace único imutável', () => {
  const instance1 = getSafeTenantInstanceName('tenant-navalha');
  assert.strictEqual(instance1, 'tenant_tenant-navalha');

  const instance2 = getSafeTenantInstanceName('../../malicious/path');
  assert.ok(!instance2.includes('.'), 'Não deve permitir path traversal no nome da instância');
  assert.ok(!instance2.includes('/'), 'Não deve permitir barras no nome da instância');
});

// 3. Sanitização & Prevenção XSS
console.log('\n📌 Bloco 3: Sanitização de Entradas & Prevenção XSS');

test('sanitizeUrl bloqueia pseudoprotocolos javascript: e data:', () => {
  assert.strictEqual(sanitizeUrl('javascript:alert(1)'), '');
  assert.strictEqual(sanitizeUrl('JAVASCRIPT:alert(1)'), '');
  assert.strictEqual(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.strictEqual(sanitizeUrl('vbscript:msgbox(1)'), '');
});

test('sanitizeUrl aceita URLs válidas com protocolo HTTPS ou HTTP', () => {
  assert.strictEqual(sanitizeUrl('https://naville.app/logo.png'), 'https://naville.app/logo.png');
  assert.strictEqual(sanitizeUrl('http://localhost:3000/avatar.jpg'), 'http://localhost:3000/avatar.jpg');
});

test('sanitizeString remove tags script aninhadas (bypass de regex simples)', () => {
  const malicious = '<scr<script>ipt>alert("XSS")</script>';
  const cleaned = sanitizeString(malicious);
  assert.ok(!cleaned.includes('<script>'));
  assert.ok(!cleaned.includes('</script>'));
  assert.ok(!cleaned.includes('alert'));
});

test('sanitizeString remove manipuladores de eventos on* embutidos', () => {
  const malicious = '<img src=x onerror=alert(1)>';
  const cleaned = sanitizeString(malicious);
  assert.ok(!cleaned.includes('onerror'));
  assert.ok(!cleaned.includes('<img'));
});

console.log('\n======================================================');
console.log(`🎉 TODOS OS ${passed} TESTES DE REMEDIAÇÃO APPSEC PASSARAM!`);
console.log('======================================================\n');
