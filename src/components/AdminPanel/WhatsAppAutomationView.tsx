import React, { useState, useEffect, useRef } from 'react';
import {
  ChatCenteredDots,
  PaperPlaneRight,
  Clock,
  Sparkle,
  CheckCircle,
  WarningCircle,
  XCircle,
  Smiley,
  ShieldCheck,
  ArrowsClockwise,
  Eye,
  SlidersHorizontal,
  Check,
  Copy,
  Info,
  Calendar,
  User,
  Scissors,
  Crown,
  DeviceMobile,
} from '@phosphor-icons/react';
import {
  WhatsAppMessageTemplate,
  WhatsAppDispatchAuditLog,
  WhatsAppTemplateEventType,
} from '../../types';
import {
  getWhatsAppTemplates,
  saveWhatsAppTemplate,
  sendWhatsAppTestMessage,
  getWhatsAppDispatchHistory,
} from '../../services/whatsappAutomationService';
import { WhatsAppIcon } from '../WhatsAppIcon';

interface WhatsAppAutomationViewProps {
  barbeariaId?: string;
  onNavigateToConnection?: () => void;
  isWhatsAppConnected?: boolean;
}

const VARIABLE_CHIPS = [
  { tag: '{nome_cliente}', label: 'Nome do Cliente', icon: User, example: 'Gabriel Silva' },
  { tag: '{barbeiro}', label: 'Barbeiro', icon: Scissors, example: 'Carlos Silva' },
  { tag: '{horario}', label: 'Horário', icon: Clock, example: '15:30' },
  { tag: '{data}', label: 'Data', icon: Calendar, example: '25/10/2026' },
  { tag: '{servico}', label: 'Serviço', icon: Sparkle, example: 'Corte Degradê + Barba' },
  { tag: '{beneficio_clube}', label: 'Benefício Clube', icon: Crown, example: '⭐ Membro do Clube VIP: Corte incluso no seu plano!' },
];

const QUICK_EMOJIS = ['💈', '✂️', '📅', '⏰', '⭐', '🔥', '👋', '📍', '👑', '💬', '✨', '👌'];

const EVENT_TABS: { id: WhatsAppTemplateEventType; label: string; badge: string; desc: string }[] = [
  {
    id: 'confirmacao_agendamento',
    label: 'Confirmação de Agendamento',
    badge: 'Imediato (Anti-Ban)',
    desc: 'Disparada logo após o cliente reservar um horário na página da barbearia.',
  },
  {
    id: 'lembrete_2h',
    label: 'Lembrete (2h Antes)',
    badge: 'Anti-Falta',
    desc: 'Reduz o "No-Show" lembrando o cliente poucas horas antes do atendimento.',
  },
  {
    id: 'reativacao_cliente',
    label: 'Reativação de Cliente',
    badge: 'CRM Automático',
    desc: 'Mensagem de carinho enviada para clientes que não cortam há mais de 25 dias.',
  },
];

