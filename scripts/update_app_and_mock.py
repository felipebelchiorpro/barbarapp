import re

# Update mockData.ts
mock_path = "src/data/mockData.ts"
with open(mock_path, "r", encoding="utf-8") as f:
    mock_content = f.read()

mock_content = mock_content.replace(
    "baseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EVOLUTION_API_URL) || 'https://evolution-api.exemplo.com',",
    "baseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EVOLUTION_API_URL) || '',"
)
mock_content = mock_content.replace(
    "instanceName: 'barbearia_ls',",
    "instanceName: 'barbearia',"
)

with open(mock_path, "w", encoding="utf-8") as f:
    f.write(mock_content)

print("Updated mockData.ts")

# Update App.tsx
app_path = "src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    app_content = f.read()

# Replace all occurrences of 'http://evolution-api:8080' with ''
app_content = app_content.replace("'http://evolution-api:8080'", "''")

# Clean existing stored localStorage in evolutionConfigsByTenant initialization
old_evo_init = """  const [evolutionConfigsByTenant, setEvolutionConfigsByTenant] = useState<Record<string, EvolutionApiConfig>>(() => {
    const saved = localStorage.getItem('naville_evolution_configs_by_tenant_v2');
    return saved ? JSON.parse(saved) : {};
  });"""

new_evo_init = """  const [evolutionConfigsByTenant, setEvolutionConfigsByTenant] = useState<Record<string, EvolutionApiConfig>>(() => {
    const saved = localStorage.getItem('naville_evolution_configs_by_tenant_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          for (const k of Object.keys(parsed)) {
            if (parsed[k]?.baseUrl && (parsed[k].baseUrl.includes('evolution-api') || parsed[k].baseUrl.includes(':8080'))) {
              parsed[k].baseUrl = '';
            }
          }
          return parsed;
        }
      } catch (_) {}
    }
    return {};
  });"""

app_content = app_content.replace(old_evo_init.replace('\r\n', '\n'), new_evo_init)
app_content = app_content.replace(old_evo_init.replace('\n', '\r\n'), new_evo_init)

# In useEffect for cloud-state, ensure invoices is in dependency array
dep_pattern = r"(clientPlans,\s*products,)(\s*\];\s*\n\s*\/\/\s*Sincroniza bloqueios)"
app_content = re.sub(dep_pattern, r"\1\n    invoices,\2", app_content)

# Update handlePayInvoiceSimulated in App.tsx
old_pay = """  const handlePayInvoiceSimulated = (invoiceId: string, method: 'pix' | 'stripe' = 'pix') => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'paid' as const,
              paidAt: new Date().toISOString(),
              pago_em: new Date().toISOString(),
              paymentMethod: method,
              stripePaymentId: method === 'stripe' ? `cs_test_mock_${Date.now()}` : undefined,
            }
          : inv
      )
    );

    handleTriggerNinjaWebhook({
      eventType: 'invoice.paid',
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      amount: invoice.amount,
    });
  };"""

new_pay = """  const handlePayInvoiceSimulated = (invoiceId: string, method: 'pix' | 'stripe' = 'pix') => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const paidTimestamp = new Date().toISOString();
    const updatedInvoices = invoices.map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            status: 'paid' as const,
            paidAt: paidTimestamp,
            pago_em: paidTimestamp,
            paymentMethod: method,
            stripePaymentId: method === 'stripe' ? (inv.stripePaymentId || `cs_test_${Date.now()}`) : undefined,
          }
        : inv
    );

    setInvoices(updatedInvoices);

    // Atualiza status do tenant para active imediatamente
    setTenants((prev) =>
      prev.map((t) =>
        t.id === invoice.tenantId
          ? {
              ...t,
              status: 'active',
              status_assinatura: 'ativo',
            }
          : t
      )
    );

    handleTriggerNinjaWebhook({
      eventType: 'invoice.paid',
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      amount: invoice.amount,
    });

    // PUSH IMEDIATO PARA CLOUD-STATE para sincronizar celulares e notebooks no mesmo segundo
    fetch('/api/barbearia/cloud-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: {
          tenants: tenants.map((t) => (t.id === invoice.tenantId ? { ...t, status: 'active', status_assinatura: 'ativo' } : t)),
          barbers,
          services,
          bookings,
          blocks,
          customers,
          expenses,
          cashTransactions,
          clientPlans,
          products,
          invoices: updatedInvoices,
          updatedAt: paidTimestamp,
        },
      }),
    }).catch(() => {});
  };"""

app_content = app_content.replace(old_pay.replace('\r\n', '\n'), new_pay)
app_content = app_content.replace(old_pay.replace('\n', '\r\n'), new_pay)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(app_content)

print("Updated App.tsx")
