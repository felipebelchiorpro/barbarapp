/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 010: Perfil da Barbearia, Galeria de Fotos e Flag Vitalício
 * DevOps & Backend Architect (Naville SaaS)
 *
 * Adiciona à coleção 'barbearias':
 * - logo: Arquivo único (imagem, max 10MB)
 * - capa_principal: Arquivo único (imagem, max 10MB)
 * - galeria_fotos: Arquivo múltiplo (max: 10 imagens, máx 10MB por arquivo, mime types: image/*)
 * - plano_saas: Select (basico, pro, vitalicio)
 * - is_vitalicio: Bool (default: false)
 * - horarios_funcionamento: JSON (grade semanal de abertura/fechamento)
 * - descricao_espaco: Text (descrição do estabelecimento exibida no agendamento)
 * - is_public: Bool (default: true)
 *
 * Regras de Segurança:
 * - viewRule: id = @request.auth.barbearia_id || is_public = true || @request.auth.role = "superadmin"
 * - updateRule: @request.auth.id != "" && (@request.auth.barbearia_id = id || @request.auth.role = "superadmin")
 */

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (!barbearias) return;

    if (!barbearias.fields.getByName("logo")) {
      barbearias.fields.add(
        new FileField({
          name: "logo",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("capa_principal")) {
      barbearias.fields.add(
        new FileField({
          name: "capa_principal",
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("galeria_fotos")) {
      barbearias.fields.add(
        new FileField({
          name: "galeria_fotos",
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("plano_saas")) {
      barbearias.fields.add(
        new SelectField({
          name: "plano_saas",
          values: ["basico", "pro", "vitalicio"],
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("is_vitalicio")) {
      barbearias.fields.add(
        new BoolField({
          name: "is_vitalicio",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("horarios_funcionamento")) {
      barbearias.fields.add(
        new JSONField({
          name: "horarios_funcionamento",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("descricao_espaco")) {
      barbearias.fields.add(
        new TextField({
          name: "descricao_espaco",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("is_public")) {
      barbearias.fields.add(
        new BoolField({
          name: "is_public",
          required: false,
        })
      );
    }

    // Regras de Segurança (API Rules)
    barbearias.viewRule = 'id = @request.auth.barbearia_id || is_public = true || @request.auth.role = "superadmin"';
    barbearias.listRule = 'id = @request.auth.barbearia_id || is_public = true || @request.auth.role = "superadmin"';
    barbearias.updateRule = '@request.auth.id != "" && (@request.auth.barbearia_id = id || @request.auth.role = "superadmin")';

    app.save(barbearias);
  },
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (!barbearias) return;

    const fieldsToRemove = [
      "logo",
      "capa_principal",
      "galeria_fotos",
      "plano_saas",
      "horarios_funcionamento",
      "descricao_espaco",
      "is_public",
    ];

    for (const f of fieldsToRemove) {
      const field = barbearias.fields.getByName(f);
      if (field) barbearias.fields.remove(field);
    }

    app.save(barbearias);
  }
);
