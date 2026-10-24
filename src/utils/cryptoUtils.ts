/**
 * Cryptographic & Security Utilities
 * Application Security Engineer & Identity Access Specialist (Naville SaaS)
 * Requisitos [2] Hash de Senhas, [16] Criptografia em Repouso, [11] Sessão
 */

import crypto from 'crypto';

/**
 * [2] Validação de Força e Complexidade de Senhas
 * Exige: mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number; // 0 a 4
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    feedback.push('A senha deve ter no mínimo 8 caracteres.');
  } else {
    score++;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('A senha deve conter pelo menos uma letra maiúscula.');
  } else {
    score++;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('A senha deve conter pelo menos uma letra minúscula.');
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('A senha deve conter pelo menos um dígito numérico.');
  } else {
    score++;
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    feedback.push('A senha deve conter pelo menos um caractere especial (!@#$%...).');
  } else {
    score++;
  }

  // Lista de senhas fracas comuns proibidas
  const commonWeak = ['12345678', 'password', 'senha123', 'admin123', 'barbearia123', 'qwerty123'];
  if (commonWeak.includes(password.toLowerCase())) {
    feedback.push('Esta senha é muito comum e insegura. Escolha uma senha mais complexa.');
    score = 0;
  }

  return {
    isValid: feedback.length === 0,
    score,
    feedback,
  };
}

/**
 * [2] Comparação segura em tempo constante (Timing-Attack Safe)
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * [2] Gera hash criptográfico seguro (PBKDF2-SHA512 com 100.000 iterações e Salt de 32 bytes)
 * Utilizado para fallbacks offline e verificação de hashes
 */
export function hashPasswordSecure(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const iterations = 100000;
  const keylen = 64;
  const digest = 'sha512';
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
  return `pbkdf2$${iterations}$${salt}$${derivedKey}`;
}

/**
 * [2] Valida senha contra hash gerado por hashPasswordSecure
 */
export function verifyPasswordHash(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('pbkdf2$')) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const originalKey = parts[3];

  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return timingSafeCompare(derivedKey, originalKey);
}

/**
 * [16] Criptografia Autenticada em Repouso (AES-256-GCM)
 * Encripta segredos (ex: chaves de webhook, dados sensíveis) com IV aleatório e Auth Tag
 */
export function encryptAes256Gcm(plaintext: string, secretKeyHex?: string): string {
  const rawKey = secretKeyHex || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(rawKey.substring(0, 64), 'hex');
  const iv = crypto.randomBytes(16); // 128-bit IV

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Retorna iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * [16] Decriptação Autenticada (AES-256-GCM)
 */
export function decryptAes256Gcm(encryptedPayload: string, secretKeyHex?: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Payload criptografado inválido');
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const rawKey = secretKeyHex || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const key = Buffer.from(rawKey.substring(0, 64), 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * [3] Gerador de segredo TOTP (RFC 6238) e cálculo de código de 6 dígitos
 */
export function generateTotpSecret(): string {
  return crypto.randomBytes(20).toString('hex'); // 160 bits
}

/**
 * [3] Gera código OTP numérico de 6 dígitos para autenticação em dois fatores
 */
export function generate6DigitOtp(): string {
  const num = crypto.randomInt(100000, 999999);
  return String(num);
}
