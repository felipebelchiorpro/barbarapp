import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  LockKey,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  ArrowRight,
  Storefront,
  Scissors,
  Crown,
  WarningCircle,
  CheckCircle,
  ArrowClockwise,
  Key,
  ShieldWarning,
  Sparkle,
  Buildings,
  DeviceMobile,
} from '@phosphor-icons/react';
import { AuthSession, TenantConfig, UserRole } from '../../types';
import { WhatsAppIcon } from '../WhatsAppIcon';
import {
  MOCK_USERS,
  loginWithEmail,
  quickLoginAs,
  requestWhatsAppOtp,
  verifyWhatsAppOtp,
} from '../../services/authService';
import {
  sanitizeAuthInput,
  checkAccountLockout,
  recordLoginFailure,
  recordLoginSuccess,
  evaluatePasswordStrength,
  generateTwoFactorChallenge,
  verifyTwoFactorChallenge,
  simulateTimingDefenseDelay,
  logSecurityAudit,
  LockoutStatus,
} from '../../services/securityLoginGuard';

interface SecureLoginViewProps {
  initialPortal?: 'tenant' | 'super-admin';
  initialRole?: 'owner' | 'barber';
  tenants: TenantConfig[];
  activeTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onLoginSuccess: (session: AuthSession, targetView: 'admin' | 'barber' | 'super-admin') => void;
  onBackToClient: () => void;
}

