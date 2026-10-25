import React, { useState, useMemo, useRef } from 'react';
import {
  UsersThree as Users,
  Plus,
  LockKey as Lock,
  UserPlus,
  PencilSimple as Edit2,
  Trash as Trash2,
  CheckCircle as CheckCircle2,
  XCircle,
  WarningCircle as AlertCircle,
  X,
  Phone,
  Scissors,
  Star,
  Power,
  UploadSimple as Upload,
  Camera,
  User,
  ArrowsClockwise,
  Lightning
} from '@phosphor-icons/react';
import { Barber, BarberAttendanceType, Service, TenantConfig } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { WhatsAppIcon } from '../WhatsAppIcon';
import { generateWhatsAppDirectLink } from '../../services/webhookService';
import { SelfServiceUpgradeModal } from './SelfServiceUpgradeModal';
import { updateBarberAdminPermission } from '../../services/authService';

interface BarbersManagementViewProps {
  barbers: Barber[];
  services?: Service[];
  tenantConfig: TenantConfig;
  onAddBarber: (newBarber: Omit<Barber, 'id'>) => boolean;
  onUpdateBarber: (barber: Barber) => void;
  onDeleteBarber: (barberId: string) => void;
  onToggleActive: (barberId: string) => boolean;
  onUpdateTenantConfig?: (tenant: TenantConfig) => void;
}

