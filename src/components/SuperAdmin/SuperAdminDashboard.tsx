import React, { useState, useEffect } from 'react';
import {
  TenantConfig,
  Invoice,
  InvoiceNinjaConfig,
  InvoiceNinjaWebhookEvent,
  InvoiceNinjaWebhookLog,
  SubscriptionPlan,
  CrmWebhookConfig,
} from '../../types';
import {
  DEFAULT_INVOICE_NINJA_CONFIG,
  SAAS_PLANS,
  INITIAL_INVOICES,
  INITIAL_NINJA_WEBHOOK_LOGS,
} from '../../data/mockData';
import { checkPocketBaseHealth } from '../../services/pocketbase';
import { EstablishmentFormModal } from './EstablishmentFormModal';
import { EditTenantPlanModal } from './EditTenantPlanModal';
import { SuperAdminBiDashboard } from './SuperAdminBiDashboard';

interface SuperAdminDashboardProps {
  tenants: TenantConfig[];
  activeTenantId: string;
  invoices?: Invoice[];
  plans?: SubscriptionPlan[];
  invoiceNinjaConfig?: InvoiceNinjaConfig;
  ninjaLogs?: InvoiceNinjaWebhookLog[];
  crmConfig?: CrmWebhookConfig;
  onSelectTenant: (tenantId: string) => void;
  onUpdateTenant: (updatedTenant: TenantConfig) => void;
  onAddTenant: (newTenant: TenantConfig) => void;
  onNavigateView: (view: 'client' | 'admin') => void;
  onUpdateInvoiceNinjaConfig?: (cfg: InvoiceNinjaConfig) => void;
  onUpdateCrmConfig?: (cfg: CrmWebhookConfig) => void;
  onTriggerNinjaWebhook?: (params: {
    eventType: InvoiceNinjaWebhookEvent;
    tenantId: string;
    invoiceId?: string;
    amount?: number;
    forcedIdempotencyKey?: string;
  }) => { actionTaken: string; isDuplicate: boolean };
  onClearNinjaLogs?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  tenants,
  invoices = INITIAL_INVOICES,
  plans = SAAS_PLANS,
  invoiceNinjaConfig = DEFAULT_INVOICE_NINJA_CONFIG,
  ninjaLogs = INITIAL_NINJA_WEBHOOK_LOGS,
  crmConfig,
  onSelectTenant,
  onUpdateTenant,
  onAddTenant,
  onNavigateView,
}) => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPocketBaseOnline, setIsPocketBaseOnline] = useState<boolean | null>(null);
  const [editingPlanTenant, setEditingPlanTenant] = useState<TenantConfig | null>(null);
  const [editingEstablishmentTenant, setEditingEstablishmentTenant] = useState<TenantConfig | null>(null);

  // Check PocketBase health periodically
  useEffect(() => {
    checkPocketBaseHealth().then(setIsPocketBaseOnline);
    const interval = setInterval(() => {
      checkPocketBaseHealth().then(setIsPocketBaseOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-6 text-left">
      {/* Naville Control Tower Executive Dashboard */}
      <SuperAdminBiDashboard
        tenants={tenants}
        onSelectTenant={onSelectTenant}
        onNavigateTenantAdmin={(tenantId) => {
          onSelectTenant(tenantId);
          onNavigateView('admin');
        }}
        onUpdateTenant={onUpdateTenant}
        onNewTenant={() => setIsNewModalOpen(true)}
        onNavigateView={onNavigateView}
        onEditTenantPlan={(tenant) => setEditingPlanTenant(tenant)}
        onEditEstablishment={(tenant) => setEditingEstablishmentTenant(tenant)}
        invoices={invoices}
        plans={plans}
        invoiceNinjaConfig={invoiceNinjaConfig}
        ninjaLogs={ninjaLogs}
        crmConfig={crmConfig}
        isPocketBaseOnline={Boolean(isPocketBaseOnline)}
      />

      {/* Modal Novo Estabelecimento (Cadastro Completo: Fiscais, PJ/PF, Endereço, Faturamento) */}
      <EstablishmentFormModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={(newTenant) => {
          onAddTenant(newTenant);
        }}
        tenantToEdit={null}
        userRole="superadmin"
      />

      {/* Modal Editar Cadastro de Estabelecimento Existente */}
      {editingEstablishmentTenant && (
        <EstablishmentFormModal
          isOpen={true}
          onClose={() => setEditingEstablishmentTenant(null)}
          onSave={(updatedTenant) => {
            onUpdateTenant(updatedTenant);
            setEditingEstablishmentTenant(null);
          }}
          tenantToEdit={editingEstablishmentTenant}
          userRole="superadmin"
        />
      )}

      {/* Modal Editar Plano & Módulos (Super Admin Master) */}
      {editingPlanTenant && (
        <EditTenantPlanModal
          tenant={editingPlanTenant}
          plans={plans}
          isOpen={true}
          onClose={() => setEditingPlanTenant(null)}
          onSave={(updatedTenant) => {
            onUpdateTenant(updatedTenant);
            setEditingPlanTenant(null);
          }}
        />
      )}
    </div>
  );
};
