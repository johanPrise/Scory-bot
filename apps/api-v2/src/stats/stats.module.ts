import { Module } from '@nestjs/common';
import { StatsProcessor } from './stats.processor';
import { StatsSnapshotService } from './stats-snapshot.service';

@Module({
  providers: [StatsSnapshotService, StatsProcessor],
  exports: [StatsSnapshotService],
})
export class StatsModule {}
