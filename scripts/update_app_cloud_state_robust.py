file_path = "src/App.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

target = """        if (res && res.success && res.state && typeof res.state === 'object') {
          const st = res.state;"""

replacement = """        if (res && res.success && res.state) {
          let st = res.state;
          if (Array.isArray(st) && typeof st[0] === 'number') {
            try {
              let s = '';
              for (let i = 0; i < st.length; i++) s += String.fromCharCode(st[i]);
              st = JSON.parse(decodeURIComponent(escape(s)));
            } catch (_) {
              try {
                let s = '';
                for (let i = 0; i < st.length; i++) s += String.fromCharCode(st[i]);
                st = JSON.parse(s);
              } catch (_) {}
            }
          } else if (typeof st === 'string') {
            try { st = JSON.parse(st); } catch (_) {}
          }
          if (st && typeof st === 'object') {"""

text = text.replace(target, replacement)

# Add automatic stripe sync on app load
sync_stripe_code = """  // Sincronização automática com Stripe Live para compensar novas faturas pagas
  useEffect(() => {
    fetch('/api/stripe/sync-recent-payments')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res && res.success && res.syncedCount > 0) {
          // Recarrega o cloud-state atualizado
          fetch('/api/barbearia/cloud-state')
            .then((r) => (r.ok ? r.json() : null))
            .then((csRes) => {
              if (csRes && csRes.success && csRes.state) {
                let st = csRes.state;
                if (Array.isArray(st) && typeof st[0] === 'number') {
                  try {
                    let s = '';
                    for (let i = 0; i < st.length; i++) s += String.fromCharCode(st[i]);
                    st = JSON.parse(decodeURIComponent(escape(s)));
                  } catch (_) {}
                }
                if (st && Array.isArray(st.invoices)) setInvoices(st.invoices);
                if (st && Array.isArray(st.tenants)) setTenants(st.tenants);
              }
            }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);
"""

target_hook = "  // Sincronização Cloud State (PocketBase) para funcionar entre celular e notebook em tempo real"
if "sync-recent-payments" not in text:
    text = text.replace(target_hook, sync_stripe_code + "\n  " + target_hook)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated App.tsx with robust byte decoding and automatic stripe sync")
