/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 004: Establishment Fiscal & Address Fields (NFS-e / Invoice Ninja)
 * Database Optimizer & Backend Architect (Naville SaaS)
 * Requisitos: Dados Fiscais, PJ/PF, Endereço ViaCEP e Contrato
 *
 * NOTA CRÍTICA: Apenas 'name'/'nome_fantasia' é obrigatório.
 * Todos os novos campos adicionados nesta migration são estritamente OPCIONAIS (required: false).
 */

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId('barbearias');
    if (!barbearias) return;

    // Campos Fiscais e Cadastrais Opcionais
    const newFields = [
      { name: 'nome_fantasia', type: 'text', required: false },
      { name: 'razao_social', type: 'text', required: false },
      { name: 'tipo_documento', type: 'select', values: ['CNPJ', 'CPF'], required: false },
      { name: 'documento', type: 'text', required: false },
      { name: 'inscricao_municipal', type: 'text', required: false },
      { name: 'inscricao_estadual', type: 'text', required: false },
      { name: 'regime_tributario', type: 'select', values: ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Outro'], required: false },
      { name: 'cep', type: 'text', required: false },
      { name: 'logradouro', type: 'text', required: false },
      { name: 'numero', type: 'text', required: false },
      { name: 'complemento', type: 'text', required: false },
      { name: 'bairro', type: 'text', required: false },
      { name: 'estado_uf', type: 'text', required: false },
      { name: 'nome_responsavel', type: 'text', required: false },
      { name: 'cpf_responsavel', type: 'text', required: false },
      { name: 'email_financeiro', type: 'email', required: false },
      { name: 'whatsapp_financeiro', type: 'text', required: false },
      { name: 'plano_contratado', type: 'text', required: false },
      { name: 'ciclo_pagamento', type: 'text', required: false },
      { name: 'valor_mensalidade_acordado', type: 'number', required: false },
      { name: 'max_barbeiros_inclusos', type: 'number', required: false },
    ];

    for (const field of newFields) {
      if (barbearias.fields) {
        if (!barbearias.fields.getByName(field.name)) {
          if (field.type === 'number') {
            barbearias.fields.add(new NumberField({ name: field.name, required: false }));
          } else if (field.type === 'select') {
            barbearias.fields.add(new SelectField({ name: field.name, values: field.values || [], required: false }));
          } else if (field.type === 'email') {
            barbearias.fields.add(new EmailField({ name: field.name, required: false }));
          } else {
            barbearias.fields.add(new TextField({ name: field.name, required: false }));
          }
        }
      } else if (barbearias.schema) {
        const exists = barbearias.schema.fields.some((f) => f.name === field.name);
        if (!exists) {
          barbearias.schema.addField(new SchemaField(field));
        }
      }
    }

    app.save(barbearias);
  },
  // Rollback Reversível
  (app) => {
    const barbearias = app.findCollectionByNameOrId('barbearias');
    if (!barbearias) return;

    const fieldsToRemove = [
      'nome_fantasia',
      'razao_social',
      'tipo_documento',
      'documento',
      'inscricao_municipal',
      'inscricao_estadual',
      'regime_tributario',
      'cep',
      'logradouro',
      'numero',
      'complemento',
      'bairro',
      'estado_uf',
      'nome_responsavel',
      'cpf_responsavel',
      'email_financeiro',
      'whatsapp_financeiro',
      'plano_contratado',
      'ciclo_pagamento',
      'valor_mensalidade_acordado',
      'max_barbeiros_inclusos',
    ];

    for (const fieldName of fieldsToRemove) {
      if (barbearias.fields) {
        barbearias.fields.removeByName(fieldName);
      } else if (barbearias.schema) {
        const field = barbearias.schema.fields.find((f) => f.name === fieldName);
        if (field) {
          barbearias.schema.removeField(field.id);
        }
      }
    }

    app.save(barbearias);
  }
);
