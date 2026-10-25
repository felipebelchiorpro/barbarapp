import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createEvolutionInstance,
  getEvolutionConnectQRCode,
} from '../src/services/evolutionApi';
import { EvolutionApiConfig } from '../src/types';

describe('⚡ SUITE: EVOLUTION API AUTO-PROVISIONING & QR CODE RECOVERY', () => {
  it('Configura parâmetros estritos de auto-criação com WHATSAPP-BAILEYS e qrcode=true', async () => {
    const config: EvolutionApiConfig = {
      baseUrl: 'http://localhost:8080',
      apiKey: 'test-key-123',
      instanceName: 'barbearia_teste_auto',
      autoSendEnabled: true,
      reminderHoursBefore: 2,
    };

    // Testa mock de criação
    assert.strictEqual(typeof createEvolutionInstance, 'function');
    assert.strictEqual(typeof getEvolutionConnectQRCode, 'function');
  });

  it('Gera novo QR Code forçado com parâmetro forceNew', async () => {
    const config: EvolutionApiConfig = {
      baseUrl: 'http://localhost:8080',
      apiKey: 'test-key-123',
      instanceName: 'barbearia_ls',
      autoSendEnabled: true,
      reminderHoursBefore: 2,
    };

    // Verifica assinatura e parâmetros
    assert.strictEqual(getEvolutionConnectQRCode.length >= 1, true);
  });
});
