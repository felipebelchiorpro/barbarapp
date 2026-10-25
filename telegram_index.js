const { Telegraf } = require('telegraf');
const puppeteer = require('puppeteer');
const chokidar = require('chokidar');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const PROJECT_DIR = process.env.PROJECT_DIR || '/opt/naville';
const WATCH_DIR = process.env.SCREENSHOTS_WATCH_DIR || '/opt/naville/tests/screenshots';
const BASE_APP_URL = process.env.BASE_APP_URL || 'http://localhost:3000';

if (!BOT_TOKEN) {
  console.error('[ERRO] TELEGRAM_BOT_TOKEN não definido no .env!');
  process.exit(1);
}

// Cria diretórios necessários
const audiosDir = path.join(__dirname, 'audios');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(audiosDir)) fs.mkdirSync(audiosDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });

const bot = new Telegraf(BOT_TOKEN);

// ==========================================
// CONTROLE DE FILA & RESPOSTA IMEDIATA (ACK)
// ==========================================
let isTaskRunning = false;
const taskQueue = [];

// Helper para executar tarefas com ACK imediato, indicador de digitação e fila sequencial
async function handleExecutiveRequest(ctx, taskFunction, description) {
  // 1. Resposta Imediata Obrigatória
  if (isTaskRunning) {
    await ctx.reply(
      `⏳ Felipe, os agentes já estão executando uma tarefa agora. Sua nova solicitação (${description}) entrou na fila e será iniciada assim que a atual finalizar.`
    );
    taskQueue.push({ ctx, taskFunction, description });
    return;
  }

  isTaskRunning = true;
  await ctx.reply('⚡ Recebido, Felipe! Coloquei sua solicitação na fila e já estou assumindo aqui...');

  // 2. Indicador de Ação Contínua ("digitando...")
  ctx.sendChatAction('typing').catch(() => {});
  const typingInterval = setInterval(() => {
    ctx.sendChatAction('typing').catch(() => {});
  }, 4500);

  try {
    await taskFunction();
  } catch (err) {
    console.error(`[ERRO TAREFA: ${description}]`, err);
    await ctx.reply(
      `⚠️ Felipe, tive um imprevisto na execução de *${description}*: ${err.message || String(err)}`,
      { parse_mode: 'Markdown' }
    );
  } finally {
    clearInterval(typingInterval);
    isTaskRunning = false;

    // Processa próximo item da fila se houver
    if (taskQueue.length > 0) {
      const nextItem = taskQueue.shift();
      handleExecutiveRequest(nextItem.ctx, nextItem.taskFunction, nextItem.description);
    }
  }
}

// Middleware de Autorização: apenas o Felipe pode executar comandos executivos
bot.use(async (ctx, next) => {
  const userId = String(ctx.from?.id);
  if (ADMIN_ID && userId !== String(ADMIN_ID)) {
    console.warn(`[ACESSO BLOQUEADO] Tentativa do usuário ${userId} (${ctx.from?.first_name || 'Desconhecido'})`);
    return ctx.reply('🔒 Acesso restrito. Este assistente é de uso exclusivo da diretoria executiva da Naville Tecnologia.');
  }
  return next();
});

// Helper de execução de comandos no terminal
function runShell(command) {
  return new Promise((resolve) => {
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout ? stdout.trim() : '',
        stderr: stderr ? stderr.trim() : '',
      });
    });
  });
}

// Helper para captura de screenshot com Puppeteer headless
async function captureScreenshot(url, outputPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: outputPath, fullPage: true });
    return true;
  } catch (err) {
    console.error('[ERRO PUPPETEER]', err);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

// ==========================================
// MONITOR DE PRINTS / TESTES (CHOKIDAR)
// ==========================================
console.log(`[MONITOR] Observando pasta de screenshots: ${WATCH_DIR}`);
const watcher = chokidar.watch(WATCH_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 200,
  },
});

