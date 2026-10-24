/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 007: Slug Public Access & Evolution API Fields
 * Database Optimizer & DevOps Engineer (Naville SaaS)
 *
 * Configurações da coleção 'barbearias':
 * - Garante campos evolution_instance_name e whatsapp_status
 * - viewRule pública para consulta por slug: slug != ""
 */

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (!barbearias) return;

    if (!barbearias.fields.getByName("evolution_instance_name")) {
      barbearias.fields.add(
        new TextField({
          name: "evolution_instance_name",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("whatsapp_phone")) {
      barbearias.fields.add(
        new TextField({
          name: "whatsapp_phone",
          required: false,
        })
      );
    }

    // 2. Atualizar viewRule e listRule para permitir consulta pública filtrando por slug
    barbearias.viewRule = 'slug != "" || @request.auth.role = "superadmin" || @request.auth.barbearia_id = id';
    barbearias.listRule = 'slug != "" || @request.auth.role = "superadmin" || @request.auth.barbearia_id = id';

    app.save(barbearias);
  },
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (!barbearias) return;
    barbearias.viewRule = '@request.auth.role = "superadmin" || @request.auth.barbearia_id = id';
    barbearias.listRule = '@request.auth.role = "superadmin" || @request.auth.barbearia_id = id';
    app.save(barbearias);
  }
);
