import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramCommandRegistry } from './telegram-command-registry';
import { TelegramClientService } from './telegram-client.service';
import { TelegramUpdateService } from './telegram-update.service';
import { RankingsModule } from '../rankings/rankings.module';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [RankingsModule, ScoresModule],
  controllers: [TelegramController],
  providers: [TelegramCommandRegistry, TelegramClientService, TelegramUpdateService],
  exports: [TelegramCommandRegistry, TelegramUpdateService],
})
export class TelegramModule {}
