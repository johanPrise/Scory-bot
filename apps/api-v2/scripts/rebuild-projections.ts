import {
  Prisma,
  PrismaClient,
  RankingPeriod,
  RankingScope,
  ScoreContext,
  ScoreStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function rebuildGroupStats(tx: Prisma.TransactionClient, groupId: string) {
  const [totalScores, totalActivities, totalTeams] = await Promise.all([
    tx.score.count({ where: { groupId, status: ScoreStatus.approved } }),
    tx.activity.count({ where: { groupId } }),
    tx.team.count({ where: { groupId } }),
  ]);

  await tx.groupStats.upsert({
    where: { groupId },
    update: { totalScores, totalActivities, totalTeams },
    create: { groupId, totalScores, totalActivities, totalTeams },
  });
}

async function rebuildUserStats(tx: Prisma.TransactionClient, groupId: string) {
  const rows = await tx.score.groupBy({
    by: ['userId'],
    where: {
      groupId,
      status: ScoreStatus.approved,
      context: ScoreContext.individual,
      userId: { not: null },
    },
    _sum: { value: true, normalizedScore: true },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _sum: { normalizedScore: 'desc' } },
  });

  await tx.userGroupStats.deleteMany({ where: { groupId } });
  for (const [index, row] of rows.entries()) {
    if (!row.userId) continue;
    await tx.userGroupStats.create({
      data: {
        groupId,
        userId: row.userId,
        totalScore: row._sum.value || 0,
        normalizedTotal: row._sum.normalizedScore || 0,
        scoreCount: row._count._all,
        rank: index + 1,
        lastScoreAt: row._max.createdAt,
      },
    });
  }
}

async function rebuildTeamStats(tx: Prisma.TransactionClient, groupId: string) {
  const rows = await tx.score.groupBy({
    by: ['teamId'],
    where: {
      groupId,
      status: ScoreStatus.approved,
      context: ScoreContext.team,
      teamId: { not: null },
    },
    _sum: { value: true, normalizedScore: true },
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _sum: { normalizedScore: 'desc' } },
  });

  await tx.teamGroupStats.deleteMany({ where: { groupId } });
  for (const [index, row] of rows.entries()) {
    if (!row.teamId) continue;
    await tx.teamGroupStats.create({
      data: {
        groupId,
        teamId: row.teamId,
        totalScore: row._sum.value || 0,
        normalizedTotal: row._sum.normalizedScore || 0,
        scoreCount: row._count._all,
        rank: index + 1,
        lastScoreAt: row._max.createdAt,
      },
    });
  }
}

async function rebuildActivityStats(tx: Prisma.TransactionClient, groupId: string) {
  const rows = await tx.score.groupBy({
    by: ['activityId'],
    where: { groupId, status: ScoreStatus.approved },
    _avg: { normalizedScore: true },
    _count: { _all: true, userId: true, teamId: true },
    _max: { createdAt: true },
  });

  await tx.activityStats.deleteMany({ where: { groupId } });
  for (const row of rows) {
    await tx.activityStats.create({
      data: {
        groupId,
        activityId: row.activityId,
        totalSubmissions: row._count._all,
        totalParticipants: row._count.userId + row._count.teamId,
        averageScore: row._avg.normalizedScore || 0,
        lastSubmissionAt: row._max.createdAt,
      },
    });
  }
}

function periodStart(period: RankingPeriod): Date | null {
  const now = Date.now();
  const periods: Partial<Record<RankingPeriod, number>> = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  const ms = periods[period];
  return ms ? new Date(now - ms) : null;
}

async function buildRankingPayload(groupId: string, scope: RankingScope, period: RankingPeriod) {
  const context = scope === RankingScope.team ? ScoreContext.team : ScoreContext.individual;
  const targetField = scope === RankingScope.team ? 'teamId' : 'userId';
  const start = periodStart(period);

  const rows = await prisma.score.groupBy({
    by: [targetField],
    where: {
      groupId,
      context,
      status: ScoreStatus.approved,
      ...(start && { createdAt: { gte: start } }),
      [targetField]: { not: null },
    },
    _sum: { value: true, normalizedScore: true },
    _count: { _all: true },
    orderBy: { _sum: { normalizedScore: 'desc' } },
    take: 100,
  });

  if (scope === RankingScope.team) {
    const ids = rows.map(row => row.teamId).filter(Boolean) as string[];
    const teams = await prisma.team.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const names = new Map(teams.map(team => [team.id, team.name]));
    return rows.map((row, index) => ({
      id: row.teamId,
      name: names.get(row.teamId || '') || 'Equipe',
      totalScore: row._sum.value || 0,
      normalizedTotal: row._sum.normalizedScore || 0,
      scoreCount: row._count._all,
      rank: index + 1,
    }));
  }

  const ids = rows.map(row => row.userId).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, telegramUser: true, username: true, firstName: true, lastName: true },
  });
  const names = new Map(users.map(user => [
    user.id,
    user.telegramUser || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Joueur',
  ]));

  return rows.map((row, index) => ({
    id: row.userId,
    name: names.get(row.userId || '') || 'Joueur',
    totalScore: row._sum.value || 0,
    normalizedTotal: row._sum.normalizedScore || 0,
    scoreCount: row._count._all,
    rank: index + 1,
  }));
}

async function rebuildRankingSnapshots(groupId: string) {
  const periods = [RankingPeriod.month, RankingPeriod.all];
  const scopes = [RankingScope.individual, RankingScope.team];

  await prisma.rankingSnapshot.deleteMany({ where: { groupId } });
  for (const period of periods) {
    for (const scope of scopes) {
      const payload = await buildRankingPayload(groupId, scope, period);
      await prisma.rankingSnapshot.create({
        data: {
          groupId,
          scope,
          period,
          activityId: '',
          payload: payload as Prisma.JsonArray,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
    }
  }
}

async function main() {
  const groups = await prisma.telegramGroup.findMany({ select: { id: true, chatId: true } });
  const report = [];

  for (const group of groups) {
    await prisma.$transaction(async tx => {
      await rebuildGroupStats(tx, group.id);
      await rebuildUserStats(tx, group.id);
      await rebuildTeamStats(tx, group.id);
      await rebuildActivityStats(tx, group.id);
    });
    await rebuildRankingSnapshots(group.id);

    report.push({
      chatId: group.chatId,
      groupStats: await prisma.groupStats.findUnique({ where: { groupId: group.id } }),
      userStats: await prisma.userGroupStats.count({ where: { groupId: group.id } }),
      teamStats: await prisma.teamGroupStats.count({ where: { groupId: group.id } }),
      activityStats: await prisma.activityStats.count({ where: { groupId: group.id } }),
      rankingSnapshots: await prisma.rankingSnapshot.count({ where: { groupId: group.id } }),
    });
  }

  console.log(JSON.stringify({ groups: report }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
