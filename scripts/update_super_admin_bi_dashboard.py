import re

file_path = 'src/components/SuperAdmin/SuperAdminBiDashboard.tsx'
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
    state_target = "const [searchQuery, setSearchQuery] = useState('');"
    state_replacement = "const [searchQuery, setSearchQuery] = useState('');\n  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);"
    text = text.replace(state_target, state_replacement)

# 3. Add Invoices Section before Barra de Acoes Rapidas
anchor = "{/* Barra de Ações Rápidas de Governança */}"
invoices_section = """{/* Histórico de Faturas & Recibos deste Estabelecimento */}
                  <div className="p-4 rounded-2xl bg-[#141418] border border-[#262630] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#D4AF37]" weight="fill" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Faturas & Assinaturas SaaS
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {invoices.filter((i) => i.tenantId === selectedRawTenant.id).length} fatura(s)
                      </span>
                    </div>

                    {invoices.filter((i) => i.tenantId === selectedRawTenant.id).length === 0 ? (
                      <div className="text-center py-4 text-xs text-zinc-500">
                        Nenhuma fatura emitida para esta barbearia ainda. Clique em "+ Gerar Fatura" abaixo para emitir.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {invoices
                          .filter((i) => i.tenantId === selectedRawTenant.id)
                          .map((inv) => {
                            const isPaid = inv.status === 'paid';
                            const isOverdue = inv.status === 'overdue';
                            return (
                              <div
                                key={inv.id}
                                className="p-3 rounded-xl bg-black/40 border border-[#262630] flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-white">{inv.invoiceNumber}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        isPaid
                                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                          : isOverdue
                                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                      }`}
                                    >
                                      {isPaid ? 'Paga' : isOverdue ? 'Vencida' : 'Pendente'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                                    Vence: {formatDatePtBR(inv.dueDate)} {inv.paidAt && `· Paga em: ${formatDatePtBR(inv.paidAt)}`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-bold font-display text-[#D4AF37] tabular-nums">
                                    {formatCurrency(inv.amount)}
                                  </span>
                                  {isPaid && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReceiptInvoice(inv)}
                                      className="h-7 px-2.5 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-black font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                                      title="Visualizar Comprovante / Recibo Oficial"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      <span>Recibo</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  """

if anchor in text and "Faturas & Assinaturas SaaS" not in text:
    text = text.replace(anchor, invoices_section + anchor)

# 4. Render DigitalReceiptModal before the final closing </div>
final_closing = "      </div>\n    </div>\n  );\n};"
if final_closing not in text:
    final_closing = "    </div>\n  );\n};"

modal_render = """      {selectedReceiptInvoice && (
        <DigitalReceiptModal
          invoice={selectedReceiptInvoice}
          tenant={tenants.find((t) => t.id === selectedReceiptInvoice.tenantId)}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
"""

idx = text.rfind(final_closing)
if idx != -1:
    text = text[:idx] + modal_render + text[idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated SuperAdminBiDashboard.tsx successfully')
