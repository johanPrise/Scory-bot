import { Module } from '@nestjs/common';
import { RankingsService } from './rankings.service';

@Module({
  providers: [RankingsService],
  exports: [RankingsService],
})
export class RankingsModule {}
