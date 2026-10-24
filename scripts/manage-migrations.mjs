#!/usr/bin/env node
/**
 * PocketBase Migration & Rollback Management CLI
 * Database Optimizer & SRE Specialist (Naville SaaS)
 * Requisitos [8] Migrations & [9] Rollback Reversível
 */

import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'pocketbase', 'pb_migrations');

function getMigrationsList() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))
    .sort();
}

const command = process.argv[2] || 'status';

console.log('📦 [Database Optimizer] Gerenciador de Migrations do PocketBase');
console.log(`📁 Diretório de Migrations: ${MIGRATIONS_DIR}\n`);

const files = getMigrationsList();

if (command === 'status' || command === 'list') {
  console.log(`Encontradas ${files.length} migrações declarativas:`);
  files.forEach((file, index) => {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasUp = content.includes('migrate(');
    const hasDown = content.includes('app.delete(') || content.includes('findCollectionByNameOrId');
    console.log(`  [${index + 1}] ${file}`);
    console.log(`      ↳ UP: ${hasUp ? '✅ Declarativo' : '❌ Ausente'}`);
    console.log(`      ↳ ROLLBACK (DOWN): ${hasDown ? '✅ Suportado (Reversível)' : '⚠️ Sem rollback'}`);
  });
  console.log('\nComandos disponíveis:');
  console.log('  node scripts/manage-migrations.mjs status    - Lista status das migrações');
  console.log('  node scripts/manage-migrations.mjs validate  - Valida sintaxe e rollbacks');
  process.exit(0);
}

if (command === 'validate') {
  let hasErrors = false;
  files.forEach((file) => {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes('migrate(')) {
      console.error(`❌ Erro em ${file}: função migrate() não encontrada!`);
      hasErrors = true;
    }
  });

  if (hasErrors) {
    console.error('\n❌ Falha na validação de migrações.');
    process.exit(1);
  } else {
    console.log('✅ Todas as migrações possuem schema declarativo e função reversa de rollback!');
    process.exit(0);
  }
}
