file_path = "pocketbase/pb_hooks/naville_hooks.pb.js"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update GET /api/barbearia/cloud-state
old_get = """    if (records && records.length > 0) {
      let dados = records[0].get("dados");
      if (typeof dados === "string") {
        try { dados = JSON.parse(dados); } catch (_) { dados = null; }
      }
      return e.json(200, { success: true, found: true, state: dados });
    }"""

new_get = """    if (records && records.length > 0) {
      let raw = records[0].get("dados");
      let dados = null;
      if (typeof raw === "string") {
        try { dados = JSON.parse(raw); } catch (_) {}
      } else if (Array.isArray(raw)) {
        try {
          let s = "";
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
          dados = JSON.parse(s);
        } catch (_) {}
      } else if (raw && typeof raw === "object") {
        try { dados = JSON.parse(JSON.stringify(raw)); } catch (_) {}
      }
      return e.json(200, { success: true, found: true, state: dados });
    }"""

text = text.replace(old_get, new_get)

# 2. Update POST /api/barbearia/cloud-state
old_post_save = """    rec.set("dados", stateObj);
    $app.save(rec);"""

new_post_save = """    rec.set("dados", typeof stateObj === "string" ? stateObj : JSON.stringify(stateObj));
    $app.save(rec);"""

text = text.replace(old_post_save, new_post_save)

# 3. Update registerStripePayment parsing and save
old_sync_read = """      const rec = list[0];
      let rawDados = rec.get("dados");
      let dados = {};
      try {
        dados = JSON.parse(typeof rawDados === "string" ? rawDados : JSON.stringify(rawDados));
      } catch (_) {
        dados = {};
      }
      if (!dados || typeof dados !== "object") dados = {};
      if (!Array.isArray(dados.invoices)) dados.invoices = [];
      if (!Array.isArray(dados.tenants)) dados.tenants = [];"""

new_sync_read = """      const rec = list[0];
      let raw = rec.get("dados");
      let dados = null;
      if (typeof raw === "string") {
        try { dados = JSON.parse(raw); } catch (_) {}
      } else if (Array.isArray(raw)) {
        try {
          let s = "";
          for (let i = 0; i < raw.length; i++) s += String.fromCharCode(raw[i]);
          dados = JSON.parse(s);
        } catch (_) {}
      } else if (raw && typeof raw === "object") {
        try { dados = JSON.parse(JSON.stringify(raw)); } catch (_) {}
      }
      if (!dados || typeof dados !== "object") dados = {};
      if (!Array.isArray(dados.invoices)) dados.invoices = [];
      if (!Array.isArray(dados.tenants)) dados.tenants = [];"""

text = text.replace(old_sync_read, new_sync_read)

old_sync_save = """      rec.set("dados", dados);
      $app.save(rec);"""

new_sync_save = """      rec.set("dados", JSON.stringify(dados));
      $app.save(rec);"""

text = text.replace(old_sync_save, new_sync_save)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated pb_hooks with proper JSON serialization for cloud state")
