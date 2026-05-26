import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { TimerStatus } from '@prisma/client';
import type { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../common/queue/queue.constants';
import { PrismaService } from '../common/prisma/prisma.service';
import { telegramTimerJobId } from './telegram-timer.jobs';

@Injectable()
export class TelegramTimerSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramTimerSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.telegramJobs) private readonly telegramQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    const timers = await this.prisma.timer.findMany({
      where: { status: TimerStatus.running },
      select: {
        id: true,
        endsAt: true,
        group: { select: { chatId: true } },
      },
    });

    await Promise.all(timers.map(timer => this.scheduleTimer({
      timerId: timer.id,
      chatId: timer.group.chatId,
      endsAt: timer.endsAt,
    })));

    if (timers.length > 0) {
      this.logger.log(`Rescheduled ${timers.length} running timer job(s)`);
    }
  }

  async scheduleTimer(input: { timerId: string; chatId: string | number; endsAt: Date }) {
    await this.cancelTimer(input.timerId);

    await this.telegramQueue.add(
      JOB_NAMES.telegramTimerExpired,
      {
        timerId: input.timerId,
        chatId: String(input.chatId),
      },
      {
        delay: Math.max(0, input.endsAt.getTime() - Date.now()),
        jobId: telegramTimerJobId(input.timerId),
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  async cancelTimer(timerId: string) {
    const job = await this.telegramQueue.getJob(telegramTimerJobId(timerId));
    if (!job) return;

    try {
      await job.remove();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Could not remove timer job ${timerId}: ${message}`);
    }
  }
}
