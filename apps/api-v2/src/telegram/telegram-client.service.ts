import { Injectable } from '@nestjs/common';
import { env } from '../runtime-env';
import { TelegramSendMessageOptions } from './telegram.types';

@Injectable()
export class TelegramClientService {
  readonly sentMessages: Array<{ method: 'sendMessage'; chatId: string; text: string }> = [];

  get dryRun() {
    return env.TELEGRAM_DRY_RUN || !env.TELEGRAM_BOT_TOKEN;
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

  drainSentMessages() {
    const messages = [...this.sentMessages];
    this.sentMessages.length = 0;
    return messages;
  }
}
