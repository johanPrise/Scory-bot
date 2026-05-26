import { JOB_NAMES } from '../common/queue/queue.constants';

export type TelegramTimerExpiredJob = {
  timerId: string;
  chatId: string;
};

export const TELEGRAM_TIMER_JOB_NAMES = {
  expired: JOB_NAMES.telegramTimerExpired,
} as const;

export function telegramTimerJobId(timerId: string) {
  return `telegram-timer-expired-${timerId}`;
}