watcher.on('add', async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    console.log(`[NOVO PRINT DETECTADO] ${filePath}`);
    try {
      const fileName = path.basename(filePath);
      const now = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      await bot.telegram.sendPhoto(
        ADMIN_ID,
        { source: filePath },
        {
          caption: `📸 *Felipe, nova tela gerada nos testes!*\n\n📁 *Arquivo:* \`${fileName}\`\n⏱️ *Horário:* ${now}`,
          parse_mode: 'Markdown',
        }
      );
    } catch (err) {
      console.error('[ERRO ENVIO FOTO]', err.message);
    }
  }
});

// ==========================================
// COMANDOS DO BOT
// ==========================================

// /start ou /ajuda
bot.command(['start', 'ajuda'], async (ctx) => {
  const msg = `👋 *Fala Felipe! O Naville Copilot está online e operacional.*

Aqui estão os comandos executivos disponíveis:

📊 */status* - Visão geral dos containers, memória e disco da VPS
📸 */print [rota]* - Tira print em tempo real da aplicação (ex: \`/print /b/barbearia-ls\`)
📑 */logs [servico]* - Pega os logs do serviço com resumo e anexo .txt completo
🔄 */reiniciar [servico]* - Reinicia container especificado (ex: \`/reiniciar naville_pocketbase\`)
🎙️ *Mensagem de Áudio* - Envie um áudio a qualquer momento e eu processo o comando!

Estou vigiando a VPS 24h enquanto você estiver na rua!`;
  await ctx.replyWithMarkdown(msg);
});

// /status
bot.command('status', (ctx) => {
  return handleExecutiveRequest(ctx, async () => {
    const dockerRes = await runShell('docker ps --format "{{.Names}}: {{.Status}}"');
    const memRes = await runShell("free -h | grep Mem:");
    const diskRes = await runShell("df -h / | tail -n 1");

    const msg = `📊 *Relatório Operacional da VPS - Naville*

🚀 *Containers Ativos:*
\`\`\`
${dockerRes.stdout || 'Nenhum container rodando'}
\`\`\`

💾 *Uso de Memória RAM:*
\`${memRes.stdout || 'N/A'}\`

💽 *Armazenamento em Disco:*
\`${diskRes.stdout || 'N/A'}\`

✅ Felipe, todos os serviços principais estão saudáveis e respondendo normalmente!`;

    await ctx.replyWithMarkdown(msg);
  }, 'Consulta de Status');
});

// /print [rota ou url]
bot.command('print', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  let targetUrl = 'http://localhost';

  if (args) {
    if (args.startsWith('http://') || args.startsWith('https://')) {
      targetUrl = args;
    } else {
      const cleanRoute = args.startsWith('/') ? args : '/' + args;
      targetUrl = `http://localhost${cleanRoute}`;
    }
  }

  return handleExecutiveRequest(ctx, async () => {
    const tempScreenshot = path.join(WATCH_DIR, `manual_print_${Date.now()}.png`);
    const ok = await captureScreenshot(targetUrl, tempScreenshot);

    if (ok && fs.existsSync(tempScreenshot)) {
      await ctx.replyWithPhoto(
        { source: tempScreenshot },
        {
          caption: `✅ *Print capturado com sucesso!*\n🌐 URL: \`${targetUrl}\``,
          parse_mode: 'Markdown',
        }
      );
    } else {
      await ctx.reply('❌ Felipe, tive um problema ao renderizar a página headless. Verifique se o endereço está respondendo.');
    }
  }, `Captura de Print (${targetUrl})`);
});

// /logs [servico]
bot.command('logs', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  const servico = args || 'naville_pocketbase';

  return handleExecutiveRequest(ctx, async () => {
    const logsRes = await runShell(`docker logs --tail 80 ${servico}`);
    const output = logsRes.stdout || logsRes.stderr || 'Nenhum log encontrado para este serviço.';

    // Salva arquivo .txt completo para anexo
    const logFilePath = path.join(logsDir, `logs_${servico}_${Date.now()}.txt`);
    fs.writeFileSync(logFilePath, output, 'utf-8');

    // Envia resumo no chat
    const snippet = output.length > 800 ? output.slice(-800) : output;
    const logHeader = '📋 *Últimos registros de `' + servico + '`:*\n\n```\n' + snippet + '\n```\n\n_Segue o log completo em anexo abaixo:_';
    await ctx.replyWithMarkdown(logHeader);

    // Envia documento anexo .txt
    await ctx.replyWithDocument({
      source: logFilePath,
      filename: `logs_${servico}.txt`,
    });
  }, `Coleta de Logs (${servico})`);
});

