import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ScoreContext, ScoreEventType, ScoreStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProjectionsService } from '../projections/projections.service';
import { RankingsService } from '../rankings/rankings.service';
import { StatsSnapshotService } from '../stats/stats-snapshot.service';

@Injectable()
export class ScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projections: ProjectionsService,
    private readonly rankings: RankingsService,
    private readonly statsSnapshots: StatsSnapshotService,
  ) {}

  async listScores(input: {
    actorId: string;
    chatId: string;
    activityId?: string;
    userId?: string;
    teamId?: string;
    context?: 'individual' | 'team';
    status?: 'approved' | 'pending' | 'rejected' | 'deleted';
    limit?: number;
  }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 100);
    const scores = await this.prisma.score.findMany({
      where: {
        groupId: group.id,
        status: input.status ? input.status as ScoreStatus : ScoreStatus.approved,
        ...(input.activityId && { activityId: input.activityId }),
        ...(input.userId && { userId: input.userId }),
        ...(input.teamId && { teamId: input.teamId }),
        ...(input.context && { context: input.context as ScoreContext }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        activity: { select: { id: true, name: true, description: true } },
        user: { select: { id: true, firstName: true, lastName: true, telegramUser: true, username: true } },
        team: { select: { id: true, name: true, description: true } },
        awardedBy: { select: { id: true, firstName: true, lastName: true, telegramUser: true, username: true } },
      },
    });

    return {
      scores: scores.map(score => ({
        ...score,
        _id: score.id,
        user: score.user ? { ...score.user, _id: score.user.id, username: score.user.telegramUser || score.user.username } : null,
        team: score.team ? { ...score.team, _id: score.team.id } : null,
        activity: score.activity ? { ...score.activity, _id: score.activity.id } : null,
        awardedBy: score.awardedBy
          ? { ...score.awardedBy, _id: score.awardedBy.id, username: score.awardedBy.telegramUser || score.awardedBy.username }
          : null,
      })),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalScores: scores.length,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  async createScore(input: {
    actorId: string;
    chatId: string;
    activityId: string;
    subActivityId?: string;
    userId?: string;
    teamId?: string;
    value: number;
    maxPossible: number;
    context: 'individual' | 'team';
    comments?: string;
  }) {
    if (input.maxPossible <= 0) throw new BadRequestException('maxPossible doit etre superieur a 0');
    if (input.context === 'individual' && !input.userId) throw new BadRequestException('userId requis');
    if (input.context === 'team' && !input.teamId) throw new BadRequestException('teamId requis');

    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    await this.assertScoreTargetsBelongToGroup({
      groupId: group.id,
      activityId: input.activityId,
      subActivityId: input.subActivityId,
      userId: input.userId,
      teamId: input.teamId,
      context: input.context,
    });

    const normalizedScore = Math.min(100, Math.round((input.value / input.maxPossible) * 100));
    const context = input.context === 'team' ? ScoreContext.team : ScoreContext.individual;
    const duplicate = await this.prisma.score.findFirst({
      where: {
        groupId: group.id,
        activityId: input.activityId,
        subActivityId: input.subActivityId || null,
        status: { not: ScoreStatus.deleted },
        ...(context === ScoreContext.individual
          ? { userId: input.userId, context: ScoreContext.individual }
          : { teamId: input.teamId, context: ScoreContext.team }),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Un score existe deja pour cette cible et cette activite');
    }

    const score = await this.prisma.$transaction(async tx => {
      const created = await tx.score.create({
        data: {
          groupId: group.id,
          activityId: input.activityId,
          subActivityId: input.subActivityId,
          userId: input.userId,
          teamId: input.teamId,
          value: input.value,
          maxPossible: input.maxPossible,
          normalizedScore,
          context,
          status: ScoreStatus.approved,
          awardedById: input.actorId,
          comments: input.comments,
        },
      });

      await tx.scoreEvent.create({
        data: {
          scoreId: created.id,
          actorId: input.actorId,
          type: ScoreEventType.created,
          payload: { status: ScoreStatus.approved },
        },
      });

      await this.projections.applyApprovedScore(created, tx);
      return created;
    });

    await this.afterScoreMutation(score.groupId);
    return { score };
  }

  async deleteScore({ actorId, scoreId }: { actorId: string; scoreId: string }) {
    const score = await this.prisma.$transaction(async tx => {
      const existing = await tx.score.findUnique({ where: { id: scoreId } });
      if (!existing) throw new NotFoundException('Score introuvable');
      await this.assertActorCanAccessGroup(existing.groupId, actorId, tx);
      if (existing.status === ScoreStatus.deleted) return existing;

      const deleted = await tx.score.update({
        where: { id: scoreId },
        data: {
          status: ScoreStatus.deleted,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });
      await tx.scoreEvent.create({
        data: { scoreId, actorId, type: ScoreEventType.deleted },
      });
      if (existing.status === ScoreStatus.approved) {
        await this.projections.rollbackApprovedScore(existing, tx);
      }
      return deleted;
    });

    await this.afterScoreMutation(score.groupId);
    return { score };
  }

  async approveScore({ actorId, scoreId }: { actorId: string; scoreId: string }) {
    const score = await this.prisma.$transaction(async tx => {
      const existing = await tx.score.findUnique({ where: { id: scoreId } });
      if (!existing) throw new NotFoundException('Score introuvable');
      await this.assertActorCanAccessGroup(existing.groupId, actorId, tx);
      if (existing.status === ScoreStatus.approved) return existing;

      const approved = await tx.score.update({
        where: { id: scoreId },
        data: {
          status: ScoreStatus.approved,
          reviewedById: actorId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });
      await tx.scoreEvent.create({
        data: { scoreId, actorId, type: ScoreEventType.approved },
      });
      await this.projections.applyApprovedScore(approved, tx);
      return approved;
    });

    await this.afterScoreMutation(score.groupId);
    return { score };
  }

  async rejectScore({ actorId, scoreId, reason }: { actorId: string; scoreId: string; reason: string }) {
    if (!reason?.trim()) throw new BadRequestException('Raison du rejet requise');

    const score = await this.prisma.$transaction(async tx => {
      const existing = await tx.score.findUnique({ where: { id: scoreId } });
      if (!existing) throw new NotFoundException('Score introuvable');
      await this.assertActorCanAccessGroup(existing.groupId, actorId, tx);

      const rejected = await tx.score.update({
        where: { id: scoreId },
        data: {
          status: ScoreStatus.rejected,
          reviewedById: actorId,
          reviewedAt: new Date(),
          rejectionReason: reason.trim(),
        },
      });
      await tx.scoreEvent.create({
        data: { scoreId, actorId, type: ScoreEventType.rejected, payload: { reason: reason.trim() } },
      });
      if (existing.status === ScoreStatus.approved) {
        await this.projections.rollbackApprovedScore(existing, tx);
      }
      return rejected;
    });

    await this.afterScoreMutation(score.groupId);
    return { score };
  }

  private async afterScoreMutation(groupId: string) {
    await Promise.all([
      this.rankings.rebuildGroupSnapshots(groupId),
      this.statsSnapshots.enqueueReportRebuild(groupId),
    ]);
  }

  private async findActorGroupByChatId(chatId: string, actorId: string) {
    if (!chatId) throw new BadRequestException('chatId requis');

    const group = await this.prisma.telegramGroup.findUnique({
      where: { chatId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Groupe introuvable');

    await this.assertActorCanAccessGroup(group.id, actorId);
    return group;
  }

  private async assertActorCanAccessGroup(
    groupId: string,
    actorId: string,
    tx: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const membership = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Acces refuse pour ce groupe');
  }

  private async assertScoreTargetsBelongToGroup(input: {
    groupId: string;
    activityId: string;
    subActivityId?: string;
    userId?: string;
    teamId?: string;
    context: 'individual' | 'team';
  }) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: input.activityId, groupId: input.groupId },
      select: { id: true },
    });
    if (!activity) throw new BadRequestException('Activite invalide pour ce groupe');

    if (input.subActivityId) {
      const subActivity = await this.prisma.subActivity.findFirst({
        where: { id: input.subActivityId, activityId: input.activityId },
        select: { id: true },
      });
      if (!subActivity) throw new BadRequestException('Sous-activite invalide pour cette activite');
    }

    if (input.context === 'individual' && input.userId) {
      const member = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
        select: { id: true },
      });
      if (!member) throw new BadRequestException('Utilisateur invalide pour ce groupe');
    }

    if (input.context === 'team' && input.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: input.teamId, groupId: input.groupId },
        select: { id: true },
      });
      if (!team) throw new BadRequestException('Equipe invalide pour ce groupe');
    }
  }
}
