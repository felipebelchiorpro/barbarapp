import React, { useState, useRef } from 'react';
import { Star, MapPin, Clock, Camera, Sliders, Check, Smartphone } from 'lucide-react';
import { HERO_IMAGE } from '../data/mockData';

interface HeroBannerProps {
  onOpenQRCode?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenQRCode }) => {
  const [filterStyle, setFilterStyle] = useState<'dark' | 'cinematic' | 'natural'>('dark');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    return localStorage.getItem('barbearia_ls_custom_hero');
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1600;
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
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        try {
          localStorage.setItem('barbearia_ls_custom_hero', dataUrl);
          setCustomPhoto(dataUrl);
        } catch {
          setCustomPhoto(dataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  // Filter styling mapping
  const filterClasses = {
    dark: 'brightness-[0.82] contrast-[1.18] saturate-[0.88]',
    cinematic: 'brightness-[0.74] contrast-[1.26] saturate-[0.80] hue-rotate-[-3deg]',
    natural: 'brightness-100 contrast-100',
  }[filterStyle];

  const currentImg = customPhoto || HERO_IMAGE;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 group">
      {/* Background Hero Photography */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-black">
        <img
          src={currentImg}
          alt="Barbearia LS Interior Oficial"
          className={`w-full h-full object-cover object-[center_35%] transition-all duration-300 ${filterClasses}`}
        />

        {/* Cinematic Vignette & Deep Shadows (Gives the Dark Mood aesthetic) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />

        {/* Top Control: Subtle Dark Style / Adjust Button */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            onClick={() => setShowStyleMenu((prev) => !prev)}
            className="h-8 px-2.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/15 text-xs font-medium text-zinc-300 backdrop-blur-md flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
            title="Ajustar estilo da foto"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {filterStyle === 'dark' ? 'Estilo Dark' : filterStyle === 'cinematic' ? 'Cinemático' : 'Original'}
            </span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 rounded-xl bg-black/70 hover:bg-black/90 border border-white/15 text-zinc-300 hover:text-white backdrop-blur-md flex items-center justify-center transition cursor-pointer shadow-lg active:scale-95"
            title="Atualizar foto da barbearia"
          >
            <Camera className="w-3.5 h-3.5 text-zinc-300" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Style Selection Popover */}
        {showStyleMenu && (
          <div className="absolute top-12 right-3 z-30 p-1.5 rounded-2xl bg-zinc-900/95 border border-white/15 backdrop-blur-xl shadow-2xl flex items-center gap-1 text-xs">
            <span className="text-[11px] text-zinc-400 font-medium px-1.5">Tratamento:</span>
            {(['dark', 'cinematic', 'natural'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setFilterStyle(mode);
                  setShowStyleMenu(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition flex items-center gap-1 ${
                  filterStyle === mode
                    ? 'bg-[#D4AF37] text-black shadow-sm font-bold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {filterStyle === mode && <Check className="w-3 h-3 stroke-[3]" />}
                {mode === 'dark' ? 'Dark Luxury' : mode === 'cinematic' ? 'Cinemático' : 'Original'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content overlay */}
      <div className="relative -mt-16 sm:-mt-20 px-5 pb-5 text-left space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-white/10 backdrop-blur-md text-amber-400 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="font-bold text-white tabular-nums">4.98</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 font-medium">380+ avaliações</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-zinc-200 font-semibold bg-zinc-900/90 border border-white/10 px-2.5 py-1 rounded-lg backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Seg a Sáb · 09h às 20h</span>
            </div>

            {onOpenQRCode && (
              <button
                onClick={onOpenQRCode}
                className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-lg backdrop-blur-md transition cursor-pointer active:scale-95 shadow-sm"
                title="Acessar no celular via QR Code"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">No Celular</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white leading-tight">
            Barbearia LS
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-lg leading-relaxed">
            Atendimento exclusivo com Leonardo Soares. Agendamento ágil e pontual com corte de cabelo, barba alinhada na navalha e acabamento de alta precisão.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Rua Augusta, 1420 · Consolação, São Paulo - SP</span>
        </div>
      </div>
    </div>
  );
};
