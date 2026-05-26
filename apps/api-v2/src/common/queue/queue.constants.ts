export const QUEUE_NAMES = {
  telegramJobs: 'telegram-jobs',
  statsJobs: 'stats-jobs',
} as const;

export const JOB_NAMES = {
  telegramTimerExpired: 'telegram.timer.expired',
  telegramReportRequested: 'telegram.report.requested',
} as const;
