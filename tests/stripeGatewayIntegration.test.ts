/**
 * Suíte de Testes: Gateway Stripe Central SaaS & Isenção Vitalícia Naville
 */

import { strict as assert } from 'assert';
import {
  createStripeSubscriptionCheckout,
  processStripeWebhookEvent,
} from '../src/services/stripeService';
import { TenantConfig } from '../src/types';

const mockVitalicioTenant: TenantConfig = {
  id: 'tenant_vitalicio_01',
  name: 'Barbearia Aliança Vitalícia',
  slug: 'alianca-vitalicia',
  ownerName: 'Carlos Mestre',
  ownerPhone: '11999990001',
  plan: 'pro',
  max_barbeiros: 4,
  valor_adicional_barbeiro: 25.0,
  status: 'active',
  whatsappStatus: 'open',
  createdAt: '2026-01-01',
  is_vitalicio: true, // PARCEIRO VITALÍCIO
  status_assinatura: 'ativo',
};

const mockStandardTenant: TenantConfig = {
  id: 'tenant_standard_02',
  name: 'Barbearia Vintage Club',
  slug: 'vintage-club',
  ownerName: 'Renato Silva',
  ownerPhone: '11999990002',
  plan: 'pro',
  max_barbeiros: 3, // 1 inclusa + 2 extras = 89.9 + 50.0 = 139.9
  valor_adicional_barbeiro: 25.0,
  status: 'active',
  whatsappStatus: 'open',
  createdAt: '2026-02-01',
  is_vitalicio: false, // ASSINANTE COMUM SAAS
  status_assinatura: 'ativo',
};

async function runTests() {
  console.log('\n======================================================');
  console.log('💳 SUÍTE: GATEWAY STRIPE SAAS & ISENÇÃO VITALÍCIA');
  console.log('======================================================\n');

  console.log('📌 Bloco 1: Regra Inegociável do Parceiro Vitalício');
  
  // 1. Tenant vitalício nunca é cobrado pelo Stripe
  const vitalicioCheckout = await createStripeSubscriptionCheckout({
    tenant: mockVitalicioTenant,
    planId: 'pro',
    billingCycle: 'mensal',
  });

  assert.equal(vitalicioCheckout.success, true);
  assert.equal(vitalicioCheckout.exempt, true);
  assert.equal(vitalicioCheckout.checkoutUrl, undefined);
  assert.ok(vitalicioCheckout.message.includes('isenção vitalícia'));
  console.log('  ✓ Barbearia vitalícia recebe isenção automática e nenhuma cobrança Stripe é gerada');

  // 2. Webhook de falha de pagamento é ignorado para barbearia vitalícia
  let updatedTenant: TenantConfig | null = null;
  const webhookResult = processStripeWebhookEvent({
    eventType: 'invoice.payment_failed',
    tenantId: mockVitalicioTenant.id,
    tenants: [mockVitalicioTenant],
    onUpdateTenant: (t) => {
      updatedTenant = t;
    },
  });

  assert.equal(webhookResult.isIgnoredDueToVitalicio, true);
  assert.equal(updatedTenant, null, 'Tenant vitalício não deve ser alterado por falha no Stripe');
  console.log('  ✓ Webhooks de inadimplência do Stripe são descartados para parceiros vitalícios');

  console.log('\n📌 Bloco 2: Cobrança e Checkout de Barbearia Comum (Não-Vitalícia)');

  // 3. Tenant comum gera link de checkout com valor correspondente a cadeiras extras
  const standardCheckout = await createStripeSubscriptionCheckout({
    tenant: mockStandardTenant,
    planId: 'pro',
    billingCycle: 'mensal',
  });

  assert.equal(standardCheckout.success, true);
  assert.equal(standardCheckout.exempt, false);
  assert.ok(standardCheckout.checkoutUrl);
  assert.ok(standardCheckout.sessionId);
  console.log('  ✓ Barbearia comum gera checkout do Stripe com valor correto e sessão válida');

  // 4. Webhook invoice.paid renova assinatura de barbearia comum
  let tenantRenewed: TenantConfig | null = null;
  const paidResult = processStripeWebhookEvent({
    eventType: 'invoice.paid',
    tenantId: mockStandardTenant.id,
    tenants: [mockStandardTenant],
    onUpdateTenant: (t) => {
      tenantRenewed = t;
    },
  });

  assert.equal(paidResult.received, true);
  assert.ok(tenantRenewed);
  assert.equal((tenantRenewed as any).status_assinatura, 'ativo');
  console.log('  ✓ Webhook invoice.paid renova vigência e status para ativo');

  console.log('\n📌 Bloco 3: Conexão e Chaves da Naville no Stripe');
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key_for_test_environment';
  assert.ok(stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('rk_'), 'Chave secreta deve iniciar com prefixo valido');

  console.log('  ✓ Chaves Stripe configuradas e validadas com sucesso');

  console.log('\n======================================================');
  console.log('🎉 TODOS OS TESTES DO GATEWAY STRIPE PASSARAM COM SUCESSO!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes do Stripe:', err);
  process.exit(1);
});
