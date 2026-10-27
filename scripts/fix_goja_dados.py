file_path = "pocketbase/pb_hooks/naville_hooks.pb.js"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

target = """      const rec = list[0];
      let dados = rec.get("dados");
      if (typeof dados === "string") {
        try { dados = JSON.parse(dados); } catch (_) { dados = null; }
      }
      if (!dados || typeof dados !== "object") dados = {};
      if (!Array.isArray(dados.invoices)) dados.invoices = [];
      if (!Array.isArray(dados.tenants)) dados.tenants = [];"""

replacement = """      const rec = list[0];
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

text = text.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated dados parsing in pb_hooks")
