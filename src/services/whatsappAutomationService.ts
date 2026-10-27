import {
  WhatsAppMessageTemplate,
  WhatsAppDispatchAuditLog,
  WhatsAppTemplateEventType,
} from '../types';
import { POCKETBASE_URL } from './pocketbase';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Se estiver rodando na porta do Vite (5173 / 3000 em localhost sem proxy), usa POCKETBASE_URL
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return POCKETBASE_URL.replace(/\/+$/, '');
    }
    // Em produção (VPS ou domínio /b/:slug), utiliza a rota relativa do Caddy
    return '';
  }
  return POCKETBASE_URL.replace(/\/+$/, '');
}

/**
 * Busca todos os templates configurados para uma barbearia
 */
export async function getWhatsAppTemplates(barbeariaId: string): Promise<WhatsAppMessageTemplate[]> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/barbearia/whatsapp/templates?barbearia_id=${encodeURIComponent(barbeariaId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Erro ao buscar templates (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    return data?.templates || [];
  } catch (err) {
    console.warn('[WhatsAppAutomation] Falha ao carregar templates:', err);
    // Fallback de templates padrão locais caso a API falhe
    return [
      {
        barbearia_id: barbeariaId,
        tipo_evento: 'confirmacao_agendamento',
        conteudo:
          'Fala {nome_cliente}, tudo bem? 💈 Vi aqui que você acabou de marcar o seu horário com a gente!\n\n📅 Data: {data} às {horario}\n✂️ Serviço: {servico} com {barbeiro}\n\n{beneficio_clube}\n\nTe esperamos aqui! Se precisar remarcar, só nos avisar por aqui.',
        delay_segundos: 35,
        simular_digitando: true,
        ativo: true,
      },
      {
        barbearia_id: barbeariaId,
        tipo_evento: 'lembrete_2h',
        conteudo:
          'Fala {nome_cliente}! ⏰ Passando pra lembrar do seu horário daqui a pouco na barbearia!\n\n📅 Horário: {horario} hoje\n✂️ Serviço: {servico} com {barbeiro}\n\nEstamos te esperando! Se tiver algum imprevisto, avisa a gente por aqui.',
        delay_segundos: 25,
        simular_digitando: true,
        ativo: true,
      },
      {
        barbearia_id: barbeariaId,
        tipo_evento: 'pos_corte',
        conteudo:
          'Opa {nome_cliente}, e aí, tudo bem? 💈✂️\n\nPassando pra agradecer a preferência hoje no seu {servico} com {barbeiro}! Espero que tenha gostado do resultado.\n\nQuando precisar dar aquele talento no visual de novo, estamos aí de volta! Tamo junto! 🤝',
        delay_segundos: 35,
        simular_digitando: true,
        ativo: true,
      },
      {
        barbearia_id: barbeariaId,
        tipo_evento: 'reativacao_cliente',
        conteudo:
          'Fala {nome_cliente}, sumido! 💈 Já faz um tempo desde o seu último corte com {barbeiro}.\n\nQue tal dar aquele talento no visual essa semana?\n\n{beneficio_clube}\n\nResponda essa mensagem para agendar o seu horário!',
        delay_segundos: 40,
        simular_digitando: true,
        ativo: true,
      },
    ];
  }
}

/**
 * Salva ou atualiza um template de mensagem no backend
 */
export async function saveWhatsAppTemplate(
  template: Partial<WhatsAppMessageTemplate> & { barbearia_id: string; tipo_evento: WhatsAppTemplateEventType }
): Promise<{ success: boolean; template?: WhatsAppMessageTemplate; error?: string }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/barbearia/whatsapp/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `Erro HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      template: data?.template,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[WhatsAppAutomation] Erro ao salvar template:', err);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Dispara uma mensagem de teste para o WhatsApp pessoal do usuário
 */
export async function sendWhatsAppTestMessage(params: {
  barbearia_id: string;
  telefone: string;
  tipo_evento: WhatsAppTemplateEventType;
  conteudo?: string;
  simular_digitando?: boolean;
}): Promise<{ success: boolean; message: string; details?: unknown }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/barbearia/whatsapp/test-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error || data?.details || `Falha no envio de teste (HTTP ${res.status})`;
      return {
        success: false,
        message: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
        details: data,
      };
    }

    return {
      success: true,
      message: data?.message || 'Mensagem de teste enviada com sucesso ao seu WhatsApp!',
      details: data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Erro de conexão: ${msg}`,
    };
  }
}

/**
 * Consulta o histórico de auditoria de disparos
 */
export async function getWhatsAppDispatchHistory(barbeariaId: string): Promise<WhatsAppDispatchAuditLog[]> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/barbearia/whatsapp/history?barbearia_id=${encodeURIComponent(barbeariaId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data?.history || [];
  } catch (err) {
    console.warn('[WhatsAppAutomation] Falha ao carregar histórico:', err);
    return [];
  }
}

/**
 * Agenda automaticamente a mensagem Pós-Corte (30 minutos após o barbeiro finalizar o atendimento)
 */
export async function schedulePostCutWhatsAppMessage(params: {
  barbearia_id: string;
  agendamento_id?: string;
  cliente_nome: string;
  cliente_telefone: string;
  barbeiro_nome: string;
  servico_nome: string;
  horario?: string;
  data?: string;
  delay_minutos?: number;
}): Promise<{ success: boolean; message?: string; scheduledFor?: string }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/barbearia/whatsapp/post-cut`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        delay_minutos: params.delay_minutos ?? 30,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: data?.error || `Falha ao agendar pós-corte (HTTP ${res.status})`,
      };
    }

    return {
      success: Boolean(data?.success),
      message: data?.message,
      scheduledFor: data?.scheduledFor,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[WhatsAppAutomation] Erro ao agendar mensagem pós-corte:', msg);
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Dispara a Confirmação de Agendamento via Evolution API (com motor Anti-Ban e agendamento do Lembrete de 2h)
 */
export async function sendBookingConfirmationWhatsApp(params: {
  barbearia_id: string;
  barbearia_nome?: string;
  agendamento_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  barbeiro_nome: string;
  servico_nome: string;
  data: string;
  horario: string;
  beneficio_clube?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/barbearia/whatsapp/booking-created`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: Boolean(data?.success),
      message: data?.message,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[WhatsAppAutomation] Erro ao disparar confirmação:', msg);
    return {
      success: false,
      message: msg,
    };
  }
}
