import { StatsSnapshotPeriod } from '@prisma/client';

export const STATS_JOB_NAMES = {
  reportRebuild: 'stats.report.rebuild',
} as const;

export type StatsReportRebuildJob = {
  groupId: string;
  periods?: StatsSnapshotPeriod[];
};
