import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramCommandRegistry } from './telegram-command-registry';
import { TelegramClientService } from './telegram-client.service';
import { TelegramJobsProcessor } from './telegram-jobs.processor';
import { TelegramReportService } from './telegram-report.service';
import { TelegramTimerSchedulerService } from './telegram-timer-scheduler.service';
import { TelegramUpdateService } from './telegram-update.service';
import { RankingsModule } from '../rankings/rankings.module';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [RankingsModule, ScoresModule],
  controllers: [TelegramController],
  providers: [
    TelegramCommandRegistry,
    TelegramClientService,
    TelegramReportService,
    TelegramUpdateService,
    TelegramTimerSchedulerService,
    TelegramJobsProcessor,
  ],
  exports: [TelegramCommandRegistry, TelegramUpdateService],
})
export class TelegramModule {}
