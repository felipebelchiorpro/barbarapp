import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeAuthInput,
  checkAccountLockout,
  recordLoginFailure,
  recordLoginSuccess,
  evaluatePasswordStrength,
  generateTwoFactorChallenge,
  verifyTwoFactorChallenge,
} from '../src/services/securityLoginGuard';

describe('🛡️ SUITE: DEFESA APPSEC & LOGIN SECURITY GUARD', () => {
  it('Sanitiza inputs removendo tags HTML, scripts e caracteres nulos', () => {
    const dirty = '<script>alert(1)</script>admin@naville.app\0;';
    const clean = sanitizeAuthInput(dirty);
    assert.strictEqual(clean.includes('<script>'), false);
    assert.strictEqual(clean.includes('\0'), false);
    assert.strictEqual(clean.includes(';'), false);
    assert.strictEqual(clean, 'admin@naville.app');
  });

  it('Bloqueia acesso progressivo por Rate Limiting / Lockout após tentativas falhas', () => {
    const testId = 'attacker_probe@test.com';

    // 1ª e 2ª falhas: não bloqueia ainda
    recordLoginFailure(testId);
    let status = checkAccountLockout(testId);
    assert.strictEqual(status.isLocked, false);
    assert.strictEqual(status.attempts, 1);

    recordLoginFailure(testId);
    status = checkAccountLockout(testId);
    assert.strictEqual(status.isLocked, false);
    assert.strictEqual(status.attempts, 2);

    // 3ª falha: aciona Lockout de 30 segundos
    const fail3 = recordLoginFailure(testId);
    assert.strictEqual(fail3.isLocked, true);
    assert.strictEqual(fail3.remainingSeconds > 0, true);

    status = checkAccountLockout(testId);
    assert.strictEqual(status.isLocked, true);

    // Sucesso subsequente reseta o histórico
    recordLoginSuccess(testId);
    const postSuccess = checkAccountLockout(testId);
    assert.strictEqual(postSuccess.isLocked, false);
    assert.strictEqual(postSuccess.attempts, 0);
  });

  it('Avalia força da senha com regras de entropia', () => {
    const weak = evaluatePasswordStrength('12345');
    assert.strictEqual(weak.score <= 1, true);

    const medium = evaluatePasswordStrength('Senha123');
    assert.strictEqual(medium.score >= 2, true);

    const strong = evaluatePasswordStrength('Naville#2026MasterKey');
    assert.strictEqual(strong.score, 4);
    assert.strictEqual(strong.label, 'Ultra Segura');
  });

  it('Gera e valida desafio 2FA de forma consistente (anti-replay)', () => {
    const target = '11999998888';
    const challenge = generateTwoFactorChallenge(target, 'owner');
    assert.strictEqual(challenge.token.length, 6);
    assert.strictEqual(/^\d{6}$/.test(challenge.token), true);

    // Validação com código incorreto deve falhar
    const invalidAttempt = verifyTwoFactorChallenge(target, '000000');
    assert.strictEqual(invalidAttempt.valid, false);

    // Validação com código correto deve passar
    const validAttempt = verifyTwoFactorChallenge(target, challenge.token);
    assert.strictEqual(validAttempt.valid, true);

    // Replay attack: reutilizar o mesmo código deve ser rejeitado
    const replayAttempt = verifyTwoFactorChallenge(target, challenge.token);
    assert.strictEqual(replayAttempt.valid, false);
  });
});
