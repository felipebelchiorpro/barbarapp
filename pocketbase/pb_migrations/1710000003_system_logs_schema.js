/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 003: System Error Logs & Diagnostic Telemetry Schema
 * SRE & Resiliência Operacional Specialist (Naville SaaS)
 * Requisitos [8] Migrations, [9] Rollback & [14] Logs Estruturados
 *
 * Coleções criadas:
 * - logs_erros_sistema
 */

migrate(
  (app) => {
    const logsErros = new Collection({
      name: 'logs_erros_sistema',
      type: 'base',
      system: false,
      fields: [
        { name: 'log_id', type: 'text', required: true, unique: true },
        { name: 'barbearia_id', type: 'text' },
        { name: 'barbearia_nome', type: 'text' },
        { name: 'nivel', type: 'select', values: ['critico', 'aviso', 'erro_api'], required: true },
        { name: 'modulo', type: 'text', required: true },
        { name: 'mensagem_erro', type: 'text', required: true },
        { name: 'detalhes_tecnicos', type: 'json' },
        { name: 'usuario_id', type: 'text' },
        { name: 'resolvido', type: 'bool', required: true },
        { name: 'data_hora', type: 'text', required: true },
        { name: 'resolvido_em', type: 'text' },
        { name: 'resolvido_por', type: 'text' },
        { name: 'notas_suporte', type: 'text' },
      ],
      indexes: [
        'CREATE INDEX idx_logs_barbearia ON logs_erros_sistema (barbearia_id)',
        'CREATE INDEX idx_logs_data ON logs_erros_sistema (data_hora)',
        'CREATE INDEX idx_logs_resolvido ON logs_erros_sistema (resolvido)',
      ],
      // [10] RLS Estrito: Apenas SuperAdmin tem visibilidade desta coleção
      listRule: '@request.auth.role = "superadmin"',
      viewRule: '@request.auth.role = "superadmin"',
      createRule: '@request.auth.id != "" || @request.auth.id = ""', // Permite logging anônimo/sistema
      updateRule: '@request.auth.role = "superadmin"',
      deleteRule: '@request.auth.role = "superadmin"',
    });
    app.save(logsErros);
  },
  // [9] Rollback Reversível
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('logs_erros_sistema');
      if (col) app.delete(col);
    } catch {}
  }
);
