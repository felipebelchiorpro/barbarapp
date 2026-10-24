/**
 * Role-Based Access Control (RBAC) para Cadastro & Edição de Estabelecimentos
 * AppSec & Identity Access Specialist (Naville SaaS)
 * Prepara permissões para perfis futuros: SuperAdmin, Suporte, Comercial e Dono
 */

import { UserRole } from '../types';

export type EstablishmentRole = UserRole | 'suporte' | 'comercial';

export interface EstablishmentFormPermissions {
  canEditCommercial: boolean;     // Nome fantasia, razão social, CNPJ/CPF, inscrições
  canEditAddress: boolean;        // Endereço, CEP, número, complemento
  canEditFinancial: boolean;      // Contato e e-mail financeiro, responsável
  canEditContractPlan: boolean;   // Plano, ciclo de pagamento, valor mensalidade acordado
  canEditCriticalInfra: boolean;  // Status de bloqueio/Kill Switch, WhatsApp instance raw config
  readOnly: boolean;
}

/**
 * Retorna matriz de permissões granulares de acordo com o papel do usuário
 */
export function getEstablishmentFormPermissions(
  role: string = 'superadmin'
): EstablishmentFormPermissions {
  const normalizedRole = role.toLowerCase().trim();

  switch (normalizedRole) {
    case 'superadmin':
      return {
        canEditCommercial: true,
        canEditAddress: true,
        canEditFinancial: true,
        canEditContractPlan: true,
        canEditCriticalInfra: true,
        readOnly: false,
      };

    case 'comercial':
      return {
        canEditCommercial: true,
        canEditAddress: true,
        canEditFinancial: true,
        canEditContractPlan: true, // Comercial pode negociar e alterar planos e mensalidades
        canEditCriticalInfra: false, // Não pode alterar configurações de rede/banco
        readOnly: false,
      };

    case 'suporte':
      return {
        canEditCommercial: true,
        canEditAddress: true,
        canEditFinancial: true,
        canEditContractPlan: false, // Suporte não altera contratos ou valores de mensalidade
        canEditCriticalInfra: false,
        readOnly: false,
      };

    case 'owner':
      return {
        canEditCommercial: true,
        canEditAddress: true,
        canEditFinancial: true,
        canEditContractPlan: false, // Dono não muda seu próprio preço no SaaS
        canEditCriticalInfra: false,
        readOnly: false,
      };

    default:
      return {
        canEditCommercial: false,
        canEditAddress: false,
        canEditFinancial: false,
        canEditContractPlan: false,
        canEditCriticalInfra: false,
        readOnly: true,
      };
  }
}
