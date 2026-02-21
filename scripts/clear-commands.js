#!/usr/bin/env node

/**
 * Script pour purger toutes les commandes Telegram en cache
 * et réenregistrer uniquement les commandes actuelles.
 * 
 * Usage: node scripts/clear-commands.js
 */

import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { TELEGRAM_CONFIG } from '../src/config/telegram.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN manquant dans .env');
  process.exit(1);
}

const bot = new TelegramBot(token);

async function clearAndSetCommands() {
  try {
    const botInfo = await bot.getMe();
    console.log(`🤖 Bot: @${botInfo.username}\n`);

    // 1. Supprimer les commandes pour TOUS les scopes possibles
    const scopes = [
      { type: 'default' },
      { type: 'all_private_chats' },
      { type: 'all_group_chats' },
      { type: 'all_chat_administrators' },
    ];

    console.log('🧹 Suppression des anciennes commandes...');
    for (const scope of scopes) {
      try {
        await bot.deleteMyCommands({ scope });
        console.log(`   ✅ Scope "${scope.type}" nettoyé`);
      } catch (e) {
        console.log(`   ⚠️  Scope "${scope.type}": ${e.message}`);
      }
    }

    // 2. Réenregistrer les commandes actuelles
    const commands = TELEGRAM_CONFIG.COMMANDS;
    console.log(`\n📝 Enregistrement de ${commands.length} commandes...`);
    
    await bot.setMyCommands(commands);
    await bot.setMyCommands(commands, { scope: { type: 'all_private_chats' } });

    console.log('\n✅ Commandes enregistrées :');
    commands.forEach(cmd => {
      console.log(`   /${cmd.command} — ${cmd.description}`);
    });

    console.log('\n🎉 Terminé ! Les utilisateurs verront les nouvelles commandes dans le menu.');
    console.log('💡 Si un utilisateur voit encore les anciennes, il doit fermer et rouvrir le chat.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

clearAndSetCommands();
