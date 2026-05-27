import { JOB_NAMES } from '../common/queue/queue.constants';
import { TelegramEditMessageTextOptions, TelegramSendMessageOptions } from './telegram.types';

export type TelegramSendMessageJob = {
  chatId: string;
  text: string;
  options?: TelegramSendMessageOptions;
};

export type TelegramEditMessageTextJob = {
  chatId: string;
  messageId: number;
  text: string;
  options?: TelegramEditMessageTextOptions;
};

export const TELEGRAM_SEND_JOB_NAMES = {
  sendMessage: JOB_NAMES.telegramSendMessage,
  editMessageText: JOB_NAMES.telegramEditMessageText,
} as const;
