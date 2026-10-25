import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Send, AlertCircle, Share2, Download, Archive } from 'lucide-react';

interface QRCodeModalProps {
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [selectedUrlType, setSelectedUrlType] = useState<'dev' | 'shared'>('dev');

  // Exact URLs from the current AI Studio session with dynamic fallback
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const devUrl = currentOrigin.includes('ais-dev')
    ? currentOrigin
    : 'https://ais-dev-fgtwuk4f3jqqaa6if2udvg-507562791921.us-east1.run.app';
  const sharedUrl = 'https://ais-pre-fgtwuk4f3jqqaa6if2udvg-507562791921.us-east1.run.app';

  const activeUrl = selectedUrlType === 'dev' ? devUrl : sharedUrl;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    activeUrl
  )}&bgcolor=FFFFFF&color=0E0E0E&margin=2`;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendToWhatsApp = () => {
    const text = encodeURIComponent(
      `💈 *Naville Barber* - Teste o app de agendamento online:\n${activeUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl p-5 sm:p-6 relative text-left max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#D4AF37] shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-white">
              Acessar no seu Celular
            </h3>
            <p className="text-xs text-zinc-400">
              Escaneie o QR Code ou copie o link ativo
            </p>
          </div>
        </div>

        {/* URL Type Switcher */}
        <div className="mt-4 p-1 bg-zinc-900 rounded-xl border border-white/5 grid grid-cols-2 gap-1 text-xs">
          <button
            onClick={() => setSelectedUrlType('dev')}
            className={`py-2 px-3 rounded-lg font-semibold transition ${
              selectedUrlType === 'dev'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Link Ativo (Dev Server)
          </button>
          <button
            onClick={() => setSelectedUrlType('shared')}
            className={`py-2 px-3 rounded-lg font-semibold transition ${
              selectedUrlType === 'shared'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Link Público (Shared)
          </button>
        </div>

        {/* QR Code Graphic */}
        <div className="mt-4 flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-[#D4AF37]/30">
            <img
              src={qrImageUrl}
              alt="QR Code para abrir no smartphone"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
            />
          </div>
          <span className="text-[11px] text-zinc-400 mt-2 text-center">
            Aponte a câmera do seu celular para escanear
          </span>
        </div>

        {/* Notice explaining Page Not Found cause */}
        {selectedUrlType === 'dev' ? (
          <div className="mt-3.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
            <strong>✓ Servidor Ativo Agora:</strong> Este é o link do servidor em execução. Ao abrir no celular com sua conta Google logada, ele carrega imediatamente!
          </div>
        ) : (
          <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#D4AF37]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Como ativar o Link Público:</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              O link <strong>ais-pre</strong> só fica ativo quando você clica no botão <strong>"Share" (Compartilhar)</strong> no topo superior direito da tela do Google AI Studio. Sem clicar nele, o servidor retorna <em>"Page not found"</em>.
            </p>
          </div>
        )}

        {/* Link Box */}
        <div className="mt-3.5 p-2.5 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-zinc-300 truncate select-all">
            {activeUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition shrink-0"
            title="Copiar link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <button
            onClick={handleCopy}
            className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Link Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Link do Servidor Ativo</span>
              </>
            )}
          </button>

          <button
            onClick={handleSendToWhatsApp}
            className="w-full h-11 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Link para Meu WhatsApp</span>
          </button>

          {/* Direct ZIP Download */}
          <div className="pt-2 border-t border-white/10">
            <a
              href="/barbearia-ls-projeto.zip"
              download="barbearia-ls-projeto.zip"
              className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Baixar Projeto Completo (.ZIP)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
