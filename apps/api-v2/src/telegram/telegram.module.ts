import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramCommandRegistry } from './telegram-command-registry';
import { TelegramClientService } from './telegram-client.service';
import { TelegramJobsProcessor } from './telegram-jobs.processor';
import { TelegramReportService } from './telegram-report.service';
import { TelegramSendProcessor } from './telegram-send.processor';
import { TelegramSendQueueService } from './telegram-send-queue.service';
import { TelegramTimerSchedulerService } from './telegram-timer-scheduler.service';
import { TelegramUpdateService } from './telegram-update.service';
import { RankingsModule } from '../rankings/rankings.module';
import { ScoresModule } from '../scores/scores.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [RankingsModule, ScoresModule, StatsModule],
  controllers: [TelegramController],
  providers: [
    TelegramCommandRegistry,
    TelegramClientService,
    TelegramReportService,
    TelegramSendQueueService,
    TelegramUpdateService,
    TelegramTimerSchedulerService,
    TelegramJobsProcessor,
    TelegramSendProcessor,
  ],
  exports: [TelegramCommandRegistry, TelegramUpdateService],
})
export class TelegramModule {}
