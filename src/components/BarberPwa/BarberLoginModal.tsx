import React, { useState } from 'react';
import {
  X,
  LockKey,
  EnvelopeSimple,
  ShieldCheck,
  User,
  UsersThree,
  ArrowRight,
  CheckCircle,
  WarningCircle,
  Storefront,
} from '@phosphor-icons/react';
import { AuthUser, AuthSession, UserRole, TenantConfig } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';
import {
  MOCK_USERS,
  loginWithEmail,
  quickLoginAs,
  requestWhatsAppOtp,
  verifyWhatsAppOtp,
} from '../../services/authService';

interface BarberLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
  tenants: TenantConfig[];
}

export const BarberLoginModal: React.FC<BarberLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  tenants,
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBlockedError, setIsBlockedError] = useState(false);

  if (!isOpen) return null;

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsBlockedError(false);
    const res = loginWithEmail(email, password, tenants);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
      onClose();
    } else {
      setErrorMessage(res.error || 'Credenciais inválidas');
      setIsBlockedError(Boolean(res.blockedByTenant));
    }
  };

  const handleSendOtp = () => {
    setErrorMessage('');
    const { code } = requestWhatsAppOtp(phone);
    setIsOtpSent(true);
    setOtpCode(code);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = verifyWhatsAppOtp(phone, otpCode, tenants);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
      onClose();
    } else {
      setErrorMessage(res.error || 'Código incorreto');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-[#141416] border border-white/10 shadow-2xl overflow-hidden text-left">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] flex items-center justify-center text-black font-extrabold shadow-md">
              <LockKey className="w-5 h-5" weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">Autenticação Segura</h2>
              <p className="text-[11px] text-zinc-400">Acesso Restrito ao Profissional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/5 text-xs font-semibold p-1.5 bg-black/40">
          <button
            onClick={() => {
              setActiveTab('email');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'email'
                ? 'bg-[#D4AF37] text-black font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <EnvelopeSimple className="w-4 h-4" weight="bold" />
            <span>E-mail & Senha</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('whatsapp');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'bg-[#D4AF37] text-black font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <WhatsAppIcon variant={activeTab === 'whatsapp' ? 'official' : 'monochrome'} size={16} />
            <span>OTP WhatsApp</span>
          </button>
        </div>

        {/* Mensagem de Erro / Kill Switch Banner */}
        {errorMessage && (
          <div
            className={`m-4 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              isBlockedError
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <WarningCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" weight="fill" />
            <div className="space-y-0.5">
              <span className="font-bold block">
                {isBlockedError ? 'Bloqueio de Inadimplência Ativo' : 'Erro de Acesso'}
              </span>
              <p className="text-[11px] leading-relaxed opacity-90">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="p-5">

          {/* TAB 2: LOGIN TRADICIONAL COM E-MAIL E SENHA */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: diego@barbearials.com"
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" weight="bold" />
              </button>
            </form>
          )}

          {/* TAB 3: LOGIN SEM SENHA VIA WHATSAPP (OTP) */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Número de WhatsApp do Barbeiro
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="11981234567"
                    className="flex-1 h-11 px-3.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <WhatsAppIcon variant="official" size={16} />
                    <span>Enviar OTP</span>
                  </button>
                </div>
              </div>

              {isOtpSent && (
                <form onSubmit={handleVerifyOtp} className="space-y-3 animate-in fade-in">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" weight="fill" />
                    <span>Código OTP enviado para seu WhatsApp. (Código de teste: 123456)</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                      Código de 6 dígitos
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full h-11 text-center font-mono tracking-widest text-lg font-bold rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-[#D4AF37] hover:bg-[#c29e2f] text-black text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <span>Validar e Acessar Cadeira</span>
                    <ArrowRight className="w-4 h-4" weight="bold" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
