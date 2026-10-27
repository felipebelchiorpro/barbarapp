file_path = 'src/components/SuperAdmin/InvoiceNinjaManager.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add import
if 'DigitalReceiptModal' not in text:
    text = text.replace(
        "import { formatCurrency, formatDatePtBR } from '../../utils/formatters';",
        "import { formatCurrency, formatDatePtBR } from '../../utils/formatters';\nimport { DigitalReceiptModal } from '../Shared/DigitalReceiptModal';"
    )

# 2. Add state
if 'selectedReceiptInvoice' not in text:
    text = text.replace(
        "const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'simulator' | 'logs' | 'settings'>('invoices');",
        "const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'simulator' | 'logs' | 'settings'>('invoices');\n  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);"
    )

# 3. Add Ver Recibo button
old_button = """                            {isPaid && (
                              <button
                                onClick={() => {
                                  onTriggerWebhook({
                                    eventType: 'invoice.past_due',
                                    tenantId: inv.tenantId,
                                    invoiceId: inv.id,
                                    amount: inv.amount,
                                  });
                                }}
                                className="h-7 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold text-[10px] transition cursor-pointer"
                                title="Simula atraso de fatura e aciona o Kill Switch"
                              >
                                Forçar Inadimplência
                              </button>
                            )}"""

new_button = """                            {isPaid && (
                              <>
                                <button
                                  onClick={() => setSelectedReceiptInvoice(inv)}
                                  className="h-7 px-2.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm"
                                  title="Ver Recibo Oficial de Quitação Digital"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Ver Recibo</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onTriggerWebhook({
                                      eventType: 'invoice.past_due',
                                      tenantId: inv.tenantId,
                                      invoiceId: inv.id,
                                      amount: inv.amount,
                                    });
                                  }}
                                  className="h-7 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white font-bold text-[10px] transition cursor-pointer"
                                  title="Simula atraso de fatura e aciona o Kill Switch"
                                >
                                  Forçar Inadimplência
                                </button>
                              </>
                            )}"""

text = text.replace(old_button.replace('\r\n', '\n'), new_button.replace('\r\n', '\n'))
text = text.replace(old_button.replace('\n', '\r\n'), new_button)

# 4. Render modal at end
old_end = """    </div>
  );
};"""

new_end = """      {selectedReceiptInvoice && (
        <DigitalReceiptModal
          invoice={selectedReceiptInvoice}
          tenant={tenants.find((t) => t.id === selectedReceiptInvoice.tenantId)}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
};"""

idx = text.rfind(old_end.replace('\r\n', '\n'))
if idx == -1:
    idx = text.rfind(old_end.replace('\n', '\r\n'))

if idx != -1:
    text = text[:idx] + new_end + text[idx + len(old_end):]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated InvoiceNinjaManager.tsx successfully')
