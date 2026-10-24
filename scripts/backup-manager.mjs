#!/usr/bin/env node
/**
 * Automated Database & Media Backup Manager
 * SRE & Resiliência Operacional Specialist (Naville SaaS)
 * Requisito [15]: Automação diária de snapshot do PocketBase (SQLite + Mídia) com rotação
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PB_DATA_DIR = path.resolve(process.cwd(), 'pocketbase', 'pb_data');
const BACKUP_DEST_DIR = path.resolve(process.cwd(), 'backups');
const RETENTION_DAYS = 7;

if (!fs.existsSync(BACKUP_DEST_DIR)) {
  fs.mkdirSync(BACKUP_DEST_DIR, { recursive: true });
}

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFilename = `naville-backup-${timestamp}.tar.gz`;
const backupFilePath = path.join(BACKUP_DEST_DIR, backupFilename);

console.log('🔄 [SRE] Iniciando rotina de Backup do Naville SaaS...');
console.log(`📁 Origem dos Dados: ${PB_DATA_DIR}`);
console.log(`📦 Destino: ${backupFilePath}`);

if (!fs.existsSync(PB_DATA_DIR)) {
  console.error(`❌ Erro: Diretório de dados ${PB_DATA_DIR} não encontrado.`);
  process.exit(1);
}

try {
  // Snapshot seguro dos arquivos de banco
  console.log('⏳ Criando pacote compactado (SQLite + WAL + Storage)...');
  
  // Em ambientes com tar disponível (Linux VPS e Windows com tar nativo)
  try {
    execSync(`tar -czf "${backupFilePath}" -C "${path.dirname(PB_DATA_DIR)}" pb_data`, { stdio: 'inherit' });
  } catch {
    // Fallback caso tar falhe: cópia estruturada
    const fallbackDir = path.join(BACKUP_DEST_DIR, `snapshot-${timestamp}`);
    fs.cpSync(PB_DATA_DIR, fallbackDir, { recursive: true });
    console.log(`✅ Snapshot copiado com sucesso em: ${fallbackDir}`);
  }

  if (fs.existsSync(backupFilePath)) {
    const stats = fs.statSync(backupFilePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Backup gerado com sucesso: ${backupFilename} (${sizeMb} MB)`);
  }

  // Rotação de backups antigos (> RETENTION_DAYS dias)
  console.log(`🧹 Executando rotação de backups (retenção máxima: ${RETENTION_DAYS} dias)...`);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const existingFiles = fs.readdirSync(BACKUP_DEST_DIR);

  let removedCount = 0;
  for (const file of existingFiles) {
    if (file.startsWith('naville-backup-')) {
      const filePath = path.join(BACKUP_DEST_DIR, file);
      const fileStat = fs.statSync(filePath);
      if (fileStat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        removedCount++;
        console.log(`  🗑️ Removido backup expirado: ${file}`);
      }
    }
  }

  console.log(`✨ Rotação concluída: ${removedCount} backups antigos removidos.`);
  console.log('☁️ [Cloudflare R2 / S3]: Sincronização externa pronta para envio via rclone / aws-cli.');
  process.exit(0);
} catch (err) {
  console.error('❌ Falha crítica ao gerar backup:', err);
  process.exit(1);
}
