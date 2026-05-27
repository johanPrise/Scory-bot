import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { TimerStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  TELEGRAM_REPORT_JOB_NAMES,
  TelegramReportRequestedJob,
} from './telegram-report.jobs';
import { reportKeyboard } from './telegram-report-keyboard';
import { TelegramReportService } from './telegram-report.service';
import { TelegramSendQueueService } from './telegram-send-queue.service';
import {
  TELEGRAM_TIMER_JOB_NAMES,
  TelegramTimerExpiredJob,
} from './telegram-timer.jobs';

type TelegramJobData = TelegramTimerExpiredJob | TelegramReportRequestedJob;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

@Processor(QUEUE_NAMES.telegramJobs)
export class TelegramJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramJobsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: TelegramReportService,
    private readonly telegramSend: TelegramSendQueueService,
  ) {
    super();
  }

  async process(job: Job<TelegramJobData>): Promise<void> {
    if (job.name === TELEGRAM_TIMER_JOB_NAMES.expired) {
      await this.processTimerExpired(job as Job<TelegramTimerExpiredJob>);
      return;
    }

    if (job.name === TELEGRAM_REPORT_JOB_NAMES.requested) {
      await this.processReportRequested(job as Job<TelegramReportRequestedJob>);
      return;
    }

    throw new Error(`Unsupported telegram job: ${job.name}`);
  }

  private async processTimerExpired(job: Job<TelegramTimerExpiredJob>) {
    const { timerId, chatId } = job.data;
    const timer = await this.prisma.timer.findUnique({
      where: { id: timerId },
      select: {
        id: true,
        name: true,
        durationMin: true,
        status: true,
      },
    });

    if (!timer) {
      this.logger.warn(`Timer ${timerId} not found for expiration job`);
      return;
    }

    if (timer.status !== TimerStatus.running) {
      this.logger.debug(`Timer ${timerId} already ${timer.status}, expiration skipped`);
      return;
    }

    const updated = await this.prisma.timer.updateMany({
      where: {
        id: timerId,
        status: TimerStatus.running,
      },
      data: {
        status: TimerStatus.expired,
        stoppedAt: new Date(),
      },
    });

    if (updated.count !== 1) return;

    await this.telegramSend.sendMessage({
      chatId,
      text: `⏰ Timer terminé: <b>${escapeHtml(timer.name)}</b>\nDurée: ${timer.durationMin} min`,
      options: { parse_mode: 'HTML' },
    });
  }

  private async processReportRequested(job: Job<TelegramReportRequestedJob>) {
    const report = await this.reports.buildReport(job.data);
    const options = {
      parse_mode: 'HTML' as const,
      reply_markup: reportKeyboard(job.data.scope, job.data.period),
    };

    if (job.data.messageId) {
      await this.telegramSend.editMessageText({
        chatId: job.data.chatId,
        messageId: job.data.messageId,
        text: report,
        options,
      });
      return;
    }

    await this.telegramSend.sendMessage({
      chatId: job.data.chatId,
      text: report,
      options,
    });
  }
}
