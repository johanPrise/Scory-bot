import { Module } from '@nestjs/common';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';
import { ProjectionsModule } from '../projections/projections.module';
import { RankingsModule } from '../rankings/rankings.module';

@Module({
  imports: [ProjectionsModule, RankingsModule],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
