import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from '../runtime-env';
import { TelegramChatAction, TelegramSendMessageOptions } from './telegram.types';

@Injectable()
export class TelegramClientService {
  readonly sentMessages: Array<{
    method: 'sendMessage' | 'editMessageText' | 'answerCallbackQuery';
    chatId: string;
    text: string;
  }> = [];
  private readonly dryRunStorage = new AsyncLocalStorage<boolean>();
  private botUsername: string | null = env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '') || null;

  get dryRun() {
    const requestDryRun = this.dryRunStorage.getStore();
    if (requestDryRun !== undefined) return requestDryRun;
    return env.TELEGRAM_DRY_RUN || !env.TELEGRAM_BOT_TOKEN;
  }

  runWithDryRun<T>(callback: () => Promise<T>) {
    return this.dryRunStorage.run(true, callback);
  }

  async sendMessage(chatId: string | number, text: string, options: TelegramSendMessageOptions = {}) {
    const normalizedChatId = String(chatId);
    this.sentMessages.push({ method: 'sendMessage', chatId: normalizedChatId, text });

    if (this.dryRun) {
      return { ok: true, dryRun: true };
    }

    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: normalizedChatId,
        text,
        ...options,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
    }

    return response.json();
  }

  // Indicateur "en train d'écrire..." envoyé en fire-and-forget avant un traitement.
  // Purement cosmétique : n'echoue jamais bruyamment et n'est pas enregistre dans sentMessages.
  async sendChatAction(chatId: string | number, action: TelegramChatAction = 'typing') {
    if (this.dryRun) {
      return { ok: true, dryRun: true };
    }

    try {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(chatId), action }),
      });
    } catch {
      // Un indicateur de saisie rate ne doit jamais impacter la commande.
    }

    return { ok: true };
  }

  async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    options: TelegramSendMessageOptions = {},
  ) {
    const normalizedChatId = String(chatId);
    this.sentMessages.push({ method: 'editMessageText', chatId: normalizedChatId, text });

    if (this.dryRun) {
      return { ok: true, dryRun: true };
    }

    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: normalizedChatId,
        message_id: messageId,
        text,
        ...options,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Telegram editMessageText failed: ${response.status} ${body}`);
    }

    return response.json();
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string) {
    this.sentMessages.push({ method: 'answerCallbackQuery', chatId: '', text: text || '' });

    if (this.dryRun) {
      return { ok: true, dryRun: true };
    }

    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        ...(text && { text }),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Telegram answerCallbackQuery failed: ${response.status} ${body}`);
    }

    return response.json();
  }

  async getBotUsername() {
    if (this.botUsername) return this.botUsername;
    if (!env.TELEGRAM_BOT_TOKEN) return null;

    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Telegram getMe failed: ${response.status} ${body}`);
    }

    const body = await response.json() as { ok?: boolean; result?: { username?: string } };
    this.botUsername = body.result?.username?.replace(/^@/, '') || null;
    return this.botUsername;
  }

  drainSentMessages() {
    const messages = [...this.sentMessages];
    this.sentMessages.length = 0;
    return messages;
  }
}
