export type TelegramUserPayload = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramChatPayload = {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramMessagePayload = {
  message_id: number;
  chat: TelegramChatPayload;
  from?: TelegramUserPayload;
  text?: string;
};

export type TelegramCallbackQueryPayload = {
  id: string;
  from: TelegramUserPayload;
  message?: TelegramMessagePayload;
  data?: string;
};

export type TelegramUpdatePayload = {
  update_id?: number;
  message?: TelegramMessagePayload;
  edited_message?: TelegramMessagePayload;
  callback_query?: TelegramCallbackQueryPayload;
};

export type TelegramSendMessageOptions = {
  parse_mode?: 'HTML' | 'Markdown';
  reply_markup?: Record<string, unknown>;
};

export type TelegramCommandResult = {
  ok: boolean;
  handled: boolean;
  command?: string;
  chatId?: string;
  dryRun: boolean;
  messages: Array<{
    method: 'sendMessage';
    chatId: string;
    text: string;
  }>;
};
