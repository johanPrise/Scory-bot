import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { TimerStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramClientService } from './telegram-client.service';
import {
  TELEGRAM_TIMER_JOB_NAMES,
  TelegramTimerExpiredJob,
} from './telegram-timer.jobs';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

@Processor(QUEUE_NAMES.telegramJobs)
export class TelegramTimerProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramTimerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramClientService,
  ) {
    super();
  }

  async process(job: Job<TelegramTimerExpiredJob>): Promise<void> {
    if (job.name !== TELEGRAM_TIMER_JOB_NAMES.expired) {
      throw new Error(`Unsupported telegram job: ${job.name}`);
    }

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

    await this.telegram.sendMessage(
      chatId,
      `⏰ Timer terminé: <b>${escapeHtml(timer.name)}</b>\nDurée: ${timer.durationMin} min`,
      { parse_mode: 'HTML' },
    );
  }
}
