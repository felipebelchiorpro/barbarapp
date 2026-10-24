/**
 * Sensitive Data Redactor for Structured Logs & Telemetry
 * DevSecOps & SRE Specialist (Naville SaaS)
 * Requisito [14]: Garantir que nenhum dado de cartão, senha ou token seja exposto nos logs
 */

const SENSITIVE_KEY_REGEX = /^(password|senha|secret|token|authorization|apikey|api_key|cvv|cvc|cardnumber|cartao|credit_card)$/i;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}|\d{4}[ -]?\d{6}[ -]?\d{4,5}|\d{13,19})\b/g;
const JWT_REGEX = /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g;

/**
 * [14] Redige recursivamente strings, objetos e arrays para remover informações sensíveis
 */
export function redactSensitiveData<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let str: string = input;
    // Oculta números de cartão de crédito
    str = str.replace(CREDIT_CARD_REGEX, '****-****-****-[CARD]');
    // Oculta tokens JWT completos em stack traces ou mensagens
    str = str.replace(JWT_REGEX, 'Bearer [REDACTED_JWT]');
    return str as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const cleanObj: Record<string, any> = {};

    for (const [key, val] of Object.entries(input)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        cleanObj[key] = '[REDACTED_CONFIDENTIAL]';
      } else {
        cleanObj[key] = redactSensitiveData(val);
      }
    }

    return cleanObj as T;
  }

  return input;
}
