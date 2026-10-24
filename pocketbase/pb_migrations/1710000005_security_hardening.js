/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 005: Security Hardening, Multi-Tenant Boundary & RBAC Isolation
 * AppSec & Senior Database Architect (Naville SaaS)
 */

migrate(
  (app) => {
    // 1. Hardening da coleção 'barbearias'
    const barbearias = app.findCollectionByNameOrId('barbearias');
    if (barbearias) {
      barbearias.listRule = '@request.auth.role = "superadmin" || id = @request.auth.barbearia_id || (@request.auth.id = "" && status = "active")';
      barbearias.viewRule = '@request.auth.role = "superadmin" || id = @request.auth.barbearia_id || (@request.auth.id = "" && status = "active")';
      barbearias.createRule = '@request.auth.role = "superadmin"';
      barbearias.updateRule = '@request.auth.role = "superadmin" || (' +
        '@request.auth.role = "owner" && id = @request.auth.barbearia_id && ' +
        '@request.body.plan:isset = false && ' +
        '@request.body.plan_base_price:isset = false && ' +
        '@request.body.max_barbeiros:isset = false && ' +
        '@request.body.valor_adicional_barbeiro:isset = false && ' +
        '@request.body.status:isset = false && ' +
        '@request.body.status_assinatura:isset = false && ' +
        '@request.body.bloqueio_automatico:isset = false && ' +
        '@request.body.valor_mensalidade_acordado:isset = false && ' +
        '@request.body.max_barbeiros_inclusos:isset = false' +
      ')';
      barbearias.deleteRule = '@request.auth.role = "superadmin"';
      app.save(barbearias);
    }

    // 2. Hardening da coleção 'servicos'
    const servicos = app.findCollectionByNameOrId('servicos');
    if (servicos) {
      servicos.listRule = '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id || (@request.auth.id = "" && ativo = true)';
      servicos.viewRule = '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id || (@request.auth.id = "" && ativo = true)';
      servicos.createRule = '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.body.barbearia_id = @request.auth.barbearia_id)';
      servicos.updateRule = '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && barbearia_id = @request.auth.barbearia_id)';
      servicos.deleteRule = '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && barbearia_id = @request.auth.barbearia_id)';
      app.save(servicos);
    }

    // 3. Hardening da coleção 'barbeiros'
    const barbeiros = app.findCollectionByNameOrId('barbeiros');
    if (barbeiros) {
      barbeiros.listRule = '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id || (@request.auth.id = "" && ativo = true)';
      barbeiros.viewRule = '@request.auth.role = "superadmin" || barbearia_id = @request.auth.barbearia_id || (@request.auth.id = "" && ativo = true)';
      barbeiros.createRule = '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && @request.body.barbearia_id = @request.auth.barbearia_id)';
      barbeiros.updateRule = '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && barbearia_id = @request.auth.barbearia_id)';
      barbeiros.deleteRule = '@request.auth.role = "superadmin" || ((@request.auth.role = "owner" || @request.auth.role = "manager") && barbearia_id = @request.auth.barbearia_id)';
      app.save(barbeiros);
    }

    // 4. Hardening da coleção 'agendamentos'
    const agendamentos = app.findCollectionByNameOrId('agendamentos');
    if (agendamentos) {
      agendamentos.listRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || (@request.auth.role = "barber" && barbeiro_id = @request.auth.barber_id)))';
      agendamentos.viewRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || (@request.auth.role = "barber" && barbeiro_id = @request.auth.barber_id)))';
      agendamentos.createRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id) || (@request.auth.id = "" && barbearia_id.status = "active" && barbeiro_id.barbearia_id = barbearia_id && barbeiro_id.ativo = true)';
      agendamentos.updateRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || (@request.auth.role = "barber" && barbeiro_id = @request.auth.barber_id && @request.body.valor_total:isset = false)))';
      agendamentos.deleteRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))';
      app.save(agendamentos);
    }

    // 5. Hardening da coleção 'vendas_balcao' (PDV)
    const vendasBalcao = app.findCollectionByNameOrId('vendas_balcao');
    if (vendasBalcao) {
      vendasBalcao.listRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || (@request.auth.role = "barber" && barbeiro_id = @request.auth.barber_id)))';
      vendasBalcao.viewRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || (@request.auth.role = "barber" && barbeiro_id = @request.auth.barber_id)))';
      vendasBalcao.createRule = '@request.auth.role = "superadmin" || (@request.body.barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager" || @request.auth.role = "barber"))';
      vendasBalcao.updateRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))';
      vendasBalcao.deleteRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && @request.auth.role = "owner")';
      app.save(vendasBalcao);
    }

    // 6. Hardening da coleção 'produtos'
    const produtos = app.findCollectionByNameOrId('produtos');
    if (produtos) {
      produtos.listRule = 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"';
      produtos.viewRule = 'barbearia_id = @request.auth.barbearia_id || @request.auth.role = "superadmin"';
      produtos.createRule = '@request.auth.role = "superadmin" || (@request.body.barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))';
      produtos.updateRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && (@request.auth.role = "owner" || @request.auth.role = "manager"))';
      produtos.deleteRule = '@request.auth.role = "superadmin" || (barbearia_id = @request.auth.barbearia_id && @request.auth.role = "owner")';
      app.save(produtos);
    }
  },
  // Rollback
  (app) => {}
);
