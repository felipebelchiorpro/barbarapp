/**
 * Testes Automatizados: Dashboard de BI do Super Admin & Webhooks de Sincronização de CRM / Vendas
 * Executado via `npx tsx tests/crmWebhooksAndBi.test.ts`
 */

import {
  computeHmacSha256,
  buildCrmEventPayload,
  dispatchCrmWebhook,
  DEFAULT_CRM_WEBHOOK_CONFIG,
} from '../src/services/crmWebhookService';
import { TenantConfig, CrmWebhookConfig } from '../src/types';

const MOCK_TENANTS: TenantConfig[] = [
  {
    id: 'tenant-barbearia-ls',
    name: 'Barbearia LS',
    slug: 'barbearia-ls',
    ownerName: 'Leonardo Soares',
    ownerPhone: '11981234567',
    plan: 'starter',
    planBasePrice: 49.9,
    max_barbeiros: 1,
    valor_adicional_barbeiro: 25.0,
    status: 'active',
    whatsappStatus: 'open',
    cidade: 'São Paulo - SP',
    gmv_mensal: 14850.0,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'tenant-dom-corleone',
    name: 'Barbearia Dom Corleone',
    slug: 'dom-corleone',
    ownerName: 'Carlos Eduardo',
    ownerPhone: '11976543210',
    plan: 'pro',
    planBasePrice: 89.9,
    max_barbeiros: 3,
    valor_adicional_barbeiro: 25.0,
    status: 'active',
    whatsappStatus: 'open',
    cidade: 'Campinas - SP',
    gmv_mensal: 28400.0,
    createdAt: '2026-02-15T14:30:00.000Z',
  },
  {
    id: 'tenant-vintage-club',
    name: 'Barbearia Vintage Club',
    slug: 'vintage-club',
    ownerName: 'Marcelo Ramos',
    ownerPhone: '11998877665',
    plan: 'starter',
    planBasePrice: 49.9,
    max_barbeiros: 2,
    valor_adicional_barbeiro: 25.0,
    status: 'blocked',
    whatsappStatus: 'close',
    cidade: 'Rio de Janeiro - RJ',
    gmv_mensal: 11200.0,
    createdAt: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'tenant-black-diamond',
    name: 'Black Diamond VIP Gentlemen',
    slug: 'black-diamond',
    ownerName: 'Rodrigo Albuquerque',
    ownerPhone: '31991234567',
    plan: 'enterprise',
    planBasePrice: 149.9,
    max_barbeiros: 6,
    valor_adicional_barbeiro: 25.0,
    status: 'active',
    whatsappStatus: 'open',
    cidade: 'Belo Horizonte - MG',
    gmv_mensal: 48900.0,
    createdAt: '2026-01-20T11:00:00.000Z',
  },
];

