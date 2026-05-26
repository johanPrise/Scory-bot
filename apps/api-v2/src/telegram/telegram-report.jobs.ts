import { JOB_NAMES } from '../common/queue/queue.constants';

export type TelegramReportPeriod = '7d' | '30d' | 'all';
export type TelegramReportScope = 'summary' | 'scores' | 'activities' | 'teams';

export type TelegramReportRequestedJob = {
  groupId: string;
  chatId: string;
  period: TelegramReportPeriod;
  scope: TelegramReportScope;
};

export const TELEGRAM_REPORT_JOB_NAMES = {
  requested: JOB_NAMES.telegramReportRequested,
} as const;
