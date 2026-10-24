/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 001: Core Architecture Schema
 * Database Optimizer & Backend Architect (Naville SaaS)
 * Requisitos [8] Migrations & [9] Rollback Reversível
 *
 * Coleções criadas:
 * - barbearias (tenants)
 * - servicos
 * - barbeiros
 * - clientes
 * - agendamentos
 */

migrate(
  (app) => {
    // 1. Coleção 'barbearias'
    const barbearias = new Collection({
      name: 'barbearias',
      type: 'base',
      system: false,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'owner_name', type: 'text', required: true },
        { name: 'owner_phone', type: 'text', required: true },
        { name: 'plan', type: 'select', values: ['starter', 'pro', 'enterprise'], required: true },
        { name: 'plan_base_price', type: 'number', required: true },
        { name: 'max_barbeiros', type: 'number', required: true },
        { name: 'valor_adicional_barbeiro', type: 'number', required: true },
        { name: 'status', type: 'select', values: ['active', 'trial', 'blocked', 'churn'], required: true },
        { name: 'whatsapp_status', type: 'text' },
        { name: 'status_assinatura', type: 'text' },
        { name: 'data_proximo_vencimento', type: 'text' },
        { name: 'bloqueio_automatico', type: 'bool' },
      ],
      listRule: '@request.auth.role = "superadmin" || id = @request.auth.barbearia_id',
      viewRule: '@request.auth.role = "superadmin" || id = @request.auth.barbearia_id',
      createRule: '@request.auth.role = "superadmin"',
      updateRule: '@request.auth.role = "superadmin" || (@request.auth.role = "owner" && id = @request.auth.barbearia_id)',
      deleteRule: '@request.auth.role = "superadmin"',
    });
    app.save(barbearias);

    // 2. Coleção 'servicos'
    const servicos = new Collection({
      name: 'servicos',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'preco', type: 'number', required: true },
        { name: 'duracao_minutos', type: 'number', required: true },
        { name: 'categoria', type: 'text' },
        { name: 'ativo', type: 'bool' },
      ],
      listRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      viewRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      createRule: '@request.auth.role = "owner" && @request.body.barbearia_id = @request.auth.barbearia_id',
      updateRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
      deleteRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
    });
    app.save(servicos);

    // 3. Coleção 'barbeiros'
    const barbeiros = new Collection({
      name: 'barbeiros',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'foto_url', type: 'url' },
        { name: 'taxa_comissao', type: 'number' },
        { name: 'ativo', type: 'bool' },
      ],
      listRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      viewRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      createRule: '@request.auth.role = "owner" && @request.body.barbearia_id = @request.auth.barbearia_id',
      updateRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
      deleteRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
    });
    app.save(barbeiros);

    // 4. Coleção 'clientes'
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'observacoes', type: 'text' },
        { name: 'total_visitas', type: 'number' },
        { name: 'total_gasto', type: 'number' },
        { name: 'ultima_visita', type: 'text' },
      ],
      listRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      viewRule: 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"',
      createRule: '@request.body.barbearia_id = @request.auth.barbearia_id || @request.auth.id = ""',
      updateRule: 'barbearia_id = @request.auth.barbearia_id',
      deleteRule: '@request.auth.role = "owner" && barbearia_id = @request.auth.barbearia_id',
    });
    app.save(clientes);

    // 5. Coleção 'agendamentos'
    const agendamentos = new Collection({
      name: 'agendamentos',
      type: 'base',
      system: false,
      fields: [
        { name: 'barbearia_id', type: 'relation', collectionId: barbearias.id, required: true },
        { name: 'barbeiro_id', type: 'relation', collectionId: barbeiros.id, required: true },
        { name: 'cliente_id', type: 'relation', collectionId: clientes.id },
        { name: 'cliente_nome', type: 'text', required: true },
        { name: 'cliente_telefone', type: 'text', required: true },
        { name: 'servicos_ids', type: 'json', required: true },
        { name: 'data', type: 'text', required: true },
        { name: 'horario', type: 'text', required: true },
        { name: 'duracao_total_minutos', type: 'number', required: true },
        { name: 'valor_total', type: 'number', required: true },
        { name: 'status', type: 'select', values: ['pendente', 'confirmado', 'concluido', 'cancelado'], required: true },
        { name: 'observacoes', type: 'text' },
      ],
      listRule: '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || (@request.auth.role = "barber" && barbeiro_id = @request.auth.barber_id)))',
      viewRule: '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || (@request.auth.role = "barber" && barbeiro_id = @request.auth.barber_id)))',
      createRule: '@request.body.barbearia_id = @request.auth.barbearia_id || @request.auth.id = ""',
      updateRule: 'barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || barbeiro_id = @request.auth.barber_id)',
      deleteRule: 'barbearia_id = @request.auth.barbearia_id && @request.auth.role = "owner"',
    });
    app.save(agendamentos);
  },
  // [9] Rollback Reversível Determinístico
  (app) => {
    const collections = ['agendamentos', 'clientes', 'barbeiros', 'servicos', 'barbearias'];
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name);
        if (col) app.delete(col);
      } catch {}
    }
  }
);
