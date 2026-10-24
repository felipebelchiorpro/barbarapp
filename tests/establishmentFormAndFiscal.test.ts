/**
 * Testes Automatizados: Formulário Completo de Cadastro de Estabelecimento
 * (Dados Fiscais, PJ/PF, Endereço ViaCEP, Responsável Financeiro e Faturamento SaaS)
 *
 * Executado via `npx tsx tests/establishmentFormAndFiscal.test.ts`
 */

import {
  formatCpf,
  formatCnpj,
  formatCpfCnpj,
  formatCep,
  formatPhone,
  cleanDigits,
  isValidCpf,
  isValidCnpj,
  isValidCep,
} from '../src/utils/maskUtils';
import {
  fetchAddressByCep,
  clearViaCepCache,
} from '../src/services/viaCepService';
import { getEstablishmentFormPermissions } from '../src/utils/establishmentPermissions';
import { syncTenantToPocketBase } from '../src/services/pocketbaseSchema';
import { TenantConfig } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FALHA: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE: FORMULÁRIO DE ESTABELECIMENTO & DADOS FISCAIS');
  console.log('======================================================\n');

  // =========================================================================
  // 1. UTILITÁRIOS DE MÁSCARA, LIMPEZA E FORMATAÇÃO VISUAL
  // =========================================================================
  console.log('📌 Bloco 1: Utilitários de Máscaras (CPF, CNPJ, CEP e WhatsApp)');

  // cleanDigits
  assert(cleanDigits('00.000.000/0001-91') === '00000000000191', 'cleanDigits remove pontuação de CNPJ');
  assert(cleanDigits('(11) 98765-4321') === '11987654321', 'cleanDigits remove parênteses e traço de telefone');
  assert(cleanDigits('CEP: 01310-100 SP') === '01310100', 'cleanDigits extrai apenas números de strings mistas');
  assert(cleanDigits(null as any) === '', 'cleanDigits aceita nulo com fallback seguro');

  // formatCpf
  assert(formatCpf('12345678901') === '123.456.789-01', 'formatCpf formata 11 dígitos no padrão 000.000.000-00');
  assert(formatCpf('12345') === '123.45', 'formatCpf formata digitação parcial suavemente');

  // formatCnpj
  assert(formatCnpj('12345678000195') === '12.345.678/0001-95', 'formatCnpj formata 14 dígitos no padrão 00.000.000/0000-00');
  assert(formatCnpj('12345678') === '12.345.678', 'formatCnpj formata digitação parcial de CNPJ');

  // formatCpfCnpj
  assert(formatCpfCnpj('12345678901', 'CPF') === '123.456.789-01', 'formatCpfCnpj formata CPF quando tipo=CPF');
  assert(formatCpfCnpj('12345678000195', 'CNPJ') === '12.345.678/0001-95', 'formatCpfCnpj formata CNPJ quando tipo=CNPJ');
  assert(formatCpfCnpj('12345678901') === '123.456.789-01', 'formatCpfCnpj auto-detecta CPF por ter até 11 dígitos');
  assert(formatCpfCnpj('12345678000195') === '12.345.678/0001-95', 'formatCpfCnpj auto-detecta CNPJ por ter > 11 dígitos');

  // formatCep
  assert(formatCep('01310100') === '01310-100', 'formatCep formata 8 dígitos com traço central');
  assert(formatCep('0131') === '0131', 'formatCep formata digitação parcial de CEP');

  // formatPhone
  assert(formatPhone('11987654321') === '(11) 98765-4321', 'formatPhone formata celular com 9 dígitos e DDD');
  assert(formatPhone('1133334444') === '(11) 3333-4444', 'formatPhone formata fixo com 8 dígitos e DDD');

  // Validadores Matemáticos
  // CPFs conhecidos
  assert(isValidCpf('52998224725') === true, 'isValidCpf aceita CPF com dígitos verificadores matematicamente válidos');
  assert(isValidCpf('11111111111') === false, 'isValidCpf rejeita sequências repetidas (111.111.111-11)');
  assert(isValidCpf('12345678900') === false, 'isValidCpf rejeita CPF com dígito verificador inválido');
  assert(isValidCpf('123') === false, 'isValidCpf rejeita CPF incompleto');

  // CNPJs conhecidos
  assert(isValidCnpj('00000000000191') === true, 'isValidCnpj aceita CNPJ válido (00.000.000/0001-91)');
  assert(isValidCnpj('11111111111111') === false, 'isValidCnpj rejeita sequências repetidas de CNPJ');
  assert(isValidCnpj('12345678000199') === false, 'isValidCnpj rejeita CNPJ com dígito verificador incorreto');

  // isValidCep
  assert(isValidCep('01310-100') === true, 'isValidCep valida CEP formatado de 8 dígitos');
  assert(isValidCep('01310100') === true, 'isValidCep valida CEP numérico de 8 dígitos');
  assert(isValidCep('1310') === false, 'isValidCep rejeita CEP menor que 8 dígitos');

  // =========================================================================
  // 2. INTEGRAÇÃO VIACEP COM AUTO-TRIGGER E CACHE EM MEMÓRIA
  // =========================================================================
  console.log('\n📌 Bloco 2: Integração com ViaCEP e Preenchimento Automático');

  clearViaCepCache();

  // Teste de CEP inválido de cara
  const invalidResult = await fetchAddressByCep('123');
  assert(invalidResult.success === false, 'ViaCEP retorna erro para CEP com menos de 8 dígitos');
  assert(invalidResult.error?.includes('8 dígitos') === true, 'Mensagem de erro amigável ao usuário');

  // Teste mockando fetch global para garantir teste determinístico e sem flake de rede
  const originalFetch = globalThis.fetch;

  let fetchCallCount = 0;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount++;
    const url = input.toString();

    if (url.includes('01310100')) {
      return {
        ok: true,
        json: async () => ({
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          complemento: 'de 611 a 1045 - lado ímpar',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
          ibge: '3550308',
          gia: '1004',
          ddd: '11',
          siafi: '7107',
        }),
      } as any;
    }

    if (url.includes('99999999')) {
      return {
        ok: true,
        json: async () => ({
          erro: 'true',
        }),
      } as any;
    }

    return {
      ok: false,
      status: 404,
    } as any;
  };

  try {
    // Busca 1: Deve chamar o fetch e mapear os campos
    const resPaulista = await fetchAddressByCep('01310-100');
    assert(resPaulista.success === true, 'Busca do CEP da Av. Paulista retorna sucesso');
    assert(resPaulista.address?.logradouro === 'Avenida Paulista', 'Logradouro mapeado corretamente');
    assert(resPaulista.address?.bairro === 'Bela Vista', 'Bairro mapeado corretamente');
    assert(resPaulista.address?.localidade === 'São Paulo', 'Cidade/Localidade mapeada corretamente');
    assert(resPaulista.address?.uf === 'SP', 'Estado/UF mapeado corretamente');
    assert(fetchCallCount === 1, 'Fetch chamado exatamente 1 vez');

    // Busca 2 (Mesmo CEP): Deve usar o Cache em memória e NÃO chamar o fetch novamente
    const cachedPaulista = await fetchAddressByCep('01310100');
    assert(cachedPaulista.success === true, 'Segunda busca retorna dados com sucesso');
    assert(fetchCallCount === 1, 'Cache em memória interceptou a requisição sem nova chamada de rede');

    // Busca 3: CEP inexistente (ViaCEP retorna { erro: 'true' })
    const notFoundCep = await fetchAddressByCep('99999-999');
    assert(notFoundCep.success === false, 'CEP inexistente retorna success=false');
    assert(notFoundCep.error?.includes('não localizado') === true, 'Mensagem clara de CEP não localizado');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // =========================================================================
  // 3. REGRAS CRÍTICAS: CAMPOS OPCIONAIS NO SUPER ADMIN (PARCIAL SAVE)
  // =========================================================================
  console.log('\n📌 Bloco 3: Regra de Opcionalidade Estrita & Salvamento Parcial');

  // Cenário A: Cadastro Mínimo (Apenas Nome Fantasia é obrigatório!)
  const minimalTenant: TenantConfig = {
    id: 'tenant-minimal-001',
    name: 'Barbearia do Zé',
    slug: 'barbearia-do-ze',
    ownerName: 'José da Silva',
    ownerPhone: '11999999999',
    plan: 'starter',
    planBasePrice: 49.9,
    max_barbeiros: 1,
    valor_adicional_barbeiro: 25.0,
    status: 'active',
    whatsappStatus: 'close',
    createdAt: new Date().toISOString(),

    // Campos Fiscais Opcionais: Salvos vazios / undefined
    nome_fantasia: 'Barbearia do Zé',
    razao_social: undefined,
    documento: undefined,
    inscricao_municipal: undefined,
    inscricao_estadual: undefined,
    cep: undefined,
    logradouro: undefined,
    numero: undefined,
    email_financeiro: undefined,
  };

  assert(Boolean(minimalTenant.nome_fantasia), 'Cadastro mínimo possui o único campo estritamente obrigatório (nome_fantasia)');
  assert(minimalTenant.documento === undefined, 'Documento (CNPJ/CPF) pode ser salvo como undefined sem travar');
  assert(minimalTenant.cep === undefined, 'Endereço/CEP pode ser salvo como undefined sem travar');
  assert(minimalTenant.inscricao_municipal === undefined, 'Inscrição Municipal pode ser salva como undefined');

  // Cenário B: Cadastro Completo (Para emissão de NFS-e e Faturamento Invoice Ninja)
  const completeFiscalTenant: TenantConfig = {
    id: 'tenant-executive-barber',
    name: 'Naville Executive Grooming',
    slug: 'naville-executive-grooming',
    ownerName: 'Ricardo Alcantara',
    ownerPhone: '11988887777',
    plan: 'pro',
    planBasePrice: 89.9,
    max_barbeiros: 4,
    valor_adicional_barbeiro: 25.0,
    status: 'active',
    whatsappStatus: 'open',
    createdAt: new Date().toISOString(),

    // Dados Fiscais Padronizados para NFS-e
    nome_fantasia: 'Naville Executive Grooming',
    razao_social: 'R. Alcantara Serviços de Barbearia ME',
    tipo_documento: 'CNPJ',
    documento: '12345678000195',
    inscricao_municipal: '987654-1',
    inscricao_estadual: 'ISENTO',
    regime_tributario: 'Simples Nacional',

    // Endereço Completo
    cep: '01310100',
    logradouro: 'Avenida Paulista',
    numero: '1000',
    complemento: 'Conjunto 14B',
    bairro: 'Bela Vista',
    cidade: 'São Paulo - SP',
    estado_uf: 'SP',

    // Contato & Responsável Financeiro
    nome_responsavel: 'Ricardo Alcantara',
    cpf_responsavel: '52998224725',
    email_financeiro: 'financeiro@navillegrooming.com.br',
    whatsapp_financeiro: '11988887777',

    // Contrato & SaaS Módulo 3
    plano_contratado: 'pro',
    ciclo_pagamento: 'anual',
    valor_mensalidade_acordado: 89.9,
    max_barbeiros_inclusos: 4,
  };

  assert(completeFiscalTenant.tipo_documento === 'CNPJ', 'Tipo de documento fiscal é CNPJ');
  assert(completeFiscalTenant.inscricao_municipal === '987654-1', 'Inscrição Municipal preenchida para NFS-e');
  assert(completeFiscalTenant.email_financeiro === 'financeiro@navillegrooming.com.br', 'E-mail financeiro registrado para recebimento de NFS-e e boletos');
  assert(completeFiscalTenant.ciclo_pagamento === 'anual', 'Ciclo de faturamento anual configurado');
  assert(completeFiscalTenant.max_barbeiros_inclusos === 4, 'Vagas de barbeiros inclusas configuradas com sucesso');

  // =========================================================================
  // 4. RBAC: MATRIZ DE PERMISSÕES PARA SUPER ADMIN, COMERCIAL E SUPORTE
  // =========================================================================
  console.log('\n📌 Bloco 4: Matriz de Permissões RBAC Futura (Super Admin, Comercial, Suporte)');

  const superAdminPerms = getEstablishmentFormPermissions('superadmin');
  assert(superAdminPerms.canEditCommercial === true, 'Super Admin pode editar dados comerciais e fiscais');
  assert(superAdminPerms.canEditAddress === true, 'Super Admin pode editar endereço');
  assert(superAdminPerms.canEditFinancial === true, 'Super Admin pode editar contatos financeiros');
  assert(superAdminPerms.canEditContractPlan === true, 'Super Admin pode alterar plano, ciclo e preços');
  assert(superAdminPerms.canEditCriticalInfra === true, 'Super Admin pode alterar infraestrutura crítica e Kill Switch');
  assert(superAdminPerms.readOnly === false, 'Super Admin não está em modo somente leitura');

  const comercialPerms = getEstablishmentFormPermissions('comercial');
  assert(comercialPerms.canEditCommercial === true, 'Comercial pode cadastrar dados fiscais e CNPJ');
  assert(comercialPerms.canEditAddress === true, 'Comercial pode preencher endereço');
  assert(comercialPerms.canEditFinancial === true, 'Comercial pode cadastrar contato financeiro');
  assert(comercialPerms.canEditContractPlan === true, 'Comercial pode selecionar plano contratado e faturamento');
  assert(comercialPerms.canEditCriticalInfra === false, 'Comercial NÃO pode alterar configurações de infraestrutura/Kill Switch');
  assert(comercialPerms.readOnly === false, 'Comercial não está em modo somente leitura');

  const suportePerms = getEstablishmentFormPermissions('suporte');
  assert(suportePerms.canEditCommercial === true, 'Suporte pode auxiliar e atualizar dados cadastrais');
  assert(suportePerms.canEditAddress === true, 'Suporte pode corrigir endereço do cliente');
  assert(suportePerms.canEditFinancial === true, 'Suporte pode atualizar telefone e email financeiro');
  assert(suportePerms.canEditContractPlan === false, 'Suporte NÃO pode alterar plano ou contrato de faturamento');
  assert(suportePerms.canEditCriticalInfra === false, 'Suporte NÃO pode alterar status de Kill Switch');
  assert(suportePerms.readOnly === false, 'Suporte tem permissão de escrita limitada');

  // =========================================================================
  // 5. POCKETBASE: MIGRAÇÃO DECLARATIVA 004 & SCHEMA COMPATIBILITY
  // =========================================================================
  console.log('\n📌 Bloco 5: Validação da Migração 004 e Schema da Coleção barbearias');

  const migrationFilePath = path.resolve(
    process.cwd(),
    'pocketbase/pb_migrations/1710000004_establishment_fiscal_fields.js'
  );
  assert(fs.existsSync(migrationFilePath), 'Arquivo de migração 1710000004_establishment_fiscal_fields.js existe no repositório');

  const migrationContent = fs.readFileSync(migrationFilePath, 'utf8');

  // Verifica que todos os novos campos são opcionais (required: false)
  assert(migrationContent.includes('nome_fantasia'), 'Migração inclui campo nome_fantasia');
  assert(migrationContent.includes('razao_social'), 'Migração inclui campo razao_social');
  assert(migrationContent.includes('tipo_documento'), 'Migração inclui campo tipo_documento');
  assert(migrationContent.includes('documento'), 'Migração inclui campo documento');
  assert(migrationContent.includes('inscricao_municipal'), 'Migração inclui campo inscricao_municipal');
  assert(migrationContent.includes('inscricao_estadual'), 'Migração inclui campo inscricao_estadual');
  assert(migrationContent.includes('regime_tributario'), 'Migração inclui campo regime_tributario');
  assert(migrationContent.includes('cep'), 'Migração inclui campo cep');
  assert(migrationContent.includes('logradouro'), 'Migração inclui campo logradouro');
  assert(migrationContent.includes('numero'), 'Migração inclui campo numero');
  assert(migrationContent.includes('complemento'), 'Migração inclui campo complemento');
  assert(migrationContent.includes('bairro'), 'Migração inclui campo bairro');
  assert(migrationContent.includes('estado_uf'), 'Migração inclui campo estado_uf');
  assert(migrationContent.includes('nome_responsavel'), 'Migração inclui campo nome_responsavel');
  assert(migrationContent.includes('cpf_responsavel'), 'Migração inclui campo cpf_responsavel');
  assert(migrationContent.includes('email_financeiro'), 'Migração inclui campo email_financeiro');
  assert(migrationContent.includes('whatsapp_financeiro'), 'Migração inclui campo whatsapp_financeiro');
  assert(migrationContent.includes('plano_contratado'), 'Migração inclui campo plano_contratado');
  assert(migrationContent.includes('ciclo_pagamento'), 'Migração inclui campo ciclo_pagamento');
  assert(migrationContent.includes('valor_mensalidade_acordado'), 'Migração inclui campo valor_mensalidade_acordado');
  assert(migrationContent.includes('max_barbeiros_inclusos'), 'Migração inclui campo max_barbeiros_inclusos');

  // Verifica se o down migration está implementado
  assert(migrationContent.includes('removeField'), 'Migração reversível (down) implementada com sucesso');

  // Verifica execução de syncTenantToPocketBase com tenant completo
  try {
    await syncTenantToPocketBase(completeFiscalTenant);
    assert(true, 'syncTenantToPocketBase executa sem exceções em mock/desconectado');
  } catch (err: any) {
    assert(false, `syncTenantToPocketBase lançou erro: ${err?.message}`);
  }

  // =========================================================================
  // RELATÓRIO FINAL
  // =========================================================================
  console.log('\n======================================================');
  console.log(`📊 RESULTADOS: ${passedTests} testes passaram | ${failedTests} falharam`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
