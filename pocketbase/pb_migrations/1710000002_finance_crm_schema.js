/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 002: Finance, PDV and CRM Schema
 * Database Optimizer & Payments Billing Engineer (Naville SaaS)
 * Requisitos [8] Migrations & [9] Rollback Reversível
 *
 * Coleções criadas:
 * - faturas
 * - despesas
 * - produtos
 * - vendas_balcao
 * - planos_assinatura_cliente
 */

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId('barbearias');

    // 1. Coleção 'faturas'
    const faturas = new Collection({
      name: 'faturas',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'fatura_numero', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'data_emissao', type: 'text', required: true },
        { name: 'data_vencimento', type: 'text', required: true },
        { name: 'status', type: 'select', values: ['pendente', 'paga', 'vencida', 'cancelada'], required: true },
        { name: 'link_pagamento', type: 'url' },
        { name: 'pago_em', type: 'text' },
      ],
      listRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id)',
      viewRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id)',
      createRule: '@request.auth.role = "superadmin"',
      updateRule: '@request.auth.role = "superadmin"',
      deleteRule: '@request.auth.role = "superadmin"',
    });
    app.save(faturas);

    // 2. Coleção 'despesas'
    const despesas = new Collection({
      name: 'despesas',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'descricao', type: 'text', required: true },
        { name: 'categoria', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'data_vencimento', type: 'text', required: true },
        { name: 'data_pagamento', type: 'text' },
        { name: 'status', type: 'select', values: ['pendente', 'pago'], required: true },
        { name: 'recorrente', type: 'bool' },
      ],
      listRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id)',
      viewRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id)',
      createRule: '@request.auth.role = "owner" && @request.body.barbearia_id = @request.auth.barbearia_id',
      updateRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
      deleteRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
    });
    app.save(despesas);

    // 3. Coleção 'produtos'
    const produtos = new Collection({
      name: 'produtos',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'preco_venda', type: 'number', required: true },
        { name: 'preco_custo', type: 'number' },
        { name: 'estoque_atual', type: 'number', required: true },
        { name: 'categoria', type: 'text' },
        { name: 'ativo', type: 'bool' },
      ],
      listRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      viewRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      createRule: '@request.auth.role = "owner" && @request.body.barbearia_id = @request.auth.barbearia_id',
      updateRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
      deleteRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
    });
    app.save(produtos);

    // 4. Coleção 'vendas_balcao'
    const vendasBalcao = new Collection({
      name: 'vendas_balcao',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'cliente_id', type: 'relation', collectionId: app.findCollectionByNameOrId('clientes')?.id },
        { name: 'barbeiro_id', type: 'relation', collectionId: app.findCollectionByNameOrId('barbeiros')?.id },
        { name: 'valor_total', type: 'number', required: true },
        { name: 'forma_pagamento', type: 'text', required: true },
        { name: 'itens_servicos', type: 'json' },
        { name: 'itens_produtos', type: 'json' },
        { name: 'data_hora', type: 'text', required: true },
      ],
      listRule: '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "barber"))',
      viewRule: '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "barber"))',
      createRule: '@request.body.barbearia_id = @request.auth.barbearia_id || barbearia_id = @request.auth.barbearia_id',
      updateRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
      deleteRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
    });
    app.save(vendasBalcao);

    // 5. Coleção 'planos_assinatura_cliente'
    const planosCliente = new Collection({
      name: 'planos_assinatura_cliente',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'preco_mensal', type: 'number', required: true },
        { name: 'servicos_inclusos', type: 'json', required: true },
        { name: 'dias_permitidos', type: 'json' },
        { name: 'limite_cortes_mes', type: 'number' },
        { name: 'ativo', type: 'bool' },
      ],
      listRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      viewRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      createRule: '@request.auth.role = "owner" && @request.body.barbearia_id = @request.auth.barbearia_id',
      updateRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
      deleteRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
    });
    app.save(planosCliente);
  },
  // [9] Rollback Reversível
  (app) => {
    const collections = ['planos_assinatura_cliente', 'vendas_balcao', 'produtos', 'despesas', 'faturas'];
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name);
        if (col) app.delete(col);
      } catch {}
    }
  }
);
