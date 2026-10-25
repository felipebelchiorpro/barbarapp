import React, { useState } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  tenantName?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ tenantName = 'Naville Barber' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#D4AF37] text-black hover:bg-[#E5C158] transition active:scale-95 shadow-md shadow-[#D4AF37]/20 whitespace-nowrap min-h-[36px]"
        title="Instalar aplicativo no celular ou computador"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 text-[#D4AF37] hover:bg-amber-500/10 transition whitespace-nowrap min-h-[36px]"
          title="Instalar no iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-[#18181B] border border-white/10 p-6 shadow-2xl relative text-left">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37] mb-4">
                <Smartphone className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-white font-display">Instalar no iPhone</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Adicione o app <strong>{tenantName}</strong> à tela de início do seu iPhone para agendamento instantâneo em tela cheia:
              </p>

              <div className="mt-4 space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37] text-black font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Toque no botão <strong className="text-white flex items-center gap-1 inline-flex"><Share className="w-3 h-3 inline text-[#D4AF37]" /> Compartilhar</strong> na barra inferior do Safari.</span>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37] text-black font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Role para baixo e selecione <strong className="text-white">"Adicionar à Tela de Início"</strong>.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
