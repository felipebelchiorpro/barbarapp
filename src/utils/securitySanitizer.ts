/**
 * Input Validation & Data Sanitization Engine
 * Application Security Engineer & Code Reviewer (Naville SaaS)
 * Requisitos [5] Validação de Inputs & [6] Sanitização de Dados contra XSS e Injeção
 */

export interface ValidationResult<T = any> {
  isValid: boolean;
  sanitizedData?: T;
  errors: string[];
}

/**
 * [6] Sanitiza string removendo tags HTML perigosas, scripts embutidos e vetores de XSS
 */
export function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();

  // Remove caracteres nulos e de controle
  str = str.replace(/\0/g, '');

  // Executa duas passagens para impedir ataques baseados em tags aninhadas (ex: <scr<script>ipt>)
  for (let i = 0; i < 2; i++) {
    // Remove tags script completas e seus conteúdos
    str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove tags perigosas (iframe, object, embed, style, link, meta, form, svg, math)
    str = str.replace(/<(iframe|object|embed|style|link|meta|form|svg|math)[^>]*?>.*?<\/\1>/gi, '');
    str = str.replace(/<(iframe|object|embed|style|link|meta|form|svg|math)[^>]*?>/gi, '');

    // Remove handlers de eventos JavaScript (onclick=, onerror=, onload=, onmouseover=, etc.)
    str = str.replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // Remove pseudo-protocolos javascript: e vbscript:
    str = str.replace(/(javascript|vbscript|data):/gi, '');

    // Remove tags HTML remanescentes mantendo apenas o texto limpo
    str = str.replace(/<[^>]*>/g, '');
  }

  return str.trim();
}

/**
 * [6] Valida e sanitiza URLs para links e imagens, prevenindo javascript:, data: e vbscript:
 */
export function sanitizeUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  // Permite exclusivamente http:// ou https://
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  // Remove aspas e caracteres perigosos
  return trimmed.replace(/[<>"'\s]/g, '');
}

/**
 * [6] Escapa caracteres especiais HTML para prevenir injeção no DOM
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  const htmlMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => htmlMap[char] || char);
}

/**
 * [5] Valida e sanitiza número de telefone (padrão Brasil ou E.164 internacional)
 */
export function sanitizePhone(phone: unknown): string {
  if (!phone) return '';
  // Extrai apenas dígitos
  const digits = String(phone).replace(/\D/g, '');
  return digits;
}

export function isValidPhone(phone: string): boolean {
  const digits = sanitizePhone(phone);
  // Aceita telefones brasileiros (10 ou 11 dígitos) ou internacionais (até 15 dígitos)
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * [5] Valida e normaliza endereço de e-mail
 */
export function sanitizeEmail(email: unknown): string {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = sanitizeEmail(email);
  // RFC 5322 regex simplificada e segura contra ReDoS
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return normalized.length <= 254 && emailRegex.test(normalized);
}

/**
 * [6] Sanitização profunda recursiva de objetos e arrays antes de envio ao banco ou APIs
 */
export function deepSanitize<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => deepSanitize(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      // Impede Prototype Pollution (__proto__, constructor, prototype)
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleanObj[key] = deepSanitize(val);
    }
    return cleanObj as T;
  }

  return input;
}

/**
 * [5] Validação de Esquema de Entrada: Agendamento de Serviços
 */
export interface BookingInput {
  clientName: string;
  clientPhone: string;
  barberId: string;
  serviceIds: string[];
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  notes?: string;
}

export function validateBookingInput(input: any): ValidationResult<BookingInput> {
  const errors: string[] = [];

  const clientName = sanitizeString(input?.clientName);
  if (!clientName || clientName.length < 2) {
    errors.push('Nome do cliente é obrigatório e deve ter pelo menos 2 caracteres.');
  } else if (clientName.length > 100) {
    errors.push('Nome do cliente não pode exceder 100 caracteres.');
  }

  const clientPhone = sanitizePhone(input?.clientPhone);
  if (!isValidPhone(clientPhone)) {
    errors.push('Telefone inválido. Informe DDD + número (ex: 11988887766).');
  }

  const barberId = sanitizeString(input?.barberId);
  if (!barberId) {
    errors.push('Barbeiro selecionado é obrigatório.');
  }

  const serviceIds = Array.isArray(input?.serviceIds)
    ? input.serviceIds.map(sanitizeString).filter(Boolean)
    : [];
  if (serviceIds.length === 0) {
    errors.push('Selecione pelo menos um serviço.');
  }

  const date = sanitizeString(input?.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('Data inválida. Formato esperado: AAAA-MM-DD.');
  }

  const time = sanitizeString(input?.time);
  if (!/^\d{2}:\d{2}$/.test(time)) {
    errors.push('Horário inválido. Formato esperado: HH:MM.');
  }

  const notes = input?.notes ? sanitizeString(input.notes).substring(0, 300) : '';

  return {
    isValid: errors.length === 0,
    sanitizedData: {
      clientName,
      clientPhone,
      barberId,
      serviceIds,
      date,
      time,
      notes,
    },
    errors,
  };
}

/**
 * [5] Validação de Esquema de Entrada: Perfil de Cliente
 */
export function validateCustomerInput(input: any): ValidationResult {
  const errors: string[] = [];

  const name = sanitizeString(input?.name);
  if (!name || name.length < 2) {
    errors.push('Nome do cliente deve ter ao menos 2 caracteres.');
  }

  const phone = sanitizePhone(input?.phone);
  if (!isValidPhone(phone)) {
    errors.push('Telefone de contato inválido.');
  }

  const email = input?.email ? sanitizeEmail(input.email) : undefined;
  if (email && !isValidEmail(email)) {
    errors.push('Endereço de e-mail inválido.');
  }

  return {
    isValid: errors.length === 0,
    sanitizedData: {
      name,
      phone,
      email,
      notes: input?.notes ? sanitizeString(input.notes).substring(0, 500) : '',
    },
    errors,
  };
}
