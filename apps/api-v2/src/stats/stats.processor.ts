import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { STATS_JOB_NAMES, StatsReportRebuildJob } from './stats-jobs';
import { StatsSnapshotService } from './stats-snapshot.service';

@Processor(QUEUE_NAMES.statsJobs)
export class StatsProcessor extends WorkerHost {
  constructor(private readonly snapshots: StatsSnapshotService) {
    super();
  }

  async process(job: Job<StatsReportRebuildJob>): Promise<void> {
    if (job.name === STATS_JOB_NAMES.reportRebuild) {
      await this.snapshots.rebuildReportSnapshots(job.data.groupId, job.data.periods);
      return;
    }

    throw new Error(`Unsupported stats job: ${job.name}`);
  }
}
