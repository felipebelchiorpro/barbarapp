/**
 * ViaCEP Client Service
 * Frontend Developer & API Platform Specialist (Naville SaaS)
 * Busca automática de logradouro, bairro, cidade e UF a partir do CEP
 */

import { cleanDigits } from '../utils/maskUtils';

export interface ViaCepAddress {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string; // Estado (UF)
  erro?: boolean;
}

const cepCache = new Map<string, ViaCepAddress>();

/**
 * Limpa o cache em memória (utilizado em testes e refresh)
 */
export function clearViaCepCache(): void {
  cepCache.clear();
}

/**
 * Consulta a API pública do ViaCEP com timeout e cache em memória
 */
export async function fetchAddressByCep(rawCep: string): Promise<{
  success: boolean;
  address?: ViaCepAddress;
  error?: string;
}> {
  const cep = cleanDigits(rawCep);

  if (cep.length !== 8) {
    return {
      success: false,
      error: 'O CEP deve conter exatamente 8 dígitos numéricos.',
    };
  }

  // Consulta cache prévia
  if (cepCache.has(cep)) {
    return {
      success: true,
      address: cepCache.get(cep)!,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 segundos de timeout

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Serviço ViaCEP indisponível (HTTP ${response.status}). Preencha os campos manualmente.`,
      };
    }

    const data: any = await response.json();

    if (data.erro === true || data.erro === 'true') {
      return {
        success: false,
        error: 'CEP não localizado na base dos Correios. Verifique o número digitado.',
      };
    }

    const result: ViaCepAddress = {
      cep: data.cep || cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
    };

    cepCache.set(cep, result);

    return {
      success: true,
      address: result,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'Tempo limite esgotado ao consultar o CEP. Preencha manualmente.',
      };
    }
    return {
      success: false,
      error: 'Não foi possível consultar o CEP automaticamente no momento.',
    };
  }
}
