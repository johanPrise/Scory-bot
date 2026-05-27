import { Injectable } from '@nestjs/common';
import { Prisma, ScoreContext, ScoreStatus, StatsSnapshotPeriod, StatsSnapshotScope } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { PrismaService } from '../common/prisma/prisma.service';
import { STATS_JOB_NAMES } from './stats-jobs';

const REPORT_SNAPSHOT_TTL_MS = 10 * 60 * 1000;

export type ReportSnapshotPayload = {
  group: { title: string };
  period: StatsSnapshotPeriod;
  totals: {
    scoreCount: number;
    pointTotal: number;
    activityCount: number;
    participantCount: number;
  };
  previousScoreCount: number | null;
  topPlayers: Array<{ rank: number; name: string; points: number }>;
  topActivities: Array<{ rank: number; name: string; scoreCount: number }>;
  topTeams: Array<{ rank: number; name: string; points: number }>;
  recentScore: { target: string; activity: string; value: number } | null;
};

function displayName(user: { telegramUser?: string | null; username?: string | null; firstName?: string | null; lastName?: string | null }) {
  return user.telegramUser || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Joueur';
}

@Injectable()
export class StatsSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.statsJobs) private readonly statsQueue: Queue,
  ) {}

  async enqueueReportRebuild(groupId: string) {
    await this.statsQueue.add(
      STATS_JOB_NAMES.reportRebuild,
      {
        groupId,
        periods: [
          StatsSnapshotPeriod.seven_days,
          StatsSnapshotPeriod.thirty_days,
          StatsSnapshotPeriod.all,
        ],
      },
      {
        jobId: `stats-report-rebuild-${groupId}`,
        removeOnComplete: true,
        removeOnFail: 500,
      },
    );
  }

  async getFreshReportSnapshot(groupId: string, period: StatsSnapshotPeriod): Promise<ReportSnapshotPayload | null> {
    const snapshot = await this.prisma.statsSnapshot.findUnique({
      where: {
        groupId_scope_period: {
          groupId,
          scope: StatsSnapshotScope.report,
          period,
        },
      },
    });

    if (!snapshot || (snapshot.expiresAt && snapshot.expiresAt.getTime() <= Date.now())) return null;
    return snapshot.payload as unknown as ReportSnapshotPayload;
  }

  async rebuildReportSnapshots(groupId: string, periods: StatsSnapshotPeriod[] = [
    StatsSnapshotPeriod.seven_days,
    StatsSnapshotPeriod.thirty_days,
    StatsSnapshotPeriod.all,
  ]) {
    await Promise.all(periods.map(period => this.rebuildReportSnapshot(groupId, period)));
  }

  async rebuildReportSnapshot(groupId: string, period: StatsSnapshotPeriod) {
    const payload = await this.buildReportPayload(groupId, period);
    await this.prisma.statsSnapshot.upsert({
      where: {
        groupId_scope_period: {
          groupId,
          scope: StatsSnapshotScope.report,
          period,
        },
      },
      update: {
        payload: payload as unknown as Prisma.JsonObject,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + REPORT_SNAPSHOT_TTL_MS),
      },
      create: {
        groupId,
        scope: StatsSnapshotScope.report,
        period,
        payload: payload as unknown as Prisma.JsonObject,
        expiresAt: new Date(Date.now() + REPORT_SNAPSHOT_TTL_MS),
      },
    });
    return payload;
  }

  private async buildReportPayload(groupId: string, period: StatsSnapshotPeriod): Promise<ReportSnapshotPayload> {
    const [group, totals, previousScoreCount, topPlayers, topActivities, topTeams, recentScore] = await Promise.all([
      this.prisma.telegramGroup.findUnique({
        where: { id: groupId },
        select: { title: true },
      }),
      this.getTotals(groupId, period),
      this.getPreviousScoreCount(groupId, period),
      this.getTopPlayers(groupId, period),
      this.getTopActivities(groupId, period),
      this.getTopTeams(groupId, period),
      this.getRecentScore(groupId, period),
    ]);

    return {
      group: { title: group?.title || 'Groupe' },
      period,
      totals,
      previousScoreCount,
      topPlayers,
      topActivities,
      topTeams,
      recentScore,
    };
  }

  private async getTotals(groupId: string, period: StatsSnapshotPeriod) {
    const where = this.scoreWhere(groupId, period);
    const [scoreCount, pointTotal, activityRows, participantRows] = await Promise.all([
      this.prisma.score.count({ where }),
      this.prisma.score.aggregate({ where, _sum: { value: true } }),
      this.prisma.score.groupBy({ by: ['activityId'], where }),
      this.prisma.score.groupBy({
        by: ['userId'],
        where: { ...where, userId: { not: null } },
      }),
    ]);

    return {
      scoreCount,
      pointTotal: pointTotal._sum.value || 0,
      activityCount: activityRows.length,
      participantCount: participantRows.length,
    };
  }

  private async getPreviousScoreCount(groupId: string, period: StatsSnapshotPeriod) {
    const range = this.periodRange(period);
    if (!range?.previousStart) return null;

    return this.prisma.score.count({
      where: {
        groupId,
        status: ScoreStatus.approved,
        createdAt: {
          gte: range.previousStart,
          lt: range.start,
        },
      },
    });
  }

  private async getTopPlayers(groupId: string, period: StatsSnapshotPeriod) {
    const grouped = await this.prisma.score.groupBy({
      by: ['userId'],
      where: {
        ...this.scoreWhere(groupId, period),
        context: ScoreContext.individual,
        userId: { not: null },
      },
      _sum: { value: true },
      orderBy: { _sum: { value: 'desc' } },
      take: 3,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map(row => row.userId).filter(Boolean) as string[] } },
      select: { id: true, firstName: true, lastName: true, telegramUser: true, username: true },
    });
    const names = new Map(users.map(user => [user.id, displayName(user)]));
    return grouped.map((row, index) => ({
      rank: index + 1,
      name: names.get(row.userId || '') || 'Joueur',
      points: row._sum.value || 0,
    }));
  }

  private async getTopActivities(groupId: string, period: StatsSnapshotPeriod) {
    const grouped = await this.prisma.score.groupBy({
      by: ['activityId'],
      where: this.scoreWhere(groupId, period),
      _count: { _all: true },
      orderBy: { _count: { activityId: 'desc' } },
      take: 3,
    });
    const activities = await this.prisma.activity.findMany({
      where: { id: { in: grouped.map(row => row.activityId) } },
      select: { id: true, name: true },
    });
    const names = new Map(activities.map(activity => [activity.id, activity.name]));
    return grouped.map((row, index) => ({
      rank: index + 1,
      name: names.get(row.activityId) || 'Activité',
      scoreCount: row._count._all,
    }));
  }

  private async getTopTeams(groupId: string, period: StatsSnapshotPeriod) {
    const grouped = await this.prisma.score.groupBy({
      by: ['teamId'],
      where: {
        ...this.scoreWhere(groupId, period),
        context: ScoreContext.team,
        teamId: { not: null },
      },
      _sum: { value: true },
      orderBy: { _sum: { value: 'desc' } },
      take: 3,
    });
    const teams = await this.prisma.team.findMany({
      where: { id: { in: grouped.map(row => row.teamId).filter(Boolean) as string[] } },
      select: { id: true, name: true },
    });
    const names = new Map(teams.map(team => [team.id, team.name]));
    return grouped.map((row, index) => ({
      rank: index + 1,
      name: names.get(row.teamId || '') || 'Équipe',
      points: row._sum.value || 0,
    }));
  }

  private async getRecentScore(groupId: string, period: StatsSnapshotPeriod) {
    const score = await this.prisma.score.findFirst({
      where: this.scoreWhere(groupId, period),
      orderBy: { createdAt: 'desc' },
      select: {
        value: true,
        activity: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, telegramUser: true, username: true } },
        team: { select: { name: true } },
      },
    });

    if (!score) return null;
    return {
      value: score.value,
      activity: score.activity.name,
      target: score.user ? displayName(score.user) : score.team?.name || 'Joueur',
    };
  }

  private scoreWhere(groupId: string, period: StatsSnapshotPeriod) {
    const range = this.periodRange(period);
    return {
      groupId,
      status: ScoreStatus.approved,
      ...(range && { createdAt: { gte: range.start } }),
    };
  }

  private periodRange(period: StatsSnapshotPeriod) {
    if (period === StatsSnapshotPeriod.all) return null;

    const days = period === StatsSnapshotPeriod.seven_days ? 7 : 30;
    const durationMs = days * 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() - durationMs);
    const previousStart = new Date(start.getTime() - durationMs);
    return { start, previousStart };
  }
}