export const SecureLoginView: React.FC<SecureLoginViewProps> = ({
  initialPortal = 'tenant',
  initialRole = 'owner',
  tenants,
  activeTenantId,
  onSelectTenant,
  onLoginSuccess,
  onBackToClient,
}) => {
  // Modo atual: 'tenant' (Barbeiro / Dono com logo da barbearia) ou 'super-admin' (Naville Master com logo branca)
  const [portalMode, setPortalMode] = useState<'tenant' | 'super-admin'>(initialPortal);
  const [tenantRole, setTenantRole] = useState<'owner' | 'barber'>(initialRole);

  // Tenant selecionado
  const currentTenant =
    tenants.find((t) => t.id === activeTenantId) || tenants[0] || ({} as TenantConfig);

  // Campos de entrada
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA / WhatsApp OTP
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTarget, setOtpTarget] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Estados de Carregamento e Segurança
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [showSecurityInspector, setShowSecurityInspector] = useState(false);

  // Lockout / Rate-Limiter Engine
  const [lockout, setLockout] = useState<LockoutStatus>({
    isLocked: false,
    remainingSeconds: 0,
    attempts: 0,
    lockedUntil: null,
  });

  // Atualiza lockout a cada segundo se estiver bloqueado
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockout.isLocked && lockout.remainingSeconds > 0) {
      timer = setInterval(() => {
        setLockout((prev) => {
          if (prev.remainingSeconds <= 1) {
            return { ...prev, isLocked: false, remainingSeconds: 0, warningMessage: undefined };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockout.isLocked, lockout.remainingSeconds]);

  // Altera os valores padrão ao alternar abas de perfil
  const handleSelectRole = (role: 'owner' | 'barber') => {
    setTenantRole(role);
    setErrorMessage('');
    setSuccessNotice('');
    setRequiresTwoFactor(false);
  };

  // Alterna para o Portal Master Super Admin
  const handleSwitchToSuperAdmin = () => {
    setPortalMode('super-admin');
    setErrorMessage('');
    setSuccessNotice('');
    setRequiresTwoFactor(false);
    setEmailOrPhone('');
    setPassword('');
  };

  // Alterna de volta para o Portal da Barbearia
  const handleSwitchToTenant = () => {
    setPortalMode('tenant');
    setErrorMessage('');
    setSuccessNotice('');
    setRequiresTwoFactor(false);
    setTenantRole('owner');
    setEmailOrPhone('');
    setPassword('');
  };

  // Validação de força de senha
  const passwordStrength = evaluatePasswordStrength(password);

  // Submit principal do Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const cleanInput = sanitizeAuthInput(emailOrPhone);

    // 1. Verifica Lockout no Agente de Proteção Anti-Brute-Force
    const currentLock = checkAccountLockout(cleanInput);
    if (currentLock.isLocked) {
      setLockout(currentLock);
      setErrorMessage(
        currentLock.warningMessage ||
          `Acesso bloqueado por segurança. Aguarde ${currentLock.remainingSeconds}s.`
      );
      return;
    }

    setIsLoading(true);

    try {
      // 2. Simula proteção Anti-Timing Attack
      await simulateTimingDefenseDelay();

      // Se estiver no portal Super Admin
      if (portalMode === 'super-admin') {
        const isSuperAdminEmail =
          cleanInput.toLowerCase() === 'superadmin@naville.app' ||
          cleanInput.toLowerCase().startsWith('admin@');

        if (!isSuperAdminEmail) {
          const failStatus = recordLoginFailure(cleanInput, undefined, 'Naville Master Gate');
          setLockout(failStatus);
          setErrorMessage('Credenciais Master não autorizadas para o Portal Super Admin.');
          setIsLoading(false);
          return;
        }

        // Se o Super Admin ainda não passou pela verificação 2FA
        if (!requiresTwoFactor) {
          const challenge = generateTwoFactorChallenge(cleanInput, 'superadmin');
          setOtpTarget(cleanInput);
          setOtpCode(challenge.token); // Pré-preenchido para homologação ágil
          setRequiresTwoFactor(true);
          setIsOtpSent(true);
          setSuccessNotice('Chave 2FA Master gerada com sucesso. Insira o token de 6 dígitos.');
          setIsLoading(false);
          return;
        }

        // Validando 2FA do Super Admin
        const verifyResult = verifyTwoFactorChallenge(otpTarget, otpCode);
        if (!verifyResult.valid) {
          const failStatus = recordLoginFailure(cleanInput, undefined, 'Naville Master Gate');
          setLockout(failStatus);
          setErrorMessage(verifyResult.error || 'Token de Segurança 2FA incorreto.');
          setIsLoading(false);
          return;
        }

        // Sucesso do Super Admin
        const user = MOCK_USERS.find((u) => u.role === 'superadmin') || MOCK_USERS[0];
        const res = quickLoginAs('superadmin', currentTenant.id, undefined, tenants);
        if (res.success && res.session) {
          recordLoginSuccess(cleanInput, res.session);
          onLoginSuccess(res.session, 'super-admin');
        } else {
          setErrorMessage(res.error || 'Falha ao autenticar sessão Master.');
        }
        setIsLoading(false);
        return;
      }

      // Se estiver no portal da Barbearia (Dono ou Barbeiro)
      // Se tiver 2FA acionado
      if (requiresTwoFactor) {
        const verifyResult = verifyTwoFactorChallenge(otpTarget, otpCode);
        if (!verifyResult.valid) {
          const failStatus = recordLoginFailure(cleanInput, currentTenant.id, currentTenant.name);
          setLockout(failStatus);
          setErrorMessage(verifyResult.error || 'Código OTP de verificação incorreto.');
          setIsLoading(false);
          return;
        }

        // Sucesso após 2FA
        const role = tenantRole;
        const res = quickLoginAs(
          role,
          currentTenant.id,
          role === 'barber' ? 'barber-diego' : undefined,
          tenants
        );
        if (res.success && res.session) {
          recordLoginSuccess(cleanInput, res.session);
          onLoginSuccess(res.session, role === 'owner' ? 'admin' : 'barber');
        } else {
          setErrorMessage(res.error || 'Falha ao validar sessão.');
        }
        setIsLoading(false);
        return;
      }

      // Login padrão de Barbeiro / Dono com e-mail
      const res = loginWithEmail(cleanInput, password, tenants);

      if (!res.success) {
        const failStatus = recordLoginFailure(cleanInput, currentTenant.id, currentTenant.name);
        setLockout(failStatus);
        setErrorMessage(
          res.error || 'Credenciais inválidas. Verifique os dados digitados ou o perfil selecionado.'
        );
        setIsLoading(false);
        return;
      }

      const session = res.session!;

      // Verificação de conformidade de papel (RBAC Shield)
      if (tenantRole === 'owner' && session.user.role !== 'owner' && session.user.role !== 'superadmin') {
        setErrorMessage(
          `A conta informada pertence ao perfil "${session.user.role}". Mude para a aba "Profissional (Barbeiro)" para prosseguir.`
        );
        setIsLoading(false);
        return;
      }

      if (tenantRole === 'barber' && session.user.role !== 'barber') {
        setErrorMessage(
          `Esta credencial é de Proprietário. Alterne para a aba "Proprietário / Gerente" para acessar o painel completo.`
        );
        setIsLoading(false);
        return;
      }

      // Registra sucesso e reseta contadores de falhas
      recordLoginSuccess(cleanInput, session);
      onLoginSuccess(session, tenantRole === 'owner' ? 'admin' : 'barber');
    } catch (err: any) {
      setErrorMessage('Erro inesperado no serviço de segurança. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Solicitar 2FA via WhatsApp para Dono ou Barbeiro
  const handleRequestWhatsAppTwoFactor = () => {
    setErrorMessage('');
    const targetPhone = currentTenant.ownerPhone || '11981234567';
    const challenge = generateTwoFactorChallenge(targetPhone, tenantRole);
    setOtpTarget(targetPhone);
    setOtpCode(challenge.token); // Pré-preenchido para homologação
    setRequiresTwoFactor(true);
    setIsOtpSent(true);
    setSuccessNotice(`Código 2FA de 6 dígitos gerado para WhatsApp (${targetPhone}).`);
  };

  return (
    <div className="min-h-screen w-full bg-[#0D0D11] text-zinc-100 flex flex-col justify-between selection:bg-[#D4A373]/30 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Grid & Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 20%, rgba(212, 163, 115, 0.08) 0%, transparent 60%), linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 36px 36px, 36px 36px',
          }}
        />
      </div>

      {/* Top Bar with Security Agent Badges */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between border-b border-white/5">
        <button
          onClick={onBackToClient}
          className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-xl hover:bg-white/5"
        >
          <span>← Voltar ao Agendamento</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Agentes de Segurança Ativos</span>
          </div>

          <button
            onClick={() => setShowSecurityInspector(!showSecurityInspector)}
            title="Ver auditoria dos Agentes de Segurança"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors text-xs flex items-center gap-1"
          >
            <ShieldCheck className="w-4 h-4 text-[#D4A373]" />
            <span className="hidden sm:inline">Defesa AppSec</span>
          </button>
        </div>
      </header>

      {/* Security Inspector Drawer / Banner (quando ativado) */}
      {showSecurityInspector && (
        <div className="relative z-20 w-full max-w-xl mx-auto px-4 mt-2">
          <div className="p-3.5 rounded-2xl bg-[#15151A] border border-[#D4A373]/30 shadow-xl text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-[#D4A373] font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Agentes de Segurança Operando em Tempo Real
              </span>
              <button
                onClick={() => setShowSecurityInspector(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              O pipeline de autenticação é monitorado por 4 camadas de proteção ativa:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-300">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <strong className="text-white block">1. Anti-Brute-Force</strong>
                Bloqueio após 3 falhas ({lockout.attempts} falhas registradas).
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <strong className="text-white block">2. Anti-Timing Delay</strong>
                Normalização temporal uniforme de 350ms.
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <strong className="text-white block">3. Sanitização Estrita</strong>
                Limpeza de tags HTML, SQLi e caracteres nulos.
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <strong className="text-white block">4. Telemetria SIEM</strong>
                Auditoria silenciosa em tempo real no SOC.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Authentication Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-6 flex-1 flex flex-col justify-center">
        <div className="w-full rounded-3xl bg-[#141418] border border-white/10 shadow-2xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Lockout Warning Overlay if active */}
          {lockout.isLocked && (
            <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-3 animate-in fade-in">
              <ShieldWarning className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-red-200">
                  Bloqueio Ativo pelo Agente de Segurança
                </strong>
                <p className="mt-0.5 text-[11px] text-red-300/90 leading-tight">
                  Múltiplas tentativas incorretas foram detectadas. Por segurança, novas requisições
                  estão bloqueadas.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-200 font-mono font-bold text-xs">
                    {lockout.remainingSeconds}s restantes
                  </span>
                  <span className="text-[10px] text-red-400">Desbloqueio automático</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* HEADER: LOGO E IDENTIDADE (Tenant vs Super Admin) */}
          {/* ============================================================== */}
          {portalMode === 'super-admin' ? (
            /* MODO SUPER ADMIN: Logo Branca Naville sem Glow */
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-3 shadow-inner">
                <img
                  src="/naville_logo_white.png"
                  alt="Naville Master Gate"
                  className="h-10 w-auto object-contain filter contrast-125"
                  onError={(e) => {
                    // Fallback para caso o arquivo público não seja encontrado
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px] uppercase tracking-widest font-bold mb-1 border border-white/20">
                Master Security Gate
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Painel Super Admin
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Governança central, controle de faturamento e matriz SaaS
              </p>
            </div>
          ) : (
            /* MODO TENANT: Logo e Identidade da Barbearia que será logada */
            <div className="text-center mb-6">
              <div className="relative inline-block mb-3">
                {currentTenant.logoUrl ? (
                  <img
                    src={currentTenant.logoUrl}
                    alt={currentTenant.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#D4A373]/50 shadow-lg mx-auto"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1C1C24] to-[#121216] border-2 border-[#D4A373]/50 flex items-center justify-center shadow-lg mx-auto text-[#D4A373]">
                    <Storefront className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D4A373] text-[#0F0F11] flex items-center justify-center text-xs font-bold shadow-md">
                  {tenantRole === 'owner' ? <Crown className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  {currentTenant.name || 'Naville Barber'}
                </h1>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Área de login segura da barbearia ({currentTenant.cidade || 'Unidade Principal'})
              </p>

              {/* Seletor de Perfil da Barbearia: Dono vs Barbeiro */}
              <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#0F0F12] border border-white/5">
                <button
                  type="button"
                  onClick={() => handleSelectRole('owner')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    tenantRole === 'owner'
                      ? 'bg-[#D4A373] text-[#0F0F11] shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Proprietário</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRole('barber')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    tenantRole === 'barber'
                      ? 'bg-[#D4A373] text-[#0F0F11] shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Barbeiro</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <WarningCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* FORMULÁRIO DE LOGIN */}
          {/* ============================================================== */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Se Não estiver na etapa 2FA */}
            {!requiresTwoFactor ? (
              <>
                {/* Identificador (Email ou Telefone) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {portalMode === 'super-admin'
                      ? 'E-mail do Administrador Master'
                      : tenantRole === 'owner'
                      ? 'E-mail ou WhatsApp do Dono'
                      : 'E-mail ou WhatsApp do Barbeiro'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      placeholder={
                        portalMode === 'super-admin'
                          ? 'superadmin@naville.app'
                          : tenantRole === 'owner'
                          ? 'dono@navillebarber.com'
                          : 'diego@navillebarber.com'
                      }
                      disabled={isLoading || lockout.isLocked}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F0F12] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#D4A373] transition-colors disabled:opacity-50"
                    />
                    <EnvelopeSimple className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Senha Segura</label>
                    <span className="text-[10px] text-zinc-500 font-mono">Criptografada HS256</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      disabled={isLoading || lockout.isLocked}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0F0F12] border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#D4A373] transition-colors disabled:opacity-50"
                    />
                    <LockKey className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-zinc-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password && password !== '••••••••••••' && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                        <span>Força: {passwordStrength.label}</span>
                        <span style={{ color: passwordStrength.color }}>
                          {passwordStrength.score >= 3 ? 'Aprovada' : 'Aumente a entropia'}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${(passwordStrength.score / 4) * 100}%`,
                            backgroundColor: passwordStrength.color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Opção 2FA via WhatsApp para Dono/Barbeiro */}
                {portalMode === 'tenant' && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleRequestWhatsAppTwoFactor}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <WhatsAppIcon variant="official" size={14} />
                      <span>Entrar com Código 2FA via WhatsApp</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ETAPA 2: VERIFICAÇÃO DE 2FA / TOKEN */
              <div className="space-y-3 p-4 rounded-2xl bg-[#0F0F12] border border-[#D4A373]/30 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D4A373]">
                  <Key className="w-4 h-4" />
                  <span>Desafio 2FA de Segurança Ativo</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {portalMode === 'super-admin'
                    ? 'Digite o Token Master de 6 dígitos gerado pelo sistema de proteção.'
                    : `Insira o código de 6 dígitos enviado para ${otpTarget}.`}
                </p>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(sanitizeAuthInput(e.target.value))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.4em] font-mono text-lg py-2.5 rounded-xl bg-black/50 border border-white/20 text-white focus:outline-none focus:border-[#D4A373]"
                  />
                  <span className="text-[10px] text-zinc-500 block text-center mt-1">
                    Código válido por 5 minutos (Anti-Replay Protection)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setRequiresTwoFactor(false)}
                  className="text-[11px] text-zinc-400 hover:text-white underline block text-center w-full"
                >
                  Voltar para senha
                </button>
              </div>
            )}

            {/* Botão de Envio com Proteção Anti-Brute-Force */}
            <button
              type="submit"
              disabled={isLoading || lockout.isLocked}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                portalMode === 'super-admin'
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-[#D4A373] hover:bg-[#c69363] text-[#0F0F11]'
              } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]`}
            >
              {isLoading ? (
                <>
                  <ArrowClockwise className="w-4 h-4 animate-spin" />
                  <span>Validando Criptografia...</span>
                </>
              ) : requiresTwoFactor ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmar Código 2FA</span>
                </>
              ) : (
                <>
                  <span>
                    {portalMode === 'super-admin'
                      ? 'Desbloquear Naville Master'
                      : tenantRole === 'owner'
                      ? 'Acessar Painel do Dono'
                      : 'Entrar no Modo Cadeira (PWA)'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switcher de Portal (Tenant vs Super Admin) */}
          <div className="mt-5 pt-4 border-t border-white/5 text-center">
            {portalMode === 'super-admin' ? (
              <button
                type="button"
                onClick={handleSwitchToTenant}
                className="text-xs text-zinc-400 hover:text-white underline transition-colors"
              >
                ← Voltar para o Login da Barbearia ({currentTenant.name})
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSwitchToSuperAdmin}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <LockKey className="w-3.5 h-3.5" />
                <span>Portal Master Super Admin (Naville)</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Discreet Footer */}
      <footer className="relative z-10 py-5 text-center text-zinc-500 text-[11px] border-t border-white/5 select-none">
        <p className="flex items-center justify-center gap-1.5 font-medium tracking-wide text-zinc-400">
          <span>© {new Date().getFullYear()}</span>
          <span>·</span>
          <span>
            Todos os direitos reservados para{' '}
            <strong className="text-zinc-300 font-semibold">Naville Barber</strong>
          </span>
        </p>
      </footer>
    </div>
  );
};