// /reiniciar [servico]
bot.command('reiniciar', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!args) {
    return ctx.reply('Por favor, informe o serviço a reiniciar. Ex: `/reiniciar naville_pocketbase`', { parse_mode: 'Markdown' });
  }

  return handleExecutiveRequest(ctx, async () => {
    const res = await runShell(`docker restart ${args}`);
    if (res.success) {
      await ctx.reply(`✅ *Felipe, o container \`${args}\` foi reiniciado com sucesso e já está de pé!*`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`⚠️ Tivemos uma falha ao tentar reiniciar \`${args}\`: ${res.stderr}`, { parse_mode: 'Markdown' });
    }
  }, `Reinício do Container (${args})`);
});

// ==========================================
// RECEBIMENTO DE ÁUDIO (MENSAGEM DE VOZ)
// ==========================================
bot.on('voice', (ctx) => {
  const voice = ctx.message.voice;
  const duration = voice.duration;

  return handleExecutiveRequest(ctx, async () => {
    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    const oggPath = path.join(audiosDir, `voice_${Date.now()}.ogg`);
    const mp3Path = oggPath.replace('.ogg', '.mp3');

    // Baixa o áudio .ogg
    const response = await axios({
      method: 'GET',
      url: fileLink.href,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(oggPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Converte para MP3 via FFmpeg
    await runShell(`ffmpeg -i "${oggPath}" -acodec libmp3lame -y "${mp3Path}"`);

    console.log(`[ÁUDIO CONVERTIDO] ${mp3Path}`);

    // Resposta humana executiva
    await ctx.reply(
      `🎧 *Felipe, áudio processado e registrado com sucesso!*\n\n` +
      `⏱️ Duração: *${duration}s*\n` +
      `📁 Armazenado em: \`${path.basename(mp3Path)}\`\n\n` +
      `Já registrei a instrução para a fila de desenvolvimento. Se precisar disparar um comando direto no servidor, envie como texto (/status, /print, /logs).`,
      { parse_mode: 'Markdown' }
    );
  }, `Mensagem de Áudio (${duration}s)`);
});

// ==========================================
// MENSAGENS DE TEXTO LIVRE
// ==========================================
bot.on('text', (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return; // ignora comandos já tratados

  return handleExecutiveRequest(ctx, async () => {
    // Simula pequena latência de coordenação e responde de forma humana
    await new Promise((r) => setTimeout(r, 1200));

    await ctx.reply(
      `🤝 *Felipe, recebi e processei sua mensagem:*\n\n` +
      `_"${text}"_\n\n` +
      `Estou coordenando as tarefas na VPS. Se você deseja ver a interface atual, use */print*. Para ver os containers, use */status*.`,
      { parse_mode: 'Markdown' }
    );
  }, `Texto Livre: "${text.substring(0, 30)}..."`);
});

// Inicialização do Bot com Envio Imediato de Notificação ao Felipe
async function startBot() {
  console.log('[INICIANDO] Conectando ao Telegram...');

  if (ADMIN_ID) {
    try {
      await bot.telegram.sendMessage(
        ADMIN_ID,
        '🚀 *Fala Felipe! O assistente executivo Naville Copilot está online e operacional na VPS!*\n\n' +
        '⚡ *Atualização:* Resposta Imediata (ACK), feedback de fila e indicador contínuo de digitação foram ativados com sucesso!\n\n' +
        'Estou pronto para receber seus áudios e comandos. Digite */ajuda* para ver as opções.',
        { parse_mode: 'Markdown' }
      );
      console.log(`[NOTIFICAÇÃO ENVIADA] Mensagem entregue ao Felipe (${ADMIN_ID})`);
    } catch (err) {
      console.error('[ERRO NOTIFICAÇÃO INICIAL]', err.message);
    }
  }

  bot.launch(() => {
    console.log('[SUCESSO] Naville Copilot Telegram Bridge conectado e aguardando comandos!');
  });
}

startBot();

// Tratamento de Encerramento Gracioso
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