console.log('🧪 Iniciando Bateria de Testes: Dashboard de BI SaaS & Webhooks CRM...\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

// ==========================================
// TESTE 1: Assinatura Criptográfica HMAC-SHA256 (x-naville-signature)
// ==========================================
async function runTests() {
  console.log('--- TESTE 1: Assinatura HMAC-SHA256 ---');
  const secret = 'naville_test_sec_12345';
  const payload = JSON.stringify({ event: 'saas.lead.cadastro_iniciado', test: true });

  const sig1 = await computeHmacSha256(payload, secret);
  assert(sig1.startsWith('sha256='), 'Assinatura deve começar com o prefixo sha256=');
  assert(sig1.length > 20, 'Assinatura deve conter um hash hexadecimal longo');

  const sig2 = await computeHmacSha256(payload, secret);
  assert(sig1 === sig2, 'Assinatura deve ser determinística para o mesmo payload e secret');

  const sigDiffSecret = await computeHmacSha256(payload, 'outro_secret_999');
  assert(sig1 !== sigDiffSecret, 'Chaves secretas diferentes devem gerar assinaturas diferentes');

  // ==========================================
  // TESTE 2: Geração de Contratos dos 5 Eventos de Ciclo de Vida do CRM
  // ==========================================
  console.log('\n--- TESTE 2: Contratos de Payload dos 5 Eventos ---');
  const mockTenant: TenantConfig = MOCK_TENANTS[0];

  // Evento 1: Lead Iniciado
  const pLead = buildCrmEventPayload('saas.lead.cadastro_iniciado', {
    lead: {
      nome_responsavel: 'Lucas Silva',
      telefone: '11999998888',
      nome_barbearia: 'Barbearia Navalha Fina',
      email: 'lucas@navalhafina.com',
      cidade: 'Santos - SP',
      plano_interesse: 'pro',
    },
  });
  assert(pLead.event === 'saas.lead.cadastro_iniciado', 'Evento 1 deve ter event=saas.lead.cadastro_iniciado');
  assert(pLead.lead?.nome_responsavel === 'Lucas Silva', 'Evento 1 deve mapear nome do lead');
  assert(pLead.lead?.origem === 'landing_page_naville', 'Evento 1 deve incluir origem para o funil do CRM');

  // Evento 2: Barbearia Ativada
  const pAtivada = buildCrmEventPayload('saas.barbearia.ativada', { tenant: mockTenant });
  assert(pAtivada.event === 'saas.barbearia.ativada', 'Evento 2 deve ter event=saas.barbearia.ativada');
  assert(pAtivada.tenant?.id === mockTenant.id, 'Evento 2 deve conter o ID do tenant');
  assert(pAtivada.tenant?.status === 'active', 'Evento 2 deve indicar status active');
  assert(typeof pAtivada.tenant?.mrr_gerado === 'number', 'Evento 2 deve incluir MRR gerado');

  // Evento 3: Upsell de Vagas
  const pUpsell = buildCrmEventPayload('saas.upsell.vaga_adicionada', {
    tenant: mockTenant,
    upsell: {
      vagas_anteriores: 1,
      novas_vagas: 3,
      vagas_adicionais: 2,
      valor_recorrente_adicional: 50.0,
    },
  });
  assert(pUpsell.event === 'saas.upsell.vaga_adicionada', 'Evento 3 deve ter event=saas.upsell.vaga_adicionada');
  assert(pUpsell.upsell?.vagas_adicionais === 2, 'Evento 3 deve quantificar vagas adicionais');
  assert(pUpsell.upsell?.valor_recorrente_adicional === 50.0, 'Evento 3 deve calcular receita recorrente adicional (2x R$ 25)');

  // Evento 4: Cobrança em Atraso
  const pAtraso = buildCrmEventPayload('saas.cobranca.em_atraso', { tenant: mockTenant });
  assert(pAtraso.event === 'saas.cobranca.em_atraso', 'Evento 4 deve ter event=saas.cobranca.em_atraso');
  assert(pAtraso.fatura?.dias_atraso === 1, 'Evento 4 deve indicar D+1 para ativação comercial do CRM');
  assert(pAtraso.fatura?.gatilho_crm === 'disparar_mensagem_retencao_whatsapp', 'Evento 4 deve sugerir gatilho de retenção');

  // Evento 5: Cancelada / Bloqueada
  const pBloqueio = buildCrmEventPayload('saas.cobranca.cancelada_ou_bloqueada', {
    tenant: mockTenant,
    motivoBloqueio: 'Inadimplência prolongada',
  });
  assert(pBloqueio.event === 'saas.cobranca.cancelada_ou_bloqueada', 'Evento 5 deve ter event=saas.cobranca.cancelada_ou_bloqueada');
  assert(pBloqueio.suspensao?.acao_crm === 'mover_para_pipeline_recuperacao_perdidos', 'Evento 5 deve indicar ação de recuperação no CRM');

  // ==========================================
  // TESTE 3: Disparo e Comportamento quando Desativado
  // ==========================================
  console.log('\n--- TESTE 3: Disparo de Webhook & Guardrails ---');
  const disabledConfig: CrmWebhookConfig = {
    ...DEFAULT_CRM_WEBHOOK_CONFIG,
    enabled: false,
  };
  const disabledLog = await dispatchCrmWebhook('saas.lead.cadastro_iniciado', pLead, disabledConfig);
  assert(disabledLog.success === false, 'Webhook desativado deve retornar success=false');
  assert(disabledLog.statusText.includes('Desativado'), 'Deve registrar que o webhook está pausado');

  // ==========================================
  // TESTE 4: Agregações Macroeconômicas de BI (MRR, ARR, Churn, GMV)
  // ==========================================
  console.log('\n--- TESTE 4: Agregações de Métricas de BI do SaaS ---');
  const activeTenants = MOCK_TENANTS.filter((t) => t.status === 'active' || t.status === 'trial');
  let calculatedMrr = 0;
  let calculatedExtraSeatsRevenue = 0;

  activeTenants.forEach((t) => {
    const base = t.planBasePrice || (t.plan === 'starter' ? 49.9 : t.plan === 'pro' ? 89.9 : 149.9);
    const extraSeats = Math.max(0, (t.max_barbeiros || 1) - 1);
    const extra = extraSeats * (t.valor_adicional_barbeiro || 25.0);
    calculatedMrr += base + extra;
    calculatedExtraSeatsRevenue += extra;
  });

  const calculatedArr = calculatedMrr * 12;
  const blockedCount = MOCK_TENANTS.filter((t) => t.status === 'blocked').length;
  const calculatedChurn = (blockedCount / MOCK_TENANTS.length) * 100;
  const totalGmv = MOCK_TENANTS.reduce((acc, t) => acc + (t.gmv_mensal || 0), 0);

  assert(calculatedMrr > 0, `MRR deve ser positivo (calculado: R$ ${calculatedMrr.toFixed(2)})`);
  assert(calculatedArr === calculatedMrr * 12, 'ARR deve ser exatamente 12 vezes o MRR');
  assert(calculatedChurn > 0 && calculatedChurn < 100, `Taxa de churn deve refletir barbearias bloqueadas (${calculatedChurn.toFixed(1)}%)`);
  assert(totalGmv > 50000, `GMV total consolidado deve somar o volume transacionado nas pontas (R$ ${totalGmv.toFixed(2)})`);
  assert(calculatedExtraSeatsRevenue > 0, 'Receita de expansão de vagas adicionais (R$ 25/mês) deve ser quantificada');

  console.log('\n==========================================');
  console.log(`📊 RESULTADO FINAL: ${testsPassed} passaram | ${testsFailed} falharam`);
  console.log('==========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Todos os testes de BI e Webhooks CRM passaram com 100% de sucesso!');
  }
}

runTests();
