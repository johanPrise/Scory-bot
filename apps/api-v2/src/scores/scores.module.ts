import { Module } from '@nestjs/common';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';
import { ProjectionsModule } from '../projections/projections.module';
import { RankingsModule } from '../rankings/rankings.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [ProjectionsModule, RankingsModule, StatsModule],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
