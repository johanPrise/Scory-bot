export const QUEUE_NAMES = {
  telegramJobs: 'telegram-jobs',
  telegramSend: 'telegram-send',
  statsJobs: 'stats-jobs',
} as const;

export const JOB_NAMES = {
  telegramTimerExpired: 'telegram.timer.expired',
  telegramReportRequested: 'telegram.report.requested',
  telegramSendMessage: 'telegram.send.message',
  telegramEditMessageText: 'telegram.edit.message_text',
} as const;
