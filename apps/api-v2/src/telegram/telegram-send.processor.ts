import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { TelegramClientService } from './telegram-client.service';
import {
  TELEGRAM_SEND_JOB_NAMES,
  TelegramEditMessageTextJob,
  TelegramSendMessageJob,
} from './telegram-send.jobs';

type TelegramSendJobData = TelegramSendMessageJob | TelegramEditMessageTextJob;

@Processor(QUEUE_NAMES.telegramSend)
export class TelegramSendProcessor extends WorkerHost {
  constructor(private readonly telegram: TelegramClientService) {
    super();
  }

  async process(job: Job<TelegramSendJobData>): Promise<void> {
    if (job.name === TELEGRAM_SEND_JOB_NAMES.sendMessage) {
      const data = job.data as TelegramSendMessageJob;
      await this.telegram.sendMessage(data.chatId, data.text, data.options);
      return;
    }

    if (job.name === TELEGRAM_SEND_JOB_NAMES.editMessageText) {
      const data = job.data as TelegramEditMessageTextJob;
      await this.telegram.editMessageText(data.chatId, data.messageId, data.text, data.options);
      return;
    }

    throw new Error(`Unsupported telegram send job: ${job.name}`);
  }
}