export const WhatsAppAutomationView: React.FC<WhatsAppAutomationViewProps> = ({
  barbeariaId = 'kd2eakh5cijm61x',
  onNavigateToConnection,
  isWhatsAppConnected = false,
}) => {
  const [selectedEventType, setSelectedEventType] = useState<WhatsAppTemplateEventType>('confirmacao_agendamento');
  const [templates, setTemplates] = useState<WhatsAppMessageTemplate[]>([]);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentDelay, setCurrentDelay] = useState<number>(35);
  const [currentSimularDigitando, setCurrentSimularDigitando] = useState<boolean>(true);
  const [currentAtivo, setCurrentAtivo] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Envio de teste
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testPhone, setTestPhone] = useState<string>('');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Histórico de auditoria
  const [auditHistory, setAuditHistory] = useState<WhatsAppDispatchAuditLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Ref da textarea para inserção no cursor
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Carrega templates ao montar
  useEffect(() => {
    loadTemplates();
    loadHistory();
  }, [barbeariaId]);

  // Atualiza os campos do editor quando troca de aba
  useEffect(() => {
    const tpl = templates.find((t) => t.tipo_evento === selectedEventType);
    if (tpl) {
      setCurrentContent(tpl.conteudo);
      setCurrentDelay(tpl.delay_segundos || 35);
      setCurrentSimularDigitando(tpl.simular_digitando !== false);
      setCurrentAtivo(tpl.ativo !== false);
    } else {
      // Fallback
      if (selectedEventType === 'confirmacao_agendamento') {
        setCurrentContent(
          'Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.'
        );
        setCurrentDelay(35);
      } else if (selectedEventType === 'lembrete_2h') {
        setCurrentContent(
          'Fala {nome_cliente}! ⏰ Passando pra lembrar do seu horário daqui a pouco na barbearia!\n\n📅 Horário: {horario} hoje\n✂️ Serviço: {servico} com {barbeiro}\n\nEstamos te esperando! Se tiver algum imprevisto, avisa a gente por aqui.'
        );
        setCurrentDelay(25);
      } else {
        setCurrentContent(
          'Fala {nome_cliente}, sumido! 💈 Já faz um tempo desde o seu último corte com {barbeiro}.\n\nQue tal dar aquele talento no visual essa semana?\n\n{beneficio_clube}\n\nResponda essa mensagem para agendar o seu horário!'
        );
        setCurrentDelay(40);
      }
      setCurrentSimularDigitando(true);
      setCurrentAtivo(true);
    }
  }, [selectedEventType, templates]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getWhatsAppTemplates(barbeariaId);
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getWhatsAppDispatchHistory(barbeariaId);
      setAuditHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /**
   * Insere texto na posição exata do cursor da textarea
   */
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCurrentContent((prev) => prev + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const original = textarea.value;

    const updated = original.substring(0, start) + textToInsert + original.substring(end);
    setCurrentContent(updated);

    // Reposiciona o cursor após o texto inserido
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  };

  /**
   * Salva o template atual no backend
   */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessToast(false);
    try {
      const res = await saveWhatsAppTemplate({
        barbearia_id: barbeariaId,
        tipo_evento: selectedEventType,
        conteudo: currentContent,
        delay_segundos: currentDelay,
        simular_digitando: currentSimularDigitando,
        ativo: currentAtivo,
      });

      if (res.success) {
        setToastMessage('Template e regras de Anti-Ban salvas com sucesso!');
        setSaveSuccessToast(true);
        setTimeout(() => setSaveSuccessToast(false), 4000);
        await loadTemplates();
      } else {
        alert('Erro ao salvar template: ' + (res.error || 'Falha desconhecida'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Erro inesperado: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Dispara teste real para o WhatsApp
   */
  const handleSendTest = async () => {
    if (!testPhone || testPhone.trim().length < 8) {
      alert('Por favor, informe um número de WhatsApp válido.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendWhatsAppTestMessage({
        barbearia_id: barbeariaId,
        telefone: testPhone,
        tipo_evento: selectedEventType,
        conteudo: currentContent,
        simular_digitando: currentSimularDigitando,
      });

      setTestResult(res);
      await loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setIsSendingTest(false);
    }
  };

  /**
   * Gera a pré-visualização substituindo tags por dados simulados
   */
  const renderPreviewMessage = (): string => {
    return currentContent
      .replace(/\{nome_cliente\}/g, 'Gabriel Silva')
      .replace(/\{barbeiro\}/g, 'Carlos Silva')
      .replace(/\{horario\}/g, '15:30')
      .replace(/\{data\}/g, 'Amanhã')
      .replace(/\{servico\}/g, 'Corte Degradê + Barba')
      .replace(/\{beneficio_clube\}/g, '⭐ Membro do Clube VIP: Corte incluso no seu plano!');
  };

  const isDelayRecommended = currentDelay >= 30 && currentDelay <= 60;

  return (
    <div className="space-y-6">
      {/* 1. TOPO: Título, Status & Ações Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#121215] to-[#18181B] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-500/15 text-[#D4AF37] border border-amber-500/30">
              <ShieldCheck weight="fill" className="text-amber-400 text-sm" />
              Motor Anti-Ban Humanizado
            </span>
            <span className="text-xs text-zinc-400 font-mono">Evolution API v2</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Automações de WhatsApp
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
            Configure mensagens personalizadas com emojis, variáveis dinâmicas e o algoritmo seguro de delay randômico com simulação de digitação para proteger seu número.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium transition-all"
          >
            <Clock size={16} className="text-zinc-400" />
            <span>Auditoria ({auditHistory.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all shadow-sm"
          >
            <PaperPlaneRight size={16} className="text-emerald-400" />
            <span>Enviar Teste Real</span>
          </button>

          {onNavigateToConnection && (
            <button
              type="button"
              onClick={onNavigateToConnection}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                isWhatsAppConnected
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-900/40 animate-pulse'
              }`}
            >
              <WhatsAppIcon variant="official" size={16} />
              <span>{isWhatsAppConnected ? 'WhatsApp Conectado' : 'Conectar QR Code'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TOAST DE SUCESSO AO SALVAR */}
      {saveSuccessToast && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm shadow-xl animate-fade-in">
          <CheckCircle size={20} weight="fill" className="text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 3. SELEÇÃO DO TIPO DE EVENTO (TABS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {EVENT_TABS.map((tab) => {
          const isSelected = selectedEventType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedEventType(tab.id)}
              className={`p-4 rounded-xl text-left transition-all border relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-b from-[#1C1C22] to-[#141418] border-amber-500/40 shadow-lg ring-1 ring-amber-500/30'
                  : 'bg-[#121215] border-white/5 hover:border-white/10 hover:bg-[#16161B]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`text-sm font-bold ${isSelected ? 'text-[#D4AF37]' : 'text-zinc-200'}`}>
                  {tab.label}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tab.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{tab.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 4. ÁREA PRINCIPAL: EDITOR (ESQUERDA) + CHAT PREVIEW DARK LUXURY (DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: EDITOR E CONTROLES (7 COLUNAS) */}
        <div className="lg:col-span-7 space-y-5 bg-[#121215] border border-white/5 p-5 sm:p-6 rounded-2xl shadow-xl">
          {/* Status do Template (Ativo / Inativo) */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Editor de Mensagem</span>
                <span className="text-xs font-normal text-zinc-400">
                  ({EVENT_TABS.find((t) => t.id === selectedEventType)?.label})
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Personalize o texto que será disparado via WhatsApp oficial.
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-medium text-zinc-300">
                {currentAtivo ? 'Disparo Ativo' : 'Disparo Pausado'}
              </span>
              <input
                type="checkbox"
                checked={currentAtivo}
                onChange={(e) => setCurrentAtivo(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  currentAtivo ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    currentAtivo ? 'left-6' : 'left-1'
                  }`}
                />
              </div>
            </label>
          </div>

          {/* CHIPS DE VARIÁVEIS CLICÁVEIS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkle size={14} className="text-amber-400" />
                <span>Pílulas de Variáveis (Clique para Inserir)</span>
              </label>
              <span className="text-[11px] text-zinc-500">Substituído automaticamente no envio</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {VARIABLE_CHIPS.map((chip) => {
                const IconComponent = chip.icon;
                return (
                  <button
                    key={chip.tag}
                    type="button"
                    onClick={() => insertAtCursor(chip.tag)}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1A1A20] hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-zinc-700/60 hover:border-amber-500/40 transition-all shadow-sm active:scale-95"
                    title={`Inserir ${chip.tag} no texto`}
                  >
                    <IconComponent size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-[11px] text-amber-200/90">{chip.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BARRA DE EMOJIS RÁPIDOS */}
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-900/80 border border-white/5 overflow-x-auto">
            <div className="flex items-center gap-1 text-zinc-400 px-2 text-xs border-r border-zinc-800 flex-shrink-0">
              <Smiley size={16} className="text-amber-400" />
              <span className="hidden sm:inline">Emojis:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertAtCursor(emoji)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-base transition-transform hover:scale-125 active:scale-95 flex-shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* TEXTAREA DO EDITOR */}
          <div className="space-y-1.5">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                rows={9}
                placeholder="Escreva a mensagem personalizada aqui..."
                className="w-full px-4 py-3.5 rounded-xl bg-[#09090B] border border-zinc-700/70 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 text-white placeholder-zinc-600 text-sm leading-relaxed resize-y font-sans transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
              <span>Suporta quebras de linha normais, acentos e emojis UTF-8.</span>
              <span>{currentContent.length} caracteres</span>
            </div>
          </div>

          {/* CONTROLE ANTI-BAN: SLIDER DE DELAY */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-[#18181E] to-[#121216] border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Tempo de Espera antes do Envio (Delay Randômico)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold font-mono text-amber-300">{currentDelay}s</span>
                {isDelayRecommended && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Recomendado
                  </span>
                )}
              </div>
            </div>

            {/* Slider Range */}
            <div className="space-y-1">
              <input
                type="range"
                min={10}
                max={180}
                step={5}
                value={currentDelay}
                onChange={(e) => setCurrentDelay(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1">
                <span>10s (mínimo)</span>
                <span className="text-amber-400/80 font-semibold">Zona Segura: 30s a 60s</span>
                <span>180s (máximo)</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              O WhatsApp monitora a velocidade com que mensagens são enviadas após ações no sistema. Manter entre 30 e 60 segundos simula com perfeição um ser humano digitando e evita que o número caia na malha de bloqueio.
            </p>
          </div>

          {/* TOGGLE: SIMULAR DIGITANDO (PRESENCE COMPOSING) */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/60 border border-white/5">
            <input
              id="simular_digitando_check"
              type="checkbox"
              checked={currentSimularDigitando}
              onChange={(e) => setCurrentSimularDigitando(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-zinc-800 border-zinc-700 focus:ring-amber-500"
            />
            <label htmlFor="simular_digitando_check" className="cursor-pointer space-y-1 select-none">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Simular "Digitando..." no WhatsApp por 4 segundos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Presence Composing
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Antes do envio, o sistema emite o evento oficial de presença da Evolution API. O cliente vê na tela do WhatsApp que a barbearia está digitando em tempo real.
              </p>
            </label>
          </div>

          {/* BOTÃO SALVAR ALTERAÇÕES */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm shadow-xl transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <ArrowsClockwise size={16} className="animate-spin" />
                  <span>Salvando no Servidor...</span>
                </>
              ) : (
                <>
                  <Check size={16} weight="bold" />
                  <span>Salvar Regras de Automação</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO EM TEMPO REAL NO ESTILO WHATSAPP DARK (5 COLUNAS) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={14} className="text-emerald-400" />
              <span>Simulação no WhatsApp Dark</span>
            </span>
            <span className="text-[10px] text-zinc-500">Pré-visualização em tempo real</span>
          </div>

          {/* MOCKUP DO APARELHO / TELA DE CHAT */}
          <div className="rounded-3xl border border-zinc-800/80 bg-[#0B141A] shadow-2xl overflow-hidden flex flex-col h-[520px]">
            {/* WhatsApp Header Dark */}
            <div className="bg-[#202C33] px-4 py-3 flex items-center justify-between border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black font-bold text-sm">
                    GS
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-[#202C33]" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#E9EDEF]">Gabriel Silva (Cliente)</h4>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    {currentSimularDigitando ? (
                      <span className="animate-pulse">digitando...</span>
                    ) : (
                      <span>online agora</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <WhatsAppIcon variant="monochrome" size={18} className="text-zinc-400" />
              </div>
            </div>

            {/* Chat Body (Papel de parede escuro WhatsApp) */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0B141A] relative flex flex-col justify-end">
              {/* Badge de Data Centralizada */}
              <div className="flex justify-center my-2">
                <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-md bg-[#182229] text-zinc-400 uppercase tracking-wider shadow-sm">
                  Hoje
                </span>
              </div>

              {/* Balão de Mensagem Enviada (Verde Escuro Oficial WhatsApp #005C4B) */}
              <div className="self-end max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tr-none bg-[#005C4B] text-[#E9EDEF] p-3.5 shadow-md relative group">
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans selection:bg-emerald-700">
                  {renderPreviewMessage()}
                </div>

                {/* Rodapé da mensagem: Hora e Double Tick Azul */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-zinc-300/80">
                  <span>15:32</span>
                  {/* Dois checks azuis do WhatsApp (#53BDEB) */}
                  <span className="text-[#53BDEB] font-bold text-xs tracking-tighter">✓✓</span>
                </div>
              </div>

              {/* Alerta de Simulação de Digitação */}
              {currentSimularDigitando && (
                <div className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202C33] text-zinc-400 text-[11px] animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-150" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-300" />
                  <span className="text-[10px] ml-1">Simulando digitação humana (4s)...</span>
                </div>
              )}
            </div>

            {/* WhatsApp Chat Input Footer Simulado */}
            <div className="bg-[#202C33] px-3 py-2 flex items-center gap-2 border-t border-zinc-800 flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-zinc-700/60 flex items-center justify-center text-zinc-400 text-sm">
                😊
              </div>
              <div className="flex-1 bg-[#2A3942] rounded-lg px-3 py-1.5 text-xs text-zinc-500">
                Mensagem
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs">
                🎤
              </div>
            </div>
          </div>

          {/* Dica Anti-Ban */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <Info size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Proteção Anti-Ban:</strong> Com delay ativo de {currentDelay}s e digitação simulada, cada mensagem disparada possui intervalos dinâmicos, impossibilitando a detecção por algoritmos anti-spam da Meta.
            </p>
          </div>
        </div>
      </div>

      {/* 5. MODAL DE ENVIO DE TESTE REAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#141418] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PaperPlaneRight size={20} className="text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Disparar Teste Real</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                }}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Envie a mensagem agora para o seu próprio WhatsApp para verificar formatação, variáveis simuladas e quebras de linha no seu aparelho.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Seu Número com DDD (Ex: 11999999999):
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511999999999"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white font-mono text-sm"
              />
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  testResult.success
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <ArrowsClockwise size={14} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <PaperPlaneRight size={14} />
                    <span>Enviar Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL / AUDITORIA DE DISPAROS REALIZADOS */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-[#141418] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} className="text-[#D4AF37]" />
                <div>
                  <h3 className="text-lg font-bold text-white">Histórico de Auditoria Anti-Ban</h3>
                  <p className="text-xs text-zinc-400">
                    Registro de mensagens disparadas, delays aplicados e status retornado pela Evolution API.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {auditHistory.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  Nenhum disparo registrado ainda. Crie um agendamento para testar!
                </div>
              ) : (
                auditHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.status === 'enviado'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="font-semibold text-white">{item.cliente_nome}</span>
                        <span className="text-zinc-500 font-mono">({item.cliente_telefone})</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] line-clamp-1 italic">
                        "{item.mensagem}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px] flex-shrink-0">
                      <span>Delay: {item.delay_aplicado}s</span>
                      <span>Digitando: {item.simulou_digitando ? 'Sim (4s)' : 'Não'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
