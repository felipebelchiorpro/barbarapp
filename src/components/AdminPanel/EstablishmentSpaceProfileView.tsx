import React, { useState } from 'react';
import {
  Storefront,
  UploadSimple,
  Trash,
  ArrowUp,
  ArrowDown,
  Plus,
  CheckCircle,
  Clock,
  MapPin,
  InstagramLogo,
  Phone,
  Crown,
  Sparkle,
  Image as ImageIcon,
  FloppyDisk,
  Eye,
  X,
  CaretLeft,
  CaretRight,
  ShieldCheck,
} from '@phosphor-icons/react';
import { TenantConfig, DayOperatingHours } from '../../types';

interface EstablishmentSpaceProfileViewProps {
  tenant: TenantConfig;
  onUpdateTenant: (updatedTenant: TenantConfig) => void;
  onPreviewPublicBooking?: () => void;
}

const DEFAULT_OPERATING_HOURS: DayOperatingHours[] = [
  { dayOfWeek: 0, dayLabel: 'Domingo', isOpen: false, openTime: '09:00', closeTime: '14:00', hasLunchBreak: false, lunchStart: '12:00', lunchEnd: '13:00' },
  { dayOfWeek: 1, dayLabel: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
  { dayOfWeek: 2, dayLabel: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
  { dayOfWeek: 3, dayLabel: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
  { dayOfWeek: 4, dayLabel: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
  { dayOfWeek: 5, dayLabel: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '20:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
  { dayOfWeek: 6, dayLabel: 'Sábado', isOpen: true, openTime: '08:30', closeTime: '19:00', hasLunchBreak: true, lunchStart: '12:30', lunchEnd: '13:30' },
];

export const EstablishmentSpaceProfileView: React.FC<EstablishmentSpaceProfileViewProps> = ({
  tenant,
  onUpdateTenant,
  onPreviewPublicBooking,
}) => {
  // Form State
  const [name, setName] = useState(tenant.name || '');
  const [ownerPhone, setOwnerPhone] = useState(tenant.ownerPhone || '');
  const [address, setAddress] = useState(tenant.address || 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(tenant.googleMapsUrl || 'https://maps.google.com/?q=Barbearia+LS');
  const [instagramUrl, setInstagramUrl] = useState(tenant.instagramUrl || 'https://instagram.com/barbearia_ls');
  const [descricaoEspaco, setDescricaoEspaco] = useState(
    tenant.descricao_espaco ||
      'Ambiente climatizado, com barbearia clássica, toalha quente na navalha, café em grãos e cerveja gelada de cortesia para todos os nossos clientes.'
  );

  // Mídia
  const [logoUrl, setLogoUrl] = useState<string>(tenant.logoUrl || '');
  const [capaPrincipalUrl, setCapaPrincipalUrl] = useState<string>(
    tenant.capaPrincipalUrl ||
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80'
  );
  const [galeriaFotos, setGaleriaFotos] = useState<string[]>(
    tenant.galeriaFotos && tenant.galeriaFotos.length > 0
      ? tenant.galeriaFotos
      : [
          'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80',
        ]
  );

  // Horários
  const [operatingHours, setOperatingHours] = useState<DayOperatingHours[]>(
    tenant.horarios_funcionamento && tenant.horarios_funcionamento.length === 7
      ? tenant.horarios_funcionamento
      : DEFAULT_OPERATING_HOURS
  );

  // Estados de feedback & Lightbox
  const [isSavedToastOpen, setIsSavedToastOpen] = useState(false);
  const [previewLightboxIndex, setPreviewLightboxIndex] = useState<number | null>(null);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle Cover Upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCapaPrincipalUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle Gallery Photo Add
  const handleAddGalleryPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 10 - galeriaFotos.length;
    if (remainingSlots <= 0) return;

    const filesToLoad = Array.from(files).slice(0, remainingSlots);
    filesToLoad.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setGaleriaFotos((prev) => (prev.length < 10 ? [...prev, reader.result as string] : prev));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Gallery Photo Reorder
  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= galeriaFotos.length) return;
    const copy = [...galeriaFotos];
    const item = copy.splice(index, 1)[0];
    copy.splice(newIndex, 0, item);
    setGaleriaFotos(copy);
  };

  // Gallery Photo Delete
  const handleDeletePhoto = (index: number) => {
    setGaleriaFotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Operating Hours update
  const handleToggleDay = (dayIndex: number) => {
    setOperatingHours((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, isOpen: !d.isOpen } : d))
    );
  };

  const handleUpdateHour = (dayIndex: number, field: keyof DayOperatingHours, value: any) => {
    setOperatingHours((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, [field]: value } : d))
    );
  };

  // Save changes
  const handleSave = () => {
    const updated: TenantConfig = {
      ...tenant,
      name,
      ownerPhone,
      address,
      googleMapsUrl,
      instagramUrl,
      descricao_espaco: descricaoEspaco,
      logoUrl,
      capaPrincipalUrl,
      galeriaFotos,
      horarios_funcionamento: operatingHours,
    };
    onUpdateTenant(updated);
    setIsSavedToastOpen(true);
    setTimeout(() => setIsSavedToastOpen(false), 4000);
  };

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* 1. TOP HEADER & BADGE DE PARCEIRO FUNDADOR VITALÍCIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-[#D4AF37] border border-amber-500/30">
              Personalização Visual & Vitrine
            </span>
            {tenant.is_vitalicio && (
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-gradient-to-r from-[#D4A373]/30 via-amber-500/20 to-[#D4A373]/30 text-[#D4A373] border border-[#D4A373]/60 shadow-lg shadow-amber-500/10 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" weight="fill" />
                PARCEIRO FUNDADOR VITALÍCIO
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight mt-1">
            Minha Barbearia & Espaço
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Personalize a vitrine pública, logo, galeria de fotos e horários de funcionamento exibidos aos clientes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onPreviewPublicBooking && (
            <button
              type="button"
              onClick={onPreviewPublicBooking}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-1.5 border border-white/10 transition cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#D4AF37]" />
              <span>Ver Vitrine Pública</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F24] hover:from-[#E5BF45] hover:to-[#C49E30] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            <FloppyDisk className="w-4 h-4" weight="bold" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* TOAST DE SUCESSO */}
      {isSavedToastOpen && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-xl animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" weight="fill" />
          <span>Alterações da barbearia e fotos da galeria salvas com sucesso!</span>
        </div>
      )}

      {/* 2. ÁREA DE MÍDIA: LOGO & CAPA PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LOGO DA BARBEARIA */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Logo do Estabelecimento</span>
            <span className="text-[10px] text-zinc-500 font-mono">1:1 Quadrado</span>
          </div>

          <div className="relative group w-32 h-32 mx-auto rounded-2xl overflow-hidden border-2 border-dashed border-white/20 bg-black/40 flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-3">
                <Storefront className="w-8 h-8 text-zinc-500 mx-auto" />
                <span className="text-[10px] text-zinc-400 block mt-1">Nenhum logo</span>
              </div>
            )}
            <label className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition cursor-pointer">
              <UploadSimple className="w-6 h-6 text-[#D4AF37]" weight="bold" />
              <span className="text-[10px] font-bold text-white mt-1">Alterar Foto</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
          <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
            Exibido no topo do agendamento dos clientes e nos comprovantes.
          </p>
        </div>

        {/* CAPA PRINCIPAL */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-white/10 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Capa Principal da Vitrine</span>
            <span className="text-[10px] text-zinc-500 font-mono">16:9 Panorâmica (HD)</span>
          </div>

          <div className="relative group w-full h-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-dashed border-white/20 bg-black/40 flex items-center justify-center">
            {capaPrincipalUrl ? (
              <img src={capaPrincipalUrl} alt="Capa" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="w-10 h-10 text-zinc-500 mx-auto" />
                <span className="text-xs text-zinc-400 block mt-1">Clique para carregar a capa</span>
              </div>
            )}
            <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition cursor-pointer">
              <UploadSimple className="w-8 h-8 text-[#D4AF37]" weight="bold" />
              <span className="text-xs font-bold text-white mt-1.5">Carregar Nova Capa</span>
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </label>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Esta imagem é a identidade visual principal apresentada no cabeçalho curvo do link de agendamento (/b/{tenant.slug}).
          </p>
        </div>
      </div>

      {/* 3. GALERIA DE FOTOS (ATÉ 10 IMAGENS COM REORDENAÇÃO & EXCLUSÃO) */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#D4AF37]" weight="fill" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Galeria de Fotos do Espaço ({galeriaFotos.length}/10)
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Fotos que aparecem no Lightbox / Modal "Ver Espaço" do agendamento dos seus clientes.
            </p>
          </div>

          <label
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              galeriaFotos.length >= 10
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-amber-500/40'
            }`}
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" weight="bold" />
            <span>Adicionar Fotos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={galeriaFotos.length >= 10}
              onChange={handleAddGalleryPhotos}
              className="hidden"
            />
          </label>
        </div>

        {galeriaFotos.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 space-y-2 border-2 border-dashed border-white/5 rounded-xl">
            <ImageIcon className="w-12 h-12 mx-auto text-zinc-600" />
            <p className="text-xs text-zinc-400">Nenhuma foto adicionada à galeria ainda.</p>
            <span className="text-[11px] text-zinc-500 block">
              Adicione fotos das bancadas, recepção, sala de espera e comodidades para encantar seus clientes.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {galeriaFotos.map((photoUrl, index) => (
              <div
                key={index}
                className="group relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-square shadow-md"
              >
                <img
                  src={photoUrl}
                  alt={`Galeria ${index + 1}`}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />

                {/* Badge de Posição */}
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/75 text-zinc-300 backdrop-blur-sm border border-white/10">
                  #{index + 1}
                </span>

                {/* Overlay de Ações (Reordenar & Excluir) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 flex items-end justify-between p-2 transition">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMovePhoto(index, 'up')}
                      className="w-6 h-6 rounded bg-zinc-800/90 hover:bg-zinc-700 disabled:opacity-20 text-white flex items-center justify-center text-xs transition cursor-pointer"
                      title="Mover para frente"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === galeriaFotos.length - 1}
                      onClick={() => handleMovePhoto(index, 'down')}
                      className="w-6 h-6 rounded bg-zinc-800/90 hover:bg-zinc-700 disabled:opacity-20 text-white flex items-center justify-center text-xs transition cursor-pointer"
                      title="Mover para trás"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewLightboxIndex(index)}
                      className="w-6 h-6 rounded bg-zinc-800/90 hover:bg-zinc-700 text-white flex items-center justify-center text-xs transition cursor-pointer"
                      title="Visualizar tela cheia"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index)}
                      className="w-6 h-6 rounded bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center text-xs transition cursor-pointer"
                      title="Excluir foto"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. INFORMAÇÕES DO ESTABELECIMENTO & LOCALIZAÇÃO */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <Storefront className="w-4 h-4 text-[#D4AF37]" weight="fill" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Informações do Estabelecimento & Endereço
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Nome Fantasia da Barbearia</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Barbearia Leonardo Soares"
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telefone / WhatsApp Comercial</span>
            </label>
            <input
              type="text"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="Ex: (11) 98123-4567"
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Endereço Completo</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro e cidade"
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Link do Google Maps</span>
            </label>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <InstagramLogo className="w-3.5 h-3.5 text-pink-400" />
              <span>Instagram Oficial (@barbearia)</span>
            </label>
            <input
              type="text"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/seu_perfil"
              className="w-full h-10 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-300">
              Descrição do Espaço (Exibida no Agendamento)
            </label>
            <textarea
              rows={3}
              value={descricaoEspaco}
              onChange={(e) => setDescricaoEspaco(e.target.value)}
              placeholder="Conte aos clientes sobre a experiência, ambiente, café, cerveja e conforto do seu espaço..."
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>
      </div>

      {/* 5. GRADE SEMANAL DE HORÁRIOS DE FUNCIONAMENTO */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <Clock className="w-4 h-4 text-[#D4AF37]" weight="fill" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Grade Semanal de Horários & Intervalos
          </h3>
        </div>

        <div className="space-y-2.5">
          {operatingHours.map((hour, idx) => (
            <div
              key={hour.dayOfWeek}
              className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                hour.isOpen
                  ? 'bg-black/40 border-white/10'
                  : 'bg-zinc-900/30 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 w-48">
                <button
                  type="button"
                  onClick={() => handleToggleDay(idx)}
                  className={`w-10 h-6 rounded-full p-0.5 transition cursor-pointer flex items-center ${
                    hour.isOpen ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
                <span className="text-xs font-bold text-white">{hour.dayLabel}</span>
              </div>

              {hour.isOpen ? (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-[11px]">Abre:</span>
                    <input
                      type="time"
                      value={hour.openTime}
                      onChange={(e) => handleUpdateHour(idx, 'openTime', e.target.value)}
                      className="px-2 py-1 rounded-lg bg-zinc-800 border border-white/10 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 text-[11px]">Fecha:</span>
                    <input
                      type="time"
                      value={hour.closeTime}
                      onChange={(e) => handleUpdateHour(idx, 'closeTime', e.target.value)}
                      className="px-2 py-1 rounded-lg bg-zinc-800 border border-white/10 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hour.hasLunchBreak}
                        onChange={(e) => handleUpdateHour(idx, 'hasLunchBreak', e.target.checked)}
                        className="rounded border-zinc-700 text-[#D4AF37] focus:ring-0"
                      />
                      <span>Pausa/Almoço</span>
                    </label>

                    {hour.hasLunchBreak && (
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <input
                          type="time"
                          value={hour.lunchStart || '12:00'}
                          onChange={(e) => handleUpdateHour(idx, 'lunchStart', e.target.value)}
                          className="px-1.5 py-1 rounded bg-zinc-800 border border-white/10 text-white text-[11px]"
                        />
                        <span className="text-zinc-500">às</span>
                        <input
                          type="time"
                          value={hour.lunchEnd || '13:00'}
                          onChange={(e) => handleUpdateHour(idx, 'lunchEnd', e.target.value)}
                          className="px-1.5 py-1 rounded bg-zinc-800 border border-white/10 text-white text-[11px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs font-semibold text-zinc-500 italic">Fechado o dia todo</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 6. LIGHTBOX PREVIEW DA GALERIA */}
      {previewLightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <button
            type="button"
            onClick={() => setPreviewLightboxIndex(null)}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-2 rounded-xl bg-black/50 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center">
            <img
              src={galeriaFotos[previewLightboxIndex]}
              alt={`Foto ${previewLightboxIndex + 1}`}
              className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                disabled={previewLightboxIndex === 0}
                onClick={() => setPreviewLightboxIndex(previewLightboxIndex - 1)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 text-white transition cursor-pointer"
              >
                <CaretLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono font-bold text-white">
                Foto {previewLightboxIndex + 1} de {galeriaFotos.length}
              </span>
              <button
                type="button"
                disabled={previewLightboxIndex === galeriaFotos.length - 1}
                onClick={() => setPreviewLightboxIndex(previewLightboxIndex + 1)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 text-white transition cursor-pointer"
              >
                <CaretRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
