/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 006: Club Subscriptions Schema (planos_assinatura & assinaturas_clientes)
 * Full-Stack Software Architect & Senior Multi-Tenant Engineer (Naville SaaS)
 *
 * Coleções criadas:
 * 1. planos_assinatura:
 *    - barbearia_id (relation -> barbearias, required)
 *    - nome (text, required)
 *    - valor_mensal (number, required)
 *    - limite_cortes_mes (number, required; 0 para ilimitado)
 *    - permite_barba (bool, default false)
 *    - ativo (bool, default true)
 *    - link_mercado_pago (text/url, opcional)
 *
 * 2. assinaturas_clientes:
 *    - barbearia_id (relation -> barbearias, required)
 *    - cliente_id (relation -> clientes, required)
 *    - plano_id (relation -> planos_assinatura, required)
 *    - modalidade (select: 'manual', 'recorrente_gateway', required)
 *    - status (select: 'ativo', 'vencido', 'cancelado', required)
 *    - data_inicio (text/date, required)
 *    - data_vencimento (text/date, required)
 *    - cortes_utilizados_mes (number, default 0)
 *    - gateway_subscription_id (text, opcional)
 */

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId('barbearias');
    const clientes = app.findCollectionByNameOrId('clientes');

    // 1. Coleção 'planos_assinatura'
    const planosAssinatura = new Collection({
      name: 'planos_assinatura',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'valor_mensal', type: 'number', required: true },
        { name: 'limite_cortes_mes', type: 'number', required: true }, // 0 = ilimitado
        { name: 'permite_barba', type: 'bool', required: false },
        { name: 'ativo', type: 'bool', required: true },
        { name: 'link_mercado_pago', type: 'text', required: false },
      ],
      listRule: '@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)',
      viewRule: '@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id || (@request.auth.id = "" && ativo = true)',
      createRule: '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.body.barbearia_id = @request.auth.barbearia_id)',
      updateRule: '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)',
      deleteRule: '@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")',
    });
    app.save(planosAssinatura);

    // 2. Coleção 'assinaturas_clientes'
    const assinaturasClientes = new Collection({
      name: 'assinaturas_clientes',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'cliente_id', type: 'relation', collectionId: clientes ? clientes.id : undefined, required: true },
        { name: 'plano_id', type: 'relation', collectionId: planosAssinatura.id, required: true },
        { name: 'modalidade', type: 'select', values: ['manual', 'recorrente_gateway'], required: true },
        { name: 'status', type: 'select', values: ['ativo', 'vencido', 'cancelado'], required: true },
        { name: 'data_inicio', type: 'text', required: true },
        { name: 'data_vencimento', type: 'text', required: true },
        { name: 'cortes_utilizados_mes', type: 'number', required: false },
        { name: 'gateway_subscription_id', type: 'text', required: false },
      ],
      listRule: '@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id',
      viewRule: '@request.auth.role = "superadmin" || @request.auth.barbearia_id = barbearia_id',
      createRule: '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.body.barbearia_id = @request.auth.barbearia_id)',
      updateRule: '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.auth.barbearia_id = barbearia_id)',
      deleteRule: '@request.auth.role = "superadmin" || (@request.auth.barbearia_id = barbearia_id && @request.auth.role = "owner")',
    });
    app.save(assinaturasClientes);
  },
  // Rollback Reversível (DOWN)
  (app) => {
    const collections = ['assinaturas_clientes', 'planos_assinatura'];
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name);
        if (col) app.delete(col);
      } catch {}
    }
  }
);
