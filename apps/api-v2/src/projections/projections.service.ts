import { Injectable } from '@nestjs/common';
import { Prisma, Score, ScoreContext } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class ProjectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async applyApprovedScore(score: Score, tx: Prisma.TransactionClient = this.prisma) {
    await Promise.all([
      this.updateGroupStats(score, tx),
      this.updateActivityStats(score, tx),
      score.context === ScoreContext.individual && score.userId
        ? this.updateUserStats(score, tx)
        : Promise.resolve(),
      score.context === ScoreContext.team && score.teamId
        ? this.updateTeamStats(score, tx)
        : Promise.resolve(),
    ]);

    await this.redis.delByPrefix(`mobile:${score.groupId}:`);
  }

  async rollbackApprovedScore(score: Score, tx: Prisma.TransactionClient = this.prisma) {
    const inverted = {
      ...score,
      value: -score.value,
      normalizedScore: -score.normalizedScore,
    };
    await this.applyApprovedScore(inverted, tx);
  }

  async rebuildGroup(groupId: string) {
    const [scores, activities, teams] = await Promise.all([
      this.prisma.score.findMany({ where: { groupId, status: 'approved' } }),
      this.prisma.activity.findMany({ where: { groupId }, select: { id: true } }),
      this.prisma.team.findMany({ where: { groupId }, select: { id: true } }),
    ]);

    await this.prisma.$transaction(async tx => {
      await tx.groupStats.upsert({
        where: { groupId },
        update: {
          totalScores: scores.length,
          totalActivities: activities.length,
          totalTeams: teams.length,
        },
        create: {
          groupId,
          totalScores: scores.length,
          totalActivities: activities.length,
          totalTeams: teams.length,
        },
      });

      await tx.userGroupStats.deleteMany({ where: { groupId } });
      await tx.teamGroupStats.deleteMany({ where: { groupId } });
      await tx.activityStats.deleteMany({ where: { groupId } });

      for (const score of scores) {
        await this.applyApprovedScore(score, tx);
      }
    });
  }

  private updateGroupStats(score: Score, tx: Prisma.TransactionClient) {
    return tx.groupStats.upsert({
      where: { groupId: score.groupId },
      update: { totalScores: { increment: score.value >= 0 ? 1 : -1 } },
      create: {
        groupId: score.groupId,
        totalScores: score.value >= 0 ? 1 : 0,
        totalActivities: 0,
        totalTeams: 0,
      },
    });
  }

  private updateActivityStats(score: Score, tx: Prisma.TransactionClient) {
    return tx.activityStats.upsert({
      where: { activityId: score.activityId },
      update: {
        totalSubmissions: { increment: score.value >= 0 ? 1 : -1 },
        lastSubmissionAt: score.value >= 0 ? score.createdAt : undefined,
      },
      create: {
        activityId: score.activityId,
        groupId: score.groupId,
        totalSubmissions: score.value >= 0 ? 1 : 0,
        totalParticipants: score.value >= 0 ? 1 : 0,
        averageScore: score.normalizedScore,
        lastSubmissionAt: score.createdAt,
      },
    });
  }

  private updateUserStats(score: Score, tx: Prisma.TransactionClient) {
    return tx.userGroupStats.upsert({
      where: { groupId_userId: { groupId: score.groupId, userId: score.userId as string } },
      update: {
        totalScore: { increment: score.value },
        normalizedTotal: { increment: score.normalizedScore },
        scoreCount: { increment: score.value >= 0 ? 1 : -1 },
        lastScoreAt: score.value >= 0 ? score.createdAt : undefined,
      },
      create: {
        groupId: score.groupId,
        userId: score.userId as string,
        totalScore: score.value,
        normalizedTotal: score.normalizedScore,
        scoreCount: score.value >= 0 ? 1 : 0,
        lastScoreAt: score.createdAt,
      },
    });
  }

  private updateTeamStats(score: Score, tx: Prisma.TransactionClient) {
    return tx.teamGroupStats.upsert({
      where: { teamId: score.teamId as string },
      update: {
        totalScore: { increment: score.value },
        normalizedTotal: { increment: score.normalizedScore },
        scoreCount: { increment: score.value >= 0 ? 1 : -1 },
        lastScoreAt: score.value >= 0 ? score.createdAt : undefined,
      },
      create: {
        teamId: score.teamId as string,
        groupId: score.groupId,
        totalScore: score.value,
        normalizedTotal: score.normalizedScore,
        scoreCount: score.value >= 0 ? 1 : 0,
        lastScoreAt: score.createdAt,
      },
    });
  }
}
