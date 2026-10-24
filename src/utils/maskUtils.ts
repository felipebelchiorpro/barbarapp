/**
 * Utilitários de Máscaras e Formatação Visual de Documentos e Endereço
 * UI/UX Designer & Frontend Developer (Naville SaaS)
 * Suporte a CPF, CNPJ, CEP e Telefones
 */

/**
 * Remove qualquer caractere que não seja dígito numérico
 */
export function cleanDigits(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Máscara visual para CPF: 000.000.000-00
 */
export function formatCpf(value: string): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Máscara visual para CNPJ: 00.000.000/0000-00
 */
export function formatCnpj(value: string): string {
  const digits = cleanDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formata dinamicamente como CPF ou CNPJ de acordo com a quantidade de dígitos ou tipo selecionado
 */
export function formatCpfCnpj(value: string, forcedType?: 'CPF' | 'CNPJ'): string {
  const digits = cleanDigits(value);
  if (forcedType === 'CPF') return formatCpf(digits);
  if (forcedType === 'CNPJ') return formatCnpj(digits);

  if (digits.length <= 11) {
    return formatCpf(digits);
  }
  return formatCnpj(digits);
}

/**
 * Máscara visual para CEP brasileiro: 00000-000
 */
export function formatCep(value: string): string {
  const digits = cleanDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/**
 * Máscara visual para Telefone/WhatsApp celular (11 dígitos) ou fixo (10 dígitos)
 */
export function formatPhone(value: string): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Validação básica de CEP (deve ter 8 dígitos)
 */
export function isValidCep(cep: string): boolean {
  return cleanDigits(cep).length === 8;
}

/**
 * Validação de CPF com cálculo dos dígitos verificadores (apenas se preenchido)
 */
export function isValidCpf(cpf: string): boolean {
  const clean = cleanDigits(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false; // Impede números repetidos 111.111...

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean[10]);
}

/**
 * Validação de CNPJ com cálculo dos dígitos verificadores (apenas se preenchido)
 */
export function isValidCnpj(cnpj: string): boolean {
  const clean = cleanDigits(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}
