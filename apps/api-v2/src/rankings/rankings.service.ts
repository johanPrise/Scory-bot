import { Injectable } from '@nestjs/common';
import { Prisma, RankingPeriod, RankingScope, ScoreContext, ScoreStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

export type RankingItem = {
  id: string;
  name: string;
  totalScore: number;
  normalizedTotal: number;
  scoreCount: number;
  rank: number;
};

export type RankingSnapshotResult = {
  items: RankingItem[];
  generatedAt: Date;
  stale: boolean;
};

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot(input: {
    groupId: string;
    scope: RankingScope;
    period: RankingPeriod;
    activityId?: string | null;
  }): Promise<RankingSnapshotResult> {
    const activityKey = input.activityId || '';
    const existing = await this.prisma.rankingSnapshot.findUnique({
      where: {
        groupId_scope_period_activityId: {
          groupId: input.groupId,
          scope: input.scope,
          period: input.period,
          activityId: activityKey,
        },
      },
    });

    const isFresh = existing && Date.now() - existing.generatedAt.getTime() < SNAPSHOT_TTL_MS;
    if (existing && isFresh) {
      return {
        items: existing.payload as unknown as RankingItem[],
        generatedAt: existing.generatedAt,
        stale: false,
      };
    }

    const items = await this.rebuildSnapshotItems(input);
    const saved = await this.prisma.rankingSnapshot.upsert({
      where: {
        groupId_scope_period_activityId: {
          groupId: input.groupId,
          scope: input.scope,
          period: input.period,
          activityId: activityKey,
        },
      },
      update: {
        payload: items as unknown as Prisma.JsonArray,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + SNAPSHOT_TTL_MS),
      },
      create: {
        groupId: input.groupId,
        scope: input.scope,
        period: input.period,
        activityId: activityKey,
        payload: items as unknown as Prisma.JsonArray,
        expiresAt: new Date(Date.now() + SNAPSHOT_TTL_MS),
      },
    });

    return { items, generatedAt: saved.generatedAt, stale: Boolean(existing) };
  }

  async rebuildGroupSnapshots(groupId: string) {
    await Promise.all([
      this.getSnapshot({ groupId, scope: RankingScope.individual, period: RankingPeriod.month }),
      this.getSnapshot({ groupId, scope: RankingScope.team, period: RankingPeriod.month }),
      this.getSnapshot({ groupId, scope: RankingScope.individual, period: RankingPeriod.all }),
      this.getSnapshot({ groupId, scope: RankingScope.team, period: RankingPeriod.all }),
    ]);
  }

  private async rebuildSnapshotItems(input: {
    groupId: string;
    scope: RankingScope;
    period: RankingPeriod;
    activityId?: string | null;
  }): Promise<RankingItem[]> {
    const startDate = this.periodStart(input.period);
    const context = input.scope === RankingScope.team ? ScoreContext.team : ScoreContext.individual;
    const targetField = input.scope === RankingScope.team ? 'teamId' : 'userId';

    const grouped = await this.prisma.score.groupBy({
      by: [targetField],
      where: {
        groupId: input.groupId,
        context,
        status: ScoreStatus.approved,
        ...(input.activityId && { activityId: input.activityId }),
        ...(startDate && { createdAt: { gte: startDate } }),
        [targetField]: { not: null },
      },
      _sum: { value: true, normalizedScore: true },
      _count: { _all: true },
      orderBy: { _sum: { normalizedScore: 'desc' } },
      take: 100,
    });

    if (input.scope === RankingScope.team) {
      const ids = grouped.map(row => row.teamId).filter(Boolean) as string[];
      const teams = await this.prisma.team.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      const names = new Map(teams.map(team => [team.id, team.name]));
      return grouped.map((row, index) => ({
        id: row.teamId || '',
        name: names.get(row.teamId || '') || 'Equipe',
        totalScore: row._sum.value || 0,
        normalizedTotal: row._sum.normalizedScore || 0,
        scoreCount: row._count._all,
        rank: index + 1,
      }));
    }

    const ids = grouped.map(row => row.userId).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, telegramUser: true, username: true },
    });
    const names = new Map(users.map(user => [
      user.id,
      user.telegramUser || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Joueur',
    ]));

    return grouped.map((row, index) => ({
      id: row.userId || '',
      name: names.get(row.userId || '') || 'Joueur',
      totalScore: row._sum.value || 0,
      normalizedTotal: row._sum.normalizedScore || 0,
      scoreCount: row._count._all,
      rank: index + 1,
    }));
  }

  private periodStart(period: RankingPeriod): Date | null {
    const now = Date.now();
    const msByPeriod: Partial<Record<RankingPeriod, number>> = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    const ms = msByPeriod[period];
    return ms ? new Date(now - ms) : null;
  }
}
