import React, { useState, useEffect } from 'react';
import {
  X,
  Storefront,
  Buildings,
  IdentificationCard,
  MapPin,
  User,
  EnvelopeSimple,
  CurrencyDollar,
  UsersThree,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  FloppyDisk,
  CaretRight,
  CaretLeft,
  CircleNotch,
} from '@phosphor-icons/react';
import { TenantConfig, TipoDocumentoFiscal, RegimeTributario, SubscriptionBillingCycle } from '../../types';
import {
  formatCpfCnpj,
  formatCep,
  formatPhone,
  cleanDigits,
} from '../../utils/maskUtils';
import { fetchAddressByCep } from '../../services/viaCepService';
import { getEstablishmentFormPermissions } from '../../utils/establishmentPermissions';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface EstablishmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tenant: TenantConfig) => void;
  tenantToEdit?: TenantConfig | null;
  userRole?: string; // RBAC futuro: 'superadmin' | 'suporte' | 'comercial'
}

type TabKey = 'identificacao' | 'endereco' | 'contato' | 'contrato';

const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const EstablishmentFormModal: React.FC<EstablishmentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  tenantToEdit,
  userRole = 'superadmin',
}) => {
  const isEditing = Boolean(tenantToEdit);
  const permissions = getEstablishmentFormPermissions(userRole);

  const [activeTab, setActiveTab] = useState<TabKey>('identificacao');

  // ==========================================
  // Seção 1: Identificação Comercial & Fiscal
  // ==========================================
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [slug, setSlug] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoFiscal>('CNPJ');
  const [documento, setDocumento] = useState('');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [regimeTributario, setRegimeTributario] = useState<RegimeTributario>('Simples Nacional');

  // ==========================================
  // Seção 2: Localização & Endereço
  // ==========================================
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estadoUf, setEstadoUf] = useState('SP');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ==========================================
  // Seção 3: Contato & Responsável Financeiro
  // ==========================================
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [cpfResponsavel, setCpfResponsavel] = useState('');
  const [emailFinanceiro, setEmailFinanceiro] = useState('');
  const [whatsappFinanceiro, setWhatsappFinanceiro] = useState('');

  // ==========================================
  // Seção 4: Parametrização do Plano & Contrato
  // ==========================================
  const [plan, setPlan] = useState<'starter' | 'pro' | 'enterprise' | 'partner'>('pro');
  const [cicloPagamento, setCicloPagamento] = useState<SubscriptionBillingCycle>('mensal');
  const [valorMensalidade, setValorMensalidade] = useState<number>(89.9);
  const [maxBarbeiros, setMaxBarbeiros] = useState<number>(3);
  const [status, setStatus] = useState<'active' | 'trial' | 'partner'>('active');
  const [modClube, setModClube] = useState<boolean>(true);
  const [modWhatsapp, setModWhatsapp] = useState<boolean>(true);
  const [modExpenses, setModExpenses] = useState<boolean>(true);
  const [modPdv, setModPdv] = useState<boolean>(true);
  const [modClients, setModClients] = useState<boolean>(true);

  // Carrega dados iniciais ao abrir ou mudar estabelecimento
  useEffect(() => {
    if (tenantToEdit) {
      setNomeFantasia(tenantToEdit.nome_fantasia || tenantToEdit.name || '');
      setSlug(tenantToEdit.slug || '');
      setRazaoSocial(tenantToEdit.razao_social || '');
      setTipoDocumento(tenantToEdit.tipo_documento || 'CNPJ');
      setDocumento(formatCpfCnpj(tenantToEdit.documento || '', tenantToEdit.tipo_documento || 'CNPJ'));
      setInscricaoMunicipal(tenantToEdit.inscricao_municipal || '');
      setInscricaoEstadual(tenantToEdit.inscricao_estadual || '');
      setRegimeTributario(tenantToEdit.regime_tributario || 'Simples Nacional');

      setCep(formatCep(tenantToEdit.cep || ''));
      setLogradouro(tenantToEdit.logradouro || '');
      setNumero(tenantToEdit.numero || '');
      setComplemento(tenantToEdit.complemento || '');
      setBairro(tenantToEdit.bairro || '');
      setCidade(tenantToEdit.cidade || '');
      setEstadoUf(tenantToEdit.estado_uf || 'SP');

      setNomeResponsavel(tenantToEdit.nome_responsavel || tenantToEdit.ownerName || '');
      setCpfResponsavel(formatCpfCnpj(tenantToEdit.cpf_responsavel || '', 'CPF'));
      setEmailFinanceiro(tenantToEdit.email_financeiro || '');
      setWhatsappFinanceiro(formatPhone(tenantToEdit.whatsapp_financeiro || tenantToEdit.ownerPhone || ''));

      setPlan(tenantToEdit.plan || 'pro');
      setCicloPagamento(tenantToEdit.ciclo_pagamento || tenantToEdit.plano_ciclo || 'mensal');
      setValorMensalidade(
        tenantToEdit.valor_mensalidade_acordado ??
        tenantToEdit.planBasePrice ??
        (tenantToEdit.plan === 'starter' ? 49.9 : tenantToEdit.plan === 'enterprise' ? 149.9 : 89.9)
      );
      setMaxBarbeiros(tenantToEdit.max_barbeiros_inclusos ?? tenantToEdit.max_barbeiros ?? 3);
      setStatus(tenantToEdit.status === 'blocked' ? 'active' : tenantToEdit.status || 'active');
      setModClube(tenantToEdit.recurso_clube_ativo ?? tenantToEdit.enabledModules?.clube_assinaturas ?? true);
      setModWhatsapp(tenantToEdit.whatsapp_ativo ?? tenantToEdit.enabledModules?.whatsapp_auto ?? true);
      setModExpenses(tenantToEdit.recurso_financeiro_avancado ?? tenantToEdit.enabledModules?.expenses ?? true);
      setModPdv(tenantToEdit.enabledModules?.pdv ?? true);
      setModClients(tenantToEdit.enabledModules?.clients ?? true);
    } else {
      // Reset para novo cadastro
      setNomeFantasia('');
      setSlug('');
      setRazaoSocial('');
      setTipoDocumento('CNPJ');
      setDocumento('');
      setInscricaoMunicipal('');
      setInscricaoEstadual('');
      setRegimeTributario('Simples Nacional');

      setCep('');
      setLogradouro('');
      setNumero('');
      setComplemento('');
      setBairro('');
      setCidade('');
      setEstadoUf('SP');

      setNomeResponsavel('');
      setCpfResponsavel('');
      setEmailFinanceiro('');
      setWhatsappFinanceiro('');

      setPlan('pro');
      setCicloPagamento('mensal');
      setValorMensalidade(89.9);
      setMaxBarbeiros(3);
      setStatus('active');
      setModClube(true);
      setModWhatsapp(true);
      setModExpenses(true);
      setModPdv(true);
      setModClients(true);
    }
    setCepFeedback(null);
    setActiveTab('identificacao');
  }, [tenantToEdit, isOpen]);

  if (!isOpen) return null;

  // Auto-geração do slug a partir do nome fantasia
  const handleNomeFantasiaChange = (val: string) => {
    setNomeFantasia(val);
    if (!isEditing) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  // Consulta automática ou por clique no ViaCEP
  const handleSearchCep = async (targetCep?: string) => {
    const rawCep = targetCep !== undefined ? targetCep : cep;
    const digits = cleanDigits(rawCep);

    if (digits.length !== 8) {
      setCepFeedback({ type: 'error', message: 'Informe os 8 dígitos do CEP.' });
      return;
    }

    setIsLoadingCep(true);
    setCepFeedback(null);

    const res = await fetchAddressByCep(digits);
    setIsLoadingCep(false);

    if (res.success && res.address) {
      setLogradouro(res.address.logradouro || logradouro);
      setBairro(res.address.bairro || bairro);
      setCidade(res.address.localidade || cidade);
      if (res.address.uf && UFS_BRASIL.includes(res.address.uf.toUpperCase())) {
        setEstadoUf(res.address.uf.toUpperCase());
      }
      setCepFeedback({
        type: 'success',
        message: `${res.address.localidade} - ${res.address.uf} preenchido via ViaCEP.`,
      });
    } else {
      setCepFeedback({
        type: 'error',
        message: res.error || 'CEP não localizado. Preencha manualmente.',
      });
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    setCepFeedback(null);

    // Auto-trigger automático quando completa os 8 dígitos
    const digits = cleanDigits(formatted);
    if (digits.length === 8) {
      handleSearchCep(digits);
    }
  };

  // Submissão do formulário
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Apenas Nome Fantasia é obrigatório!
    if (!nomeFantasia.trim()) {
      setActiveTab('identificacao');
      return;
    }

    const tenantId = isEditing && tenantToEdit
      ? tenantToEdit.id
      : `tenant-${slug.trim() || Date.now()}`;

    const effectiveSlug = slug.trim() || `barbearia-${Date.now()}`;

    const savedTenant: TenantConfig = {
      // Preserva dados preexistentes se for edição
      ...(tenantToEdit || {}),
      id: tenantId,
      name: nomeFantasia.trim(),
      slug: effectiveSlug,
      ownerName: (nomeResponsavel.trim() || tenantToEdit?.ownerName || 'Responsável').trim(),
      ownerPhone: (cleanDigits(whatsappFinanceiro) || tenantToEdit?.ownerPhone || '11999999999').trim(),
      plan,
      planBasePrice: plan === 'partner' ? 0 : (valorMensalidade || 49.9),
      max_barbeiros: maxBarbeiros,
      valor_adicional_barbeiro: tenantToEdit?.valor_adicional_barbeiro || 25.0,
      status: plan === 'partner' ? 'partner' : (tenantToEdit?.status || status),
      is_vitalicio: plan === 'partner' || status === 'partner',
      whatsappStatus: tenantToEdit?.whatsappStatus || 'close',
      instanceName: `naville_${effectiveSlug.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
      createdAt: tenantToEdit?.createdAt || new Date().toISOString(),
      cidade: cidade.trim() ? `${cidade.trim()} - ${estadoUf}` : tenantToEdit?.cidade,

      // Dados Fiscais & NFS-e (Todos opcionais)
      nome_fantasia: nomeFantasia.trim(),
      razao_social: razaoSocial.trim() || undefined,
      tipo_documento: tipoDocumento,
      documento: cleanDigits(documento) || undefined,
      inscricao_municipal: inscricaoMunicipal.trim() || undefined,
      inscricao_estadual: inscricaoEstadual.trim() || undefined,
      regime_tributario: regimeTributario,

      // Endereço
      cep: cleanDigits(cep) || undefined,
      logradouro: logradouro.trim() || undefined,
      numero: numero.trim() || undefined,
      complemento: complemento.trim() || undefined,
      bairro: bairro.trim() || undefined,
      estado_uf: estadoUf || undefined,

      // Contato & Financeiro
      nome_responsavel: nomeResponsavel.trim() || undefined,
      cpf_responsavel: cleanDigits(cpfResponsavel) || undefined,
      email_financeiro: emailFinanceiro.trim() || undefined,
      whatsapp_financeiro: cleanDigits(whatsappFinanceiro) || undefined,

      // Contrato & SaaS
      plano_contratado: plan,
      ciclo_pagamento: cicloPagamento,
      valor_mensalidade_acordado: plan === 'partner' ? 0 : valorMensalidade,
      max_barbeiros_inclusos: maxBarbeiros,
      limite_profissionais: maxBarbeiros,
      recurso_clube_ativo: modClube,
      recurso_financeiro_avancado: modExpenses,
      whatsapp_ativo: modWhatsapp,
      enabledModules: {
        expenses: modExpenses,
        clients: modClients,
        pdv: modPdv,
        whatsapp_auto: modWhatsapp,
        clube_assinaturas: modClube,
      },
    };

    onSave(savedTenant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#141416] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#18181B]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D4AF37] shadow-sm">
              <Storefront className="w-5 h-5" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-display">
                  {isEditing ? `Editar Estabelecimento` : 'Novo Estabelecimento'}
                </h3>
                {isEditing && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-amber-300 border border-white/10">
                    /{tenantToEdit?.slug}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Cadastro cadastral e fiscal unificado para faturamento e NFS-e.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            title="Fechar formulário"
          >
            <X className="w-5 h-5" weight="bold" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-2 border-b border-white/5 bg-[#111113] overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('identificacao')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'identificacao'
                ? 'bg-[#D4AF37] text-black font-bold shadow-md shadow-amber-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Buildings className="w-4 h-4" weight={activeTab === 'identificacao' ? 'fill' : 'regular'} />
            <span>1. Identificação & Fiscal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('endereco')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'endereco'
                ? 'bg-[#D4AF37] text-black font-bold shadow-md shadow-amber-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapPin className="w-4 h-4" weight={activeTab === 'endereco' ? 'fill' : 'regular'} />
            <span>2. Endereço & Local</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contato')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'contato'
                ? 'bg-[#D4AF37] text-black font-bold shadow-md shadow-amber-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" weight={activeTab === 'contato' ? 'fill' : 'regular'} />
            <span>3. Contato & Financeiro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contrato')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'contrato'
                ? 'bg-[#D4AF37] text-black font-bold shadow-md shadow-amber-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CurrencyDollar className="w-4 h-4" weight={activeTab === 'contrato' ? 'fill' : 'regular'} />
            <span>4. Plano & Contrato</span>
          </button>
        </div>

        {/* Form Content (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: IDENTIFICAÇÃO COMERCIAL & DADOS FISCAIS */}
          {activeTab === 'identificacao' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-center gap-2.5">
                <span className="text-sm">💡</span>
                <span>
                  <strong>Aviso:</strong> Apenas o <strong>Nome Fantasia</strong> é obrigatório. Todos os demais campos fiscais podem ser preenchidos gradualmente.
                </span>
              </div>

              {/* Nome Fantasia & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between mb-1.5">
                    <span>Nome Fantasia do Estabelecimento *</span>
                    <span className="text-[10px] text-amber-400 font-mono font-normal">Obrigatório</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeFantasia}
                    onChange={(e) => handleNomeFantasiaChange(e.target.value)}
                    placeholder="Ex: Barbearia Viking Club"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-amber-500/40 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Slug da URL <span className="text-zinc-500 font-normal">(Automático)</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="viking-club"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Preview dos 3 Links Oficiais Gerados pelo Slug */}
              {slug.trim() && (
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-[#D4AF37]/30 space-y-2 text-xs">
                  <div className="font-bold text-[#D4AF37] flex items-center justify-between">
                    <span>🔗 Links Personalizados Gerados Automaticamente:</span>
                    <span className="text-[10px] font-mono text-zinc-400">Login Dono: dono@{slug.trim()}.com</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-zinc-300 truncate">
                      <span className="text-zinc-500 block text-[10px] font-sans">1. Agendamento Cliente:</span>
                      /b/{slug.trim()}
                    </div>
                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-amber-300 truncate">
                      <span className="text-zinc-500 block text-[10px] font-sans">2. Painel do Dono:</span>
                      /b/{slug.trim()}/admin
                    </div>
                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 text-sky-300 truncate">
                      <span className="text-zinc-500 block text-[10px] font-sans">3. App do Barbeiro:</span>
                      /b/{slug.trim()}/barbeiro
                    </div>
                  </div>
                </div>
              )}

              {/* Razão Social */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1.5">
                  <span>Razão Social Completa</span>
                  <span className="text-[10px] text-zinc-500">Opcional · Utilizado para emissão de NFS-e</span>
                </label>
                <input
                  type="text"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Ex: Viking Comércio e Barbearia LTDA"
                  className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Seletor Tipo Documento (CNPJ / CPF) & Campo de Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Tipo de Pessoa
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10 h-11">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoDocumento('CNPJ');
                        setDocumento(formatCpfCnpj(documento, 'CNPJ'));
                      }}
                      className={`rounded-lg text-xs font-bold transition cursor-pointer ${
                        tipoDocumento === 'CNPJ'
                          ? 'bg-[#D4AF37] text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      PJ (CNPJ)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoDocumento('CPF');
                        setDocumento(formatCpfCnpj(documento, 'CPF'));
                      }}
                      className={`rounded-lg text-xs font-bold transition cursor-pointer ${
                        tipoDocumento === 'CPF'
                          ? 'bg-[#D4AF37] text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      PF (CPF)
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1.5">
                    <span>{tipoDocumento === 'CNPJ' ? 'CNPJ do Estabelecimento' : 'CPF do Titular'}</span>
                    <span className="text-[10px] text-zinc-500">Opcional</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={documento}
                      onChange={(e) => setDocumento(formatCpfCnpj(e.target.value, tipoDocumento))}
                      placeholder={tipoDocumento === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <IdentificationCard className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" weight="regular" />
                  </div>
                </div>
              </div>

              {/* Inscrição Municipal, Inscrição Estadual e Regime Tributário */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Inscrição Municipal <span className="text-zinc-500 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={inscricaoMunicipal}
                    onChange={(e) => setInscricaoMunicipal(e.target.value)}
                    placeholder="Ex: 1234567-8"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Inscrição Estadual <span className="text-zinc-500 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    placeholder="Isento ou Nº"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Regime Tributário
                  </label>
                  <select
                    value={regimeTributario}
                    onChange={(e) => setRegimeTributario(e.target.value as RegimeTributario)}
                    className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="MEI">MEI (Microempreendedor)</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Outro">Outro Regime</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOCALIZAÇÃO & ENDEREÇO VIA CEP */}
          {activeTab === 'endereco' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* CEP com Busca ViaCEP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1.5">
                    <span>CEP da Barbearia</span>
                    <span className="text-[10px] text-zinc-500">Auto-preenchimento via ViaCEP</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={cep}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                      />
                      <MapPin className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" weight="regular" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchCep()}
                      disabled={isLoadingCep}
                      className="h-11 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-white/5 shrink-0"
                    >
                      {isLoadingCep ? (
                        <>
                          <CircleNotch className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <MagnifyingGlass className="w-4 h-4 text-[#D4AF37]" weight="bold" />
                          <span>Buscar CEP</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Feedback do ViaCEP */}
                  {cepFeedback && (
                    <div
                      className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                        cepFeedback.type === 'success'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                          : 'bg-red-500/15 text-red-300 border border-red-500/20'
                      }`}
                    >
                      {cepFeedback.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" weight="fill" />
                      ) : (
                        <WarningCircle className="w-4 h-4 shrink-0 text-red-400" weight="fill" />
                      )}
                      <span>{cepFeedback.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Estado (UF)
                  </label>
                  <select
                    value={estadoUf}
                    onChange={(e) => setEstadoUf(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] cursor-pointer font-mono"
                  >
                    {UFS_BRASIL.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Logradouro (Rua/Avenida) & Número */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Logradouro (Rua, Avenida, Praça)
                  </label>
                  <input
                    type="text"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Ex: Rua Oscar Freire"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Número
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="1024"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Complemento, Bairro e Cidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Complemento <span className="text-zinc-500 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Sala 02, Loja B"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Jardins"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTATO DO RESPONSÁVEL & FINANCEIRO */}
          {activeTab === 'contato' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Nome do Gestor / Responsável
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nomeResponsavel}
                      onChange={(e) => setNomeResponsavel(e.target.value)}
                      placeholder="Ex: Leonardo Soares"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <User className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" weight="regular" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    CPF do Responsável <span className="text-zinc-500 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cpfResponsavel}
                      onChange={(e) => setCpfResponsavel(formatCpfCnpj(e.target.value, 'CPF'))}
                      placeholder="000.000.000-00"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <IdentificationCard className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" weight="regular" />
                  </div>
                </div>
              </div>

              {/* E-mail Financeiro & WhatsApp de Cobrança */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1.5">
                    <span>E-mail Financeiro (Faturas & Notas)</span>
                    <span className="text-[10px] text-zinc-500">Opcional</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={emailFinanceiro}
                      onChange={(e) => setEmailFinanceiro(e.target.value)}
                      placeholder="financeiro@barbearia.com"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <EnvelopeSimple className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" weight="regular" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1.5">
                    <span>WhatsApp Financeiro / Régua</span>
                    <span className="text-[10px] text-zinc-500">Opcional</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={whatsappFinanceiro}
                      onChange={(e) => setWhatsappFinanceiro(formatPhone(e.target.value))}
                      placeholder="(11) 98888-7766"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <WhatsAppIcon variant="official" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PARAMETRIZAÇÃO DO PLANO & CONTRATO */}
          {activeTab === 'contrato' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Seleção do Plano Base */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Plano Contratado do SaaS
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    { id: 'starter', name: 'Starter', price: 49.9, desc: 'Solo ou iniciante (1 cadeira)' },
                    { id: 'pro', name: 'Executive Pro', price: 89.9, desc: 'Recomendado (até 3 cadeiras)' },
                    { id: 'enterprise', name: 'Black Master', price: 149.9, desc: 'Redes e grandes equipes' },
                    { id: 'partner', name: 'Parceiro VIP', price: 0.0, desc: 'Fidelidade / Isento de Cobrança (R$ 0)' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!permissions.canEditContractPlan}
                      onClick={() => {
                        setPlan(p.id as any);
                        setValorMensalidade(p.price);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                        plan === p.id
                          ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : 'bg-zinc-900/60 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="text-xs font-mono font-bold text-[#D4AF37]">
                          R$ {p.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ciclo, Mensalidade Acordada e Limite de Barbeiros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Ciclo de Cobrança
                  </label>
                  <select
                    disabled={!permissions.canEditContractPlan}
                    value={cicloPagamento}
                    onChange={(e) => setCicloPagamento(e.target.value as SubscriptionBillingCycle)}
                    className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="semestral">Semestral (Desconto)</option>
                    <option value="anual">Anual (Máxima Economia)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between mb-1.5">
                    <span>Mensalidade Acordada (R$)</span>
                    <span className="text-[10px] text-amber-400">Customizável</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={!permissions.canEditContractPlan}
                      value={valorMensalidade}
                      onChange={(e) => setValorMensalidade(parseFloat(e.target.value) || 0)}
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
                    />
                    <span className="text-zinc-500 text-xs absolute left-3 top-1/2 -translate-y-1/2">R$</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Cadeiras / Barbeiros Inclusos
                  </label>
                  <div className="flex items-center gap-2 h-11">
                    <button
                      type="button"
                      disabled={!permissions.canEditContractPlan || maxBarbeiros <= 1}
                      onClick={() => setMaxBarbeiros(Math.max(1, maxBarbeiros - 1))}
                      className="w-10 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 h-11 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white">
                      {maxBarbeiros} vaga{maxBarbeiros > 1 ? 's' : ''}
                    </div>
                    <button
                      type="button"
                      disabled={!permissions.canEditContractPlan}
                      onClick={() => setMaxBarbeiros(maxBarbeiros + 1)}
                      className="w-10 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Status do Estabelecimento */}
              {!isEditing && (
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                    Status Inicial de Ativação
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === 'active'}
                        onChange={() => setStatus('active')}
                        className="text-amber-500 focus:ring-0"
                      />
                      <span>Ativo Imediatamente</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === 'trial'}
                        onChange={() => setStatus('trial')}
                        className="text-amber-500 focus:ring-0"
                      />
                      <span>Período de Testes (Trial 7 dias)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Modal Footer with Stepper Shortcuts & Save Button */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-white/5 bg-[#18181B]/80 shrink-0 flex-wrap gap-2">
          {/* Stepper Navigation */}
          <div className="flex items-center gap-1.5">
            {activeTab !== 'identificacao' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'endereco') setActiveTab('identificacao');
                  else if (activeTab === 'contato') setActiveTab('endereco');
                  else if (activeTab === 'contrato') setActiveTab('contato');
                }}
                className="h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <CaretLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}

            {activeTab !== 'contrato' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'identificacao') setActiveTab('endereco');
                  else if (activeTab === 'endereco') setActiveTab('contato');
                  else if (activeTab === 'contato') setActiveTab('contrato');
                }}
                className="h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <span>Avançar</span>
                <CaretRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!nomeFantasia.trim() || permissions.readOnly}
              className="h-10 px-5 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <FloppyDisk className="w-4 h-4" weight="bold" />
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Estabelecimento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
