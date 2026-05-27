import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import {
  TELEGRAM_SEND_JOB_NAMES,
  TelegramEditMessageTextJob,
  TelegramSendMessageJob,
} from './telegram-send.jobs';

const SEND_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1_500,
  },
  removeOnComplete: 500,
  removeOnFail: 1_000,
} as const;

@Injectable()
export class TelegramSendQueueService {
  constructor(@InjectQueue(QUEUE_NAMES.telegramSend) private readonly queue: Queue) {}

  async sendMessage(input: TelegramSendMessageJob) {
    await this.queue.add(TELEGRAM_SEND_JOB_NAMES.sendMessage, input, SEND_JOB_OPTIONS);
  }

  async editMessageText(input: TelegramEditMessageTextJob) {
    await this.queue.add(TELEGRAM_SEND_JOB_NAMES.editMessageText, input, SEND_JOB_OPTIONS);
  }
}
