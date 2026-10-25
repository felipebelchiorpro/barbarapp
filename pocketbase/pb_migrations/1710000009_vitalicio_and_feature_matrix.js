/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 009: Matriz de Recursos do Parceiro Vitalício & Gateways
 * DevOps & Backend Architect (Naville SaaS)
 *
 * Adiciona à coleção 'barbearias':
 * - is_vitalicio: bool (isenção permanente de cobrança de mensalidade SaaS Naville)
 * - limite_profissionais: number (limite de cadeiras permitidas)
 * - recurso_clube_ativo: bool (habilita módulo de Clube de Assinaturas Mercado Pago)
 * - recurso_financeiro_avancado: bool (habilita fluxo financeiro, PDV e caixa)
 * - whatsapp_ativo: bool (habilita automações do motor WhatsApp)
 * - stripe_customer_id: text (ID do cliente no Stripe SaaS central)
 * - stripe_subscription_id: text (ID da assinatura no Stripe SaaS central)
 */

migrate(
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (!barbearias) return;

    if (!barbearias.fields.getByName("is_vitalicio")) {
      barbearias.fields.add(
        new BoolField({
          name: "is_vitalicio",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("limite_profissionais")) {
      barbearias.fields.add(
        new NumberField({
          name: "limite_profissionais",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("recurso_clube_ativo")) {
      barbearias.fields.add(
        new BoolField({
          name: "recurso_clube_ativo",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("recurso_financeiro_avancado")) {
      barbearias.fields.add(
        new BoolField({
          name: "recurso_financeiro_avancado",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("whatsapp_ativo")) {
      barbearias.fields.add(
        new BoolField({
          name: "whatsapp_ativo",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("stripe_customer_id")) {
      barbearias.fields.add(
        new TextField({
          name: "stripe_customer_id",
          required: false,
        })
      );
    }

    if (!barbearias.fields.getByName("stripe_subscription_id")) {
      barbearias.fields.add(
        new TextField({
          name: "stripe_subscription_id",
          required: false,
        })
      );
    }

    app.save(barbearias);
  },
  (app) => {
    const barbearias = app.findCollectionByNameOrId("barbearias");
    if (!barbearias) return;

    const fieldsToRemove = [
      "is_vitalicio",
      "limite_profissionais",
      "recurso_clube_ativo",
      "recurso_financeiro_avancado",
      "whatsapp_ativo",
      "stripe_customer_id",
      "stripe_subscription_id",
    ];

    for (const f of fieldsToRemove) {
      const field = barbearias.fields.getByName(f);
      if (field) barbearias.fields.remove(field);
    }

    app.save(barbearias);
  }
);
