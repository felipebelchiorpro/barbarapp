import sqlite3, json

con = sqlite3.connect('/opt/naville/pocketbase/pb_data/data.db')
cur = con.cursor()
cur.execute("SELECT dados FROM sistema_estado_global WHERE chave = 'naville_prod_v2'")
row = cur.fetchone()
if row and row[0]:
    val = row[0]
    parsed_bytes = json.loads(val)
    if isinstance(parsed_bytes, list) and isinstance(parsed_bytes[0], int):
        clean_json_str = bytes(parsed_bytes).decode('utf-8')
        state = json.loads(clean_json_str)
    else:
        state = json.loads(val)

    if not isinstance(state.get('invoices'), list):
        state['invoices'] = []

    # Inject the paid Stripe invoice
    session_id = "cs_live_a1adJt8n18LWKuDquqVM3HvF8NvyP4HVkgQOVoJkiJwjL5SA5whpp4K16F"
    target_tenant_id = "tenant-barber-ls"

    paid_invoice = {
        "id": "inv-stripe-" + session_id,
        "tenantId": target_tenant_id,
        "tenantName": "BARBER LS",
        "invoiceNumber": "INV-2026-P4K16F",
        "amount": 3.0,
        "status": "paid",
        "issueDate": "2026-10-26",
        "dueDate": "2026-10-26",
        "paidAt": "2026-10-26T22:30:00.000Z",
        "pago_em": "2026-10-26T22:30:00.000Z",
        "paymentMethod": "stripe",
        "stripePaymentId": session_id,
        "items": [
            {
                "description": "Assinatura Naville SaaS Plano PRO (Mensal) - Cartão de Crédito (Stripe)",
                "quantity": 1,
                "unitPrice": 3.0,
                "total": 3.0
            }
        ]
    }

    # Remove duplicates
    state['invoices'] = [inv for inv in state['invoices'] if inv.get('stripePaymentId') != session_id and inv.get('id') != paid_invoice['id']]
    state['invoices'].insert(0, paid_invoice)

    # Ensure tenant status is active
    if isinstance(state.get('tenants'), list):
        for t in state['tenants']:
            if t.get('id') == target_tenant_id or t.get('slug') == 'barber-ls':
                t['status'] = 'active'
                t['status_assinatura'] = 'ativo'
                t['nextBillingDate'] = '2026-11-26'
                t['data_proximo_vencimento'] = '2026-11-26'

    clean_state_json = json.dumps(state, ensure_ascii=False)
    cur.execute("UPDATE sistema_estado_global SET dados = ? WHERE chave = 'naville_prod_v2'", (clean_state_json,))
    con.commit()
    print("Database updated! Invoices count:", len(state['invoices']))
con.close()
