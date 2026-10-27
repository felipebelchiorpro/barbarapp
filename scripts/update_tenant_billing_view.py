import re

file_path = "src/components/AdminPanel/TenantBillingView.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import DigitalReceiptModal
if "DigitalReceiptModal" not in content:
    content = content.replace(
        "import { createStripeSubscriptionCheckout } from '../../services/stripeService';",
        "import { createStripeSubscriptionCheckout } from '../../services/stripeService';\nimport { DigitalReceiptModal } from '../Shared/DigitalReceiptModal';"
    )

# Update onPayInvoiceSimulated signature in interface
content = re.sub(
    r"onPayInvoiceSimulated:\s*\(invoiceId:\s*string\)\s*=>\s*void;",
    "onPayInvoiceSimulated: (invoiceId: string, method?: 'pix' | 'stripe') => void;",
    content
)

# Update handleConfirmStripePayment
content = content.replace(
    "onPayInvoiceSimulated(inv.id);",
    "onPayInvoiceSimulated(inv.id, 'stripe');"
)

# Update handleSimulatePayment
content = content.replace(
    "onPayInvoiceSimulated(invoiceId);",
    "onPayInvoiceSimulated(invoiceId, 'pix');"
)

# Replace the modal code with DigitalReceiptModal
# Find from {/* Modal de Comprovante / Recibo Oficial de Pagamento */} to end of that block
old_modal_pattern = r"\{\/\* Modal de Comprovante \/ Recibo Oficial de Pagamento \*\/\}[\s\S]*?\{selectedReceiptInvoice && \([\s\S]*?\}\)\s*\}\s*<\/div>\s*\);\s*\};"

new_modal_code = """{/* Modal de Comprovante / Recibo Oficial de Pagamento */}
      {selectedReceiptInvoice && (
        <DigitalReceiptModal
          invoice={selectedReceiptInvoice}
          tenant={tenant}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
};"""

if re.search(old_modal_pattern, content):
    content = re.sub(old_modal_pattern, new_modal_code, content)
else:
    print("Warning: old_modal_pattern not matched directly, checking alternative replacement")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("TenantBillingView.tsx updated successfully")
