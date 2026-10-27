import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DeviceMobile as Smartphone,
  ArrowsClockwise as RefreshCw,
  CheckCircle as CheckCircle2,
  XCircle,
  QrCode,
  SignOut as LogOut,
  Gear as Settings,
  WarningCircle as AlertCircle,
  ArrowSquareOut as ExternalLink,
  CaretDown as ChevronDown,
  CaretUp as ChevronUp,
} from '@phosphor-icons/react';
import { EvolutionApiConfig, WhatsAppConnectionStatus } from '../../types';
import {
  getEvolutionConnectionState,
  getEvolutionConnectQRCode,
  logoutEvolutionInstance,
} from '../../services/evolutionApi';
import {
  getWahaSessionStatus,
  getWahaQRCode,
  logoutWahaSession,
} from '../../services/wahaApi';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface WhatsAppConnectionCardProps {
  config: EvolutionApiConfig;
  onUpdateConfig?: (newConfig: EvolutionApiConfig) => void;
  onStatusChange?: (status: WhatsAppConnectionStatus) => void;
}

export const WhatsAppConnectionCard: React.FC<WhatsAppConnectionCardProps> = ({
  config,
  onUpdateConfig,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<WhatsAppConnectionStatus>('close');
  const [engine, setEngine] = useState<'waha' | 'evolution'>('waha');
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isLoadingQR, setIsLoadingQR] = useState<boolean>(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  // Formulário local de configuração rápida
  const [editConfig, setEditConfig] = useState<EvolutionApiConfig>(config);
  const [configSuccess, setConfigSuccess] = useState<boolean>(false);

  // Mantém editConfig sincronizado com alterações externas
  useEffect(() => {
    setEditConfig(config);
  }, [config]);

  // Referência para controlar o polling leve a cada 3 segundos
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Checa o status da conexão via WAHA ou Evolution API
   */
  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const res = engine === 'waha'
        ? await getWahaSessionStatus(config)
        : await getEvolutionConnectionState(config);

      setStatus(res.status);
      if (res.phone) setConnectedPhone(res.phone);
      setLastChecked(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      onStatusChange?.(res.status);

      // Se conectou com sucesso, encerra o QR code e polling
      if (res.status === 'open') {
        setQrBase64(null);
      }
      return res.status;
    } catch (err: unknown) {
      console.error(err);
      setStatus('close');
      return 'close';
    } finally {
      setIsChecking(false);
    }
  }, [config, onStatusChange, engine]);

  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(45);

  /**
   * Temporizador de expiração do QR Code (expira a cada 45 segundos)
   */
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (qrBase64) {
      setQrSecondsLeft(45);
      interval = setInterval(() => {
        setQrSecondsLeft((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrBase64]);

  /**
   * Busca e exibe o QR Code via WAHA ou Evolution API
   */
  const handleGenerateQRCode = async (forceNew = true) => {
    setIsLoadingQR(true);
    setErrorMessage(null);
    try {
      setStatus('connecting');
      const result = engine === 'waha'
        ? await getWahaQRCode(config, forceNew)
        : await getEvolutionConnectQRCode(config, forceNew);

      if (result.base64) {
        setQrBase64(result.base64);
        setQrSecondsLeft(45);
      } else {
        const currentState = await checkStatus();
        if (currentState !== 'open') {
          setErrorMessage(`Não foi possível obter o QR Code via ${engine === 'waha' ? 'WAHA' : 'Evolution API'}. Verifique o serviço.`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao solicitar QR Code.';
      setErrorMessage(msg);
      setStatus('close');
    } finally {
      setIsLoadingQR(false);
    }
  };

  /**
   * Desconecta a sessão via WAHA ou Evolution API
   */
  const handleLogout = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp da barbearia?')) {
      return;
    }
    setIsChecking(true);
    try {
      if (engine === 'waha') {
        await logoutWahaSession(config);
      } else {
        await logoutEvolutionInstance(config);
      }
      setStatus('close');
      setConnectedPhone(null);
      setQrBase64(null);
      onStatusChange?.('close');
      await checkStatus();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Polling a cada 3 segundos enquanto o QR Code estiver visível ou status for "connecting"
   */
  useEffect(() => {
    const shouldPoll = Boolean(qrBase64 || status === 'connecting');

    if (shouldPoll) {
      pollingRef.current = setInterval(async () => {
        const res = engine === 'waha'
          ? await getWahaSessionStatus(config)
          : await getEvolutionConnectionState(config);

        if (res.status === 'open') {
          setStatus('open');
          if (res.phone) setConnectedPhone(res.phone);
          setQrBase64(null);
          onStatusChange?.('open');
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (res.status !== status) {
          setStatus(res.status);
          if (res.phone) setConnectedPhone(res.phone);
          onStatusChange?.(res.status);
        }
      }, 3000); // Polling a cada 3 segundos
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [qrBase64, status, config, onStatusChange, engine]);

  // Checagem inicial na montagem do componente
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Salvar credenciais rápidas
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateConfig) {
      onUpdateConfig(editConfig);
      setConfigSuccess(true);
      setTimeout(() => {
        setConfigSuccess(false);
        setShowConfig(false);
      }, 1500);
      checkStatus();
    }
  };

  return (
    <div className="w-full bg-[#18181B] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-lg transition-all text-left">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center shrink-0 shadow-sm shadow-[#25D366]/15">
            <WhatsAppIcon variant="official" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-display text-white">
                WhatsApp da Barbearia
              </h3>
              {/* Badge visual de status */}
              {status === 'open' && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Conectado
                </span>
              )}
              {status === 'connecting' && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Conectando...
                </span>
              )}
              {status === 'close' && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  Desconectado
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Instância: <strong className="text-zinc-200">{config.instanceName || 'barbearia'}</strong>
              {lastChecked && <span className="ml-2 text-zinc-500">· Atualizado às {lastChecked}</span>}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => checkStatus()}
            disabled={isChecking}
            title="Verificar status da conexão"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-xs text-zinc-300 font-medium flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Verificar</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Configurações da Evolution API"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-xs text-zinc-300 font-medium flex items-center gap-1.5 transition active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Config</span>
            {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Engine Switcher Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => {
              setEngine('waha');
              setQrBase64(null);
            }}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide transition flex items-center gap-1.5 cursor-pointer ${
              engine === 'waha'
                ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
            <span>WAHA (Opção 1 · Recomendado)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEngine('evolution');
              setQrBase64(null);
            }}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer ${
              engine === 'evolution'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Evolution API</span>
          </button>
        </div>

        <span className="text-[10px] text-zinc-500 hidden sm:inline">
          {engine === 'waha' ? '⚡ Sessões isoladas, sem travamentos de Redis e reconexão estável' : 'Sessões gerenciadas via Evolution v2'}
        </span>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowConfig(true)}
            className="text-[11px] underline text-red-200 hover:text-white shrink-0 font-medium cursor-pointer"
          >
            Abrir Config
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mt-4">
        {status === 'open' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <span>Instância online e sincronizada</span>
                  {connectedPhone && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                      {connectedPhone}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Notificações automáticas, confirmações e lembretes aos clientes estão 100% ativos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleGenerateQRCode(true)}
                disabled={isLoadingQR}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                title="Conectar outro número de WhatsApp"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Trocar Número</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={isChecking}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Se o QR Code estiver visível */}
            {qrBase64 ? (
              <div className="p-4 rounded-xl bg-zinc-900/90 border border-amber-500/40 flex flex-col items-center text-center space-y-3 animate-in zoom-in-95 duration-200 shadow-xl">
                <div className="flex items-center gap-2 text-[#D4A373] text-xs font-bold uppercase tracking-wider">
                  <QrCode className="w-4 h-4" />
                  <span>Escaneie com seu WhatsApp</span>
                </div>

                {/* Box do QR Code com fundo branco puro para leitura perfeita */}
                <div className="relative p-3 bg-white rounded-2xl shadow-xl border-4 border-[#D4A373]/50">
                  <img
                    src={qrBase64}
                    alt="QR Code WhatsApp"
                    className={`w-52 h-52 sm:w-60 sm:h-60 object-contain select-none transition-opacity ${
                      qrSecondsLeft === 0 ? 'opacity-30 blur-xs' : 'opacity-100'
                    }`}
                  />
                  {qrSecondsLeft === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/75 rounded-xl text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <span className="text-xs font-bold text-white">QR Code Expirou</span>
                      <button
                        onClick={() => handleGenerateQRCode(true)}
                        disabled={isLoadingQR}
                        className="py-2 px-3 rounded-xl bg-[#D4A373] text-[#0F0F12] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQR ? 'animate-spin' : ''}`} />
                        <span>Gerar Novo Código</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-300/90">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>
                    {qrSecondsLeft > 0
                      ? `Aguardando leitura do WhatsApp... (${qrSecondsLeft}s restantes)`
                      : 'QR Code precisa ser atualizado.'}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 max-w-sm space-y-0.5">
                  <p>1. No celular, abra o WhatsApp &gt; <strong>Aparelhos conectados</strong></p>
                  <p>2. Toque em <strong>Conectar um aparelho</strong> e aponte para o código acima</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerateQRCode(true)}
                    disabled={isLoadingQR}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4A373] to-[#B88656] text-[#0F0F12] text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQR ? 'animate-spin' : ''}`} />
                    <span>Gerar Novo QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStatus('open');
                      setConnectedPhone('+55 (11) 98765-4321');
                      setQrBase64(null);
                      onStatusChange?.('open');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title="Simular leitura com sucesso para testes no navegador"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simular Conexão (Teste)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQrBase64(null);
                      setStatus('close');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* Chamada para conectar com Botão Dourado */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
                <div className="flex items-center gap-2.5">
                  <XCircle className="w-5 h-5 text-zinc-500 shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-300">
                      WhatsApp desconectado
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Conecte sua conta para envio automático de comprovantes e lembretes aos clientes.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleGenerateQRCode(true)}
                  disabled={isLoadingQR}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A373] via-[#C59B63] to-[#B88656] hover:brightness-110 text-[#0F0F12] text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingQR ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando QR Code...</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppIcon variant="official" size={18} />
                      <span>Conectar WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gaveta de configuração rápida da API */}
        {showConfig && (
          <form
            onSubmit={handleSaveConfig}
            className="mt-3 p-4 rounded-xl bg-zinc-900/80 border border-white/10 space-y-3 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#D4AF37]">
              <span>Configurações da Evolution API v2</span>
              {configSuccess && <span className="text-emerald-400 font-bold">Salvo com sucesso!</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">URL Base (Host)</label>
                <input
                  type="text"
                  value={editConfig.baseUrl}
                  onChange={(e) => setEditConfig({ ...editConfig, baseUrl: e.target.value })}
                  placeholder="https://sua-evolution-api.com"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">API Key (Global/Instância)</label>
                <input
                  type="password"
                  value={editConfig.apiKey}
                  onChange={(e) => setEditConfig({ ...editConfig, apiKey: e.target.value })}
                  placeholder="Sua chave secreta"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Nome da Instância</label>
                <input
                  type="text"
                  value={editConfig.instanceName}
                  onChange={(e) => setEditConfig({ ...editConfig, instanceName: e.target.value })}
                  placeholder="barbearia"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder-zinc-500 text-xs focus:border-[#D4AF37] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#D4AF37] text-black hover:bg-[#e0bc46] transition"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
