import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/config/bot.js');
let code = fs.readFileSync(file, 'utf8');

const replacement = `// Vérifier le token du bot
let token = process.env.TELEGRAM_BOT_TOKEN;

if (env !== 'production') {
  if (process.env.DEV_TELEGRAM_BOT_TOKEN) {
    token = process.env.DEV_TELEGRAM_BOT_TOKEN;
    console.log('🤖 Mode Développement : Utilisation de DEV_TELEGRAM_BOT_TOKEN (Bot Fantôme)');
  } else {
    console.warn('⚠️ ATTENTION : DEV_TELEGRAM_BOT_TOKEN non défini dans le fichier .env');
    console.warn('⚠️ Polling sur le bot principal : cela DÉSACTIVERA le webhook en production pour vos utilisateurs !');
  }
}

if (!token) {
  const errorMsg = '❌ ERREUR: Aucun Token Telegram (TELEGRAM_BOT_TOKEN ou DEV_TELEGRAM_BOT_TOKEN) trouvé dans .env';
  console.error(errorMsg);
  logCriticalError(new Error(errorMsg), { context: 'Initialisation du bot' });
  process.exit(1);
}`;

code = code.replace(/\/\/ Vérifier le token du bot[\s\S]*?process\.exit\(1\);\n\}/, replacement);
fs.writeFileSync(file, code);
console.log('Done refactoring bot token');