export const BarbersManagementView: React.FC<BarbersManagementViewProps> = ({
  barbers,
  services,
  tenantConfig,
  onAddBarber,
  onUpdateBarber,
  onDeleteBarber,
  onToggleActive,
  onUpdateTenantConfig,
}) => {
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSeatLimitModalOpen, setIsSeatLimitModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('Barbeiro Profissional');
  const [specialtiesText, setSpecialtiesText] = useState('Corte de Cabelo, Barba');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [attendanceType, setAttendanceType] = useState<BarberAttendanceType>('agenda');
  const [acceptsSubscriptionClub, setAcceptsSubscriptionClub] = useState<boolean>(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [canAccessAdmin, setCanAccessAdmin] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processamento e compressão inteligente da foto via Canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, JPEG ou WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('A imagem selecionada excede o limite de 15MB. Escolha uma foto menor.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/jpeg', 0.88);
            setAvatarUrl(optimized);
          } else {
            setAvatarUrl(event.target?.result as string);
          }
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } catch {
          setAvatarUrl(event.target?.result as string);
        } finally {
          setIsUploading(false);
        }
      };
      img.onerror = () => {
        setAvatarUrl(event.target?.result as string);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMessage('Não foi possível ler o arquivo da imagem.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Contagem de barbeiros ativos
  const activeBarbers = useMemo(() => {
    return barbers.filter((b) => b.active !== false);
  }, [barbers]);

  const activeCount = activeBarbers.length;
  const maxLimit = tenantConfig.limite_profissionais ?? tenantConfig.max_barbeiros ?? 1;
  const isLimitReached = activeCount >= maxLimit;

  // Link para solicitação de vaga adicional via WhatsApp
  const upsellWhatsAppMessage = 'Olá! Gostaria de adicionar mais uma vaga de barbeiro ao plano da minha barbearia.';
  const upsellWhatsAppLink = generateWhatsAppDirectLink(
    tenantConfig.supportPhone || '5511999999999',
    upsellWhatsAppMessage
  );

  const handleOpenCreateModal = () => {
    if (isLimitReached) {
      setIsSeatLimitModalOpen(true);
      return;
    }
    setEditingBarber(null);
    setName('');
    setNickname('');
    setRole('Barbeiro Profissional');
    setSpecialtiesText('Corte de Cabelo, Barba');
    setBio('');
    setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300');
    setAttendanceType('agenda');
    setAcceptsSubscriptionClub(true);
    setSelectedServiceIds(services?.map((s) => s.id) || []);
    setCanAccessAdmin(false);
    setLoginEmail('');
    setShowUrlInput(false);
    setUploadSuccess(false);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (barber: Barber) => {
    setEditingBarber(barber);
    setName(barber.name);
    setNickname(barber.nickname);
    setRole(barber.role);
    setSpecialtiesText(barber.specialties.join(', '));
    setBio(barber.bio);
    setAvatarUrl(barber.avatarUrl);
    setAttendanceType(barber.attendanceType || 'agenda');
    setAcceptsSubscriptionClub(barber.acceptsSubscriptionClub !== false);
    setSelectedServiceIds(
      barber.serviceIds && barber.serviceIds.length > 0
        ? barber.serviceIds
        : (services?.map((s) => s.id) || [])
    );
    setCanAccessAdmin(Boolean(barber.canAccessAdmin));
    setLoginEmail(barber.loginEmail || '');
    setShowUrlInput(false);
    setUploadSuccess(false);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!editingBarber && isLimitReached) {
      setIsModalOpen(false);
      setIsSeatLimitModalOpen(true);
      return;
    }

    if (!name.trim()) {
      setErrorMessage('O nome do profissional é obrigatório.');
      return;
    }

    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const serviceIdsToSave =
      services && selectedServiceIds.length === services.length
        ? undefined
        : selectedServiceIds;

    if (editingBarber) {
      // Edição de profissional existente
      onUpdateBarber({
        ...editingBarber,
        name: name.trim(),
        nickname: nickname.trim() || name.trim().split(' ')[0],
        role: role.trim(),
        specialties: specialties.length ? specialties : ['Corte Tradicional'],
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || editingBarber.avatarUrl,
        attendanceType,
        acceptsSubscriptionClub,
        serviceIds: serviceIdsToSave,
        canAccessAdmin,
        loginEmail: loginEmail.trim() || undefined,
      });
      // Sincroniza imediatamente o estado de permissão RBAC deste barbeiro
      updateBarberAdminPermission(editingBarber.id, canAccessAdmin);
      setIsModalOpen(false);
    } else {
      // Criação de novo profissional (com validação estrita de trava de limite)
      if (activeCount >= maxLimit) {
        setErrorMessage(
          `Você atingiu o limite de profissionais do seu plano (${activeCount}/${maxLimit}). Adicione novas vagas à sua assinatura.`
        );
        return;
      }

      const success = onAddBarber({
        name: name.trim(),
        nickname: nickname.trim() || name.trim().split(' ')[0],
        role: role.trim() || 'Barbeiro Profissional',
        rating: 5.0,
        reviewsCount: 1,
        avatarUrl:
          avatarUrl.trim() ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        specialties: specialties.length ? specialties : ['Corte Tradicional', 'Barba'],
        bio: bio.trim() || 'Especialista em cortes modernos e clássicos.',
        active: true,
        attendanceType,
        acceptsSubscriptionClub,
        serviceIds: serviceIdsToSave,
        canAccessAdmin,
        loginEmail: loginEmail.trim() || undefined,
      });

      if (success) {
        setIsModalOpen(false);
      } else {
        setErrorMessage('Não foi possível adicionar o profissional devido ao limite de vagas do plano.');
      }
    }
  };

  return (
    <div className="space-y-4 text-left w-full animate-in fade-in duration-150">
      {/* Header da Seção: Título + Contador Discreto de Vagas + Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#18181B] border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold font-display text-white">
                Profissionais da Barbearia
              </h3>

              {/* Indicador visual discreto de consumo de vagas */}
              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                  isLimitReached
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}
              >
                Vagas em uso: {activeCount} / {maxLimit}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cada profissional ativo possui sua própria grade de horários para agendamento online.
            </p>
          </div>
        </div>

        {/* Botão de Adicionar Profissional (com opção direta de liberar vaga quando limite atingido) */}
        <div>
          {isLimitReached ? (
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              title={`Limite do plano atingido (${activeCount}/${maxLimit}). Clique para liberar nova vaga instantaneamente.`}
              className="h-9 px-3.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
            >
              <Lightning className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" weight="fill" />
              <span>Novo Barbeiro (Liberar Vaga)</span>
            </button>
          ) : (
            <button
              onClick={handleOpenCreateModal}
              className="h-9 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Novo Barbeiro</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Upsell quando o limite de vagas for atingido */}
      {isLimitReached && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/30 border border-amber-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <UserPlus className="w-5 h-5" weight="bold" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Amplie sua equipe de barbeiros</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                  Vagas Adicionais
                </span>
              </h4>
              <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                Você atingiu o limite de profissionais do seu plano (<strong>{activeCount}/{maxLimit}</strong>).
                Adicione novas vagas à sua assinatura por apenas{' '}
                <strong className="text-[#D4AF37]">
                  {formatCurrency(tenantConfig.valor_adicional_barbeiro)}/mês
                </strong>{' '}
                cada e aumente a capacidade de agendamento da barbearia.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* BOTÃO PRIMÁRIO: AUTOATENDIMENTO IMEDIATO */}
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-amber-950/40 cursor-pointer whitespace-nowrap"
            >
              <Lightning className="w-4 h-4" weight="fill" />
              <span>Liberar Vaga Agora (Upgrade)</span>
            </button>

            {/* BOTÃO SECUNDÁRIO: DÚVIDAS VIA WHATSAPP */}
            <a
              href={upsellWhatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 border border-white/10 shrink-0 cursor-pointer whitespace-nowrap"
              title="Falar com o suporte comercial"
            >
              <WhatsAppIcon variant="official" size={14} />
              <span>Dúvidas?</span>
            </a>
          </div>
        </div>
      )}

      {/* Mensagem de Erro Temporária */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid de Profissionais Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {barbers.map((barber) => {
          const isActive = barber.active !== false;

          return (
            <div
              key={barber.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-[#18181B] border-white/10 hover:border-white/20 shadow-sm'
                  : 'bg-zinc-900/40 border-white/5 opacity-60'
              }`}
            >
              <div>
                {/* Top: Avatar, Nome, Status */}
                <div className="flex items-start gap-3">
                  <img
                    src={barber.avatarUrl}
                    alt={barber.name}
                    className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {barber.name}
                      </h4>
                      {isActive ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Ativo</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-white/10 shrink-0 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                          <span>Inativo</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-amber-400/90 font-medium truncate mt-0.5">
                      {barber.role}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
                      <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
                      <span className="font-semibold text-zinc-200">{barber.rating.toFixed(2)}</span>
                      <span>({barber.reviewsCount} avaliações)</span>
                    </div>

                    {/* Badges de Atendimento & Clube de Assinaturas */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {/* Modalidade de Atendimento */}
                      {barber.attendanceType === 'ordem_chegada' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          🚶 Ordem de Chegada
                        </span>
                      ) : barber.attendanceType === 'ambos' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          ⚡ Agenda & Fila
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          📅 Hora Marcada
                        </span>
                      )}

                      {/* Clube VIP ou Avulso */}
                      {barber.acceptsSubscriptionClub === false ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-white/10" title="Atende exclusivamente serviços avulsos (fora da cota de mensalistas)">
                          ⭐ Apenas Avulso
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-[#D4AF37] border border-amber-500/30" title="Aceita agendamentos com cobertura do Clube de Assinaturas">
                          👑 Aceita Clube VIP
                        </span>
                      )}

                      {/* Capacidade de Serviços */}
                      {barber.serviceIds && barber.serviceIds.length > 0 && services && barber.serviceIds.length < services.length ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                          ✂️ {barber.serviceIds.length}/{services.length} serviços
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                          ✂️ Todos os serviços
                        </span>
                      )}

                      {/* Permissão de Acesso ao Painel de Dono */}
                      {barber.canAccessAdmin ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1" title="Barbeiro com permissão de proprietário: pode acessar o painel de dono">
                          🛡️ Acesso Dono Habilitado
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-white/5" title="Acesso restrito apenas ao Modo Cadeira">
                          🔒 Apenas Cadeira
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Especialidades */}
                <div className="mt-3 pt-2.5 border-t border-white/5">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1.5">
                    Especialidades
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {barber.specialties.map((spec, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-300"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Barra de Ações do Barbeiro */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                {/* Ativar / Desativar (libera vaga imediatamente) */}
                <button
                  onClick={() => {
                    const success = onToggleActive(barber.id);
                    if (!success) {
                      setErrorMessage(
                        `Limite atingido (${activeCount}/${maxLimit}). Adicione mais vagas para ativar este barbeiro.`
                      );
                    }
                  }}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                    isActive
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                  }`}
                  title={isActive ? 'Desativar (libera 1 vaga)' : 'Ativar profissional'}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isActive ? 'Pausar Vaga' : 'Ativar'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Editar */}
                  <button
                    onClick={() => handleOpenEditModal(barber)}
                    className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition active:scale-95 border border-white/5"
                    title="Editar informações do profissional"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  {/* Excluir */}
                  {barbers.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja remover ${barber.name}? A vaga será liberada imediatamente.`)) {
                          onDeleteBarber(barber.id);
                        }
                      }}
                      className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition active:scale-95"
                      title="Excluir profissional"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cadastro / Edição de Profissional */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-left">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    {editingBarber ? 'Editar Profissional' : 'Novo Profissional'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {editingBarber
                      ? 'Atualize dados, fotos e especialidades'
                      : `Vaga disponível (${activeCount + 1}/${maxLimit})`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Marcus Vinicius"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Como é chamado (Apelido)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ex: Marcus"
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Barbeiro Sênior"
                    className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Especialidades (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={specialtiesText}
                  onChange={(e) => setSpecialtiesText(e.target.value)}
                  placeholder="Ex: Degrade, Barba na Navalha, Pigmentação"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Foto do Profissional (Upload Direto ou URL) */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#D4AF37]" />
                    <span>Foto do Profissional</span>
                  </label>
                  {uploadSuccess && (
                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3" /> Foto Carregada!
                    </span>
                  )}
                  {isUploading && (
                    <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ArrowsClockwise className="w-3 h-3 animate-spin" /> Processando...
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
                  {/* Avatar Preview Box com Drag & Drop */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative group shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 flex items-center justify-center bg-zinc-950 shadow-inner ${
                      isDraggingOver
                        ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                        : 'border-amber-500/30 hover:border-amber-500/60'
                    }`}
                    title="Clique para enviar ou trocar a foto"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-500 gap-1">
                        <User className="w-7 h-7" />
                        <span className="text-[9px]">Sem foto</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1">
                      <Camera className="w-4 h-4 text-[#D4AF37]" />
                      <span>{avatarUrl ? 'Trocar' : 'Enviar'}</span>
                    </div>
                  </div>

                  {/* Actions & Instructions */}
                  <div className="flex-1 w-full space-y-2 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="h-8 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{avatarUrl ? 'Trocar Foto (Upload)' : 'Upload de Foto'}</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarUrl('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="h-8 px-2.5 rounded-xl bg-zinc-800 hover:bg-red-500/20 hover:text-red-300 text-zinc-400 text-xs font-medium border border-white/10 transition flex items-center gap-1"
                          title="Remover foto do barbeiro"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-[11px] text-zinc-400 hover:text-[#D4AF37] underline underline-offset-2 ml-auto"
                      >
                        {showUrlInput ? 'Ocultar URL' : 'Ou colar URL'}
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-tight">
                      Selecione uma foto do seu computador ou celular. A imagem é otimizada e salva diretamente no perfil.
                    </p>

                    {/* Hidden Native File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Collapsible Manual URL Input */}
                    {showUrlInput && (
                      <div className="pt-1.5 animate-in fade-in duration-150">
                        <input
                          type="text"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="Cole a URL da foto (https://...)"
                          className="w-full h-8 px-3 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Biografia / Apresentação curta
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Experiência, estilo de atendimento..."
                  className="w-full p-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              {/* 1. Modalidade de Atendimento (Agenda vs Ordem de Chegada vs Ambos) */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <span>Modalidade de Atendimento</span>
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {attendanceType === 'agenda'
                      ? '📅 Hora Marcada'
                      : attendanceType === 'ordem_chegada'
                      ? '🚶 Fila / Presencial'
                      : '⚡ Agenda & Fila'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttendanceType('agenda')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      attendanceType === 'agenda'
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                        : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">📅 Somente Agenda</span>
                      {attendanceType === 'agenda' && (
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Atende apenas com horário marcado pela grade online.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceType('ordem_chegada')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      attendanceType === 'ordem_chegada'
                        ? 'bg-blue-500/15 border-blue-500/50 text-white shadow-sm'
                        : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">🚶 Ordem de Chegada</span>
                      {attendanceType === 'ordem_chegada' && (
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Atende na fila presencial do balcão (sem escolha de horário fixo).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceType('ambos')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      attendanceType === 'ambos'
                        ? 'bg-purple-500/15 border-purple-500/50 text-white shadow-sm'
                        : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">⚡ Ambos (Híbrido)</span>
                      {attendanceType === 'ambos' && (
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">
                      Permite agendar horário na grade ou entrar na fila presencial.
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Participação no Clube de Assinaturas (Plano de Corte) */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👑</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Participa do Clube de Assinaturas (Plano VIP)
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Permitir que clientes mensalistas agendem com este profissional usando a cota
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAcceptsSubscriptionClub(!acceptsSubscriptionClub)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      acceptsSubscriptionClub ? 'bg-[#D4AF37]' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        acceptsSubscriptionClub ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div
                  className={`p-2.5 rounded-xl text-[11px] border leading-relaxed ${
                    acceptsSubscriptionClub
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                      : 'bg-zinc-950 border-white/5 text-zinc-400'
                  }`}
                >
                  {acceptsSubscriptionClub ? (
                    <span>
                      ✅ <strong>Incluso no Clube VIP:</strong> Mensalistas com plano ativo têm 100% de desconto na cota mensal de cortes/barba ao agendar com {name || 'este profissional'}.
                    </span>
                  ) : (
                    <span>
                      ⚠️ <strong>Apenas Serviço Avulso Particular:</strong> Mensalistas pagarão o valor avulso normal de balcão ao agendar com este profissional (não consome cota do clube).
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Permissão de Acesso ao Painel de Dono / Administrativo */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">🛡️</span>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Habilitar Acesso ao Painel de Dono</span>
                        {canAccessAdmin ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            HABILITADO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-white/5">
                            BLOQUEADO (PADRÃO)
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                        {canAccessAdmin
                          ? 'Este barbeiro tem permissão para acessar o painel administrativo, ver faturamento, caixa e relatórios gerais.'
                          : 'Barbeiro comum: consegue acessar apenas o seu Modo Cadeira (/barbeiro). Fica estritamente bloqueado de acessar a área do proprietário.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCanAccessAdmin(!canAccessAdmin)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      canAccessAdmin ? 'bg-[#D4AF37]' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        canAccessAdmin ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {canAccessAdmin && (
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <label className="text-[11px] font-medium text-zinc-300">
                      E-mail de Login do Barbeiro (Opcional)
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ex: diego@navillebarber.com"
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                )}
              </div>

              {/* 4. Serviços que este profissional realiza */}
              {services && services.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>✂️ Serviços que este Barbeiro Realiza</span>
                        <span className="text-[10px] font-mono text-[#D4AF37] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 font-bold">
                          {selectedServiceIds.length}/{services.length}
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        O cliente será avisado caso tente agendar serviços que este barbeiro não realiza
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedServiceIds(services.map((s) => s.id))}
                        className="text-[10px] text-[#D4AF37] hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedServiceIds([])}
                        className="text-[10px] text-zinc-400 hover:underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {services.map((svc) => {
                      const isChecked = selectedServiceIds.includes(svc.id);
                      return (
                        <label
                          key={svc.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-amber-500/10 border-amber-500/30 text-white'
                              : 'bg-zinc-950/60 border-white/5 text-zinc-500 hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedServiceIds((prev) => prev.filter((id) => id !== svc.id));
                                } else {
                                  setSelectedServiceIds((prev) => [...prev, svc.id]);
                                }
                              }}
                              className="rounded border-zinc-700 text-[#D4AF37] focus:ring-[#D4AF37] bg-zinc-900"
                            />
                            <div className="truncate">
                              <span className="text-xs font-semibold block truncate">
                                {svc.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 block">
                                {svc.durationMinutes} min • R$ {svc.price.toFixed(0)}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isChecked
                                ? 'bg-amber-500/20 text-[#D4AF37]'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {isChecked ? 'Atende' : 'Não faz'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c59f2e] text-black text-xs font-bold transition active:scale-95 shadow-md"
                >
                  {editingBarber ? 'Salvar Alterações' : 'Cadastrar Barbeiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Autoatendimento para Upgrade & Novas Vagas */}
      <SelfServiceUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        tenant={tenantConfig}
        activeCount={activeCount}
        onConfirmUpgrade={(updatedTenant) => {
          if (onUpdateTenantConfig) {
            onUpdateTenantConfig(updatedTenant);
          }
        }}
        onOpenCreateBarberModal={handleOpenCreateModal}
      />

      {/* Modal de Limite de Profissionais / Cadeiras Atingido (Matriz Vitalício & Limite de Cadeiras) */}
      {isSeatLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#141418] border border-[#D4A373]/50 rounded-2xl shadow-2xl p-6 text-center space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsSeatLimitModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-[#D4A373]/15 border border-[#D4A373]/30 mx-auto flex items-center justify-center text-[#D4A373]">
              <Users className="w-8 h-8" weight="fill" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-display">
                Limite de Profissionais Atingido
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Você atingiu o limite de <strong className="text-[#D4A373] font-bold">{maxLimit}</strong> profissional(is) do seu cadastro. Entre em contato com o suporte para expandir suas cadeiras.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/50 border border-[#262630] text-xs text-zinc-400 flex items-center justify-between font-mono">
              <span>Profissionais ativos cadastrados:</span>
              <span className="font-bold text-white">{activeCount} de {maxLimit} permitido(s)</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSeatLimitModalOpen(false)}
                className="w-full sm:w-1/2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                Voltar
              </button>
              <a
                href={generateWhatsAppDirectLink(
                  tenantConfig.supportPhone || '5511999999999',
                  `Olá suporte Naville! Minha barbearia (${tenantConfig.name}) atingiu o limite de ${maxLimit} profissional(is) e gostaria de solicitar a expansão das minhas cadeiras.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D4A373] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <WhatsAppIcon size={16} variant="monochrome" className="text-black" />
                <span>Chamar Suporte</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
