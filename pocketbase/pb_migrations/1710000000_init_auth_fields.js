/// <reference path="../pb_data/types.d.ts" />
/**
 * Migration 000: Initialize Auth Fields on Users
 * Adds 'role', 'barbearia_id', and 'barber_id' to 'users' collection so that
 * API rules referencing @request.auth.role, @request.auth.barbearia_id, and @request.auth.barber_id are valid.
 */

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users) return;

    if (!users.fields.getByName("role")) {
      users.fields.add(
        new TextField({
          name: "role",
          required: false,
        })
      );
    }

    if (!users.fields.getByName("barbearia_id")) {
      users.fields.add(
        new TextField({
          name: "barbearia_id",
          required: false,
        })
      );
    }

    if (!users.fields.getByName("barber_id")) {
      users.fields.add(
        new TextField({
          name: "barber_id",
          required: false,
        })
      );
    }

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users) return;
    users.fields.removeByName("role");
    users.fields.removeByName("barbearia_id");
    users.fields.removeByName("barber_id");
    app.save(users);
  }
);
