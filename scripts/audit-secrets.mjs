#!/usr/bin/env node
/**
 * Secret Scanning & Hygiene Audit Script
 * Responsável: Agente DevSecOps & Infraestrutura
 * Requisito [12]: Garantir ausência de secrets hardcoded no repositório
 */

import fs from 'fs';
import path from 'path';

const SUSPICIOUS_PATTERNS = [
  { name: 'Private Key', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'AWS Access Key ID', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: 'Generic High-Entropy Secret / Token', regex: /(api_key|apikey|secret|password|passwd|auth_token)\s*[:=]\s*["']([A-Za-z0-9+/=_-]{24,})["']/i },
  { name: 'Hardcoded Evolution API Key', regex: /EVOLUTION_API_GLOBAL_KEY\s*=\s*["'][a-zA-Z0-9]{16,}["']/ },
  { name: 'Hardcoded JWT Secret', regex: /JWT_SECRET\s*=\s*["'][a-zA-Z0-9]{16,}["']/ },
  { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
];

const IGNORED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'dev-dist',
  'pocketbase/pb_data',
  'pocketbase/pocketbase.exe',
  '.agents',
  'agency-agents-repo',
  'deploy/.env.production.example',
  '.env.example',
];

const BINARY_EXTENSIONS = ['.exe', '.png', '.jpg', '.jpeg', '.db', '.zip', '.tar', '.gz', '.wal'];

let totalScanned = 0;
let findings = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    if (IGNORED_PATHS.some((p) => relPath.startsWith(p) || relPath.includes('/' + p))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      if (BINARY_EXTENSIONS.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
        continue;
      }
      totalScanned++;
      checkFile(fullPath, relPath);
    }
  }
}

function checkFile(fullPath, relPath) {
  try {
    const content = fs.readFileSync(fullPath, 'utf8');

    for (const pattern of SUSPICIOUS_PATTERNS) {
      const match = pattern.regex.exec(content);
      if (match) {
        // Ignora placeholders conhecidos em exemplos
        if (match[0].includes('CHANGE_ME') || match[0].includes('MY_GEMINI_API_KEY')) {
          continue;
        }

        findings.push({
          file: relPath,
          pattern: pattern.name,
          snippet: match[0].substring(0, 40) + '...',
        });
      }
    }
  } catch {
    // Arquivos binários ignorados silenciosamente
  }
}

console.log('🔍 Iniciando auditoria de secrets e variáveis sensíveis...');
scanDirectory(process.cwd());

console.log(`📄 Arquivos verificados: ${totalScanned}`);

if (findings.length > 0) {
  console.error('\n❌ ATENÇÃO: Possíveis credenciais/segredos expostos encontrados:');
  findings.forEach((f) => {
    console.error(`  - Arquivo: ${f.file} (${f.pattern}): ${f.snippet}`);
  });
  console.error('\nPor favor, mova estes valores para o .env e utilize process.env.\n');
  process.exit(1);
} else {
  console.log('✅ SUCESSO: Nenhum segredo ou chave privada hardcoded foi detectada!');
  process.exit(0);
}
