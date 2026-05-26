import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType, RankingPeriod, RankingScope, ScoreStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { RankingsService } from '../rankings/rankings.service';

const PAGE_SIZE = 30;

type ScopedRequest = {
  chatId: string;
  userId: string;
};

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankings: RankingsService,
  ) {}

  async getHome({ userId, chatId }: ScopedRequest) {
    const group = await this.findAccessibleGroup(chatId, userId);
    const [stats, userStats, recentScores, ranking] = await Promise.all([
      this.prisma.groupStats.findUnique({ where: { groupId: group.id } }),
      this.prisma.userGroupStats.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      }),
      this.prisma.score.findMany({
        where: { groupId: group.id, status: ScoreStatus.approved },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          activity: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true, telegramUser: true } },
          team: { select: { id: true, name: true } },
        },
      }),
      this.rankings.getSnapshot({
        groupId: group.id,
        scope: RankingScope.individual,
        period: RankingPeriod.month,
      }),
    ]);

    return {
      group: { id: group.id, chatId: group.chatId, title: group.title, type: group.type },
      stats: {
        totalScores: stats?.totalScores || 0,
        totalActivities: stats?.totalActivities || 0,
        totalTeams: stats?.totalTeams || 0,
      },
      userStats: {
        totalScore: userStats?.totalScore || 0,
        normalizedTotal: userStats?.normalizedTotal || 0,
        scoreCount: userStats?.scoreCount || 0,
        rank: userStats?.rank || null,
        lastScoreAt: userStats?.lastScoreAt || null,
      },
      recentScores: recentScores.map(score => ({
        id: score.id,
        value: score.value,
        maxPossible: score.maxPossible,
        normalizedScore: score.normalizedScore,
        context: score.context,
        createdAt: score.createdAt,
        activity: score.activity,
        user: score.user
          ? {
              id: score.user.id,
              name: this.displayUserName(score.user),
            }
          : null,
        team: score.team,
      })),
      topRanking: ranking.items.slice(0, 3),
      rankingGeneratedAt: ranking.generatedAt,
    };
  }

  async getRankings({ chatId, userId, scope, period, activityId }: ScopedRequest & {
    scope: 'individual' | 'team';
    period: 'day' | 'week' | 'month' | 'year' | 'all';
    activityId?: string;
  }) {
    const group = await this.findAccessibleGroup(chatId, userId);
    return this.rankings.getSnapshot({
      groupId: group.id,
      scope: scope === 'team' ? RankingScope.team : RankingScope.individual,
      period: period as RankingPeriod,
      activityId,
    });
  }

  async getActivities({ chatId, userId, cursor, type, search }: ScopedRequest & {
    cursor?: string;
    type?: string;
    search?: string;
  }) {
    const group = await this.findAccessibleGroup(chatId, userId);
    const activityType = this.parseActivityType(type);

    const rows = await this.prisma.activity.findMany({
      where: {
        groupId: group.id,
        ...(activityType && { type: activityType }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        stats: true,
        subActivities: { orderBy: { createdAt: 'asc' } },
      },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const activities = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    return {
      activities: activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        type: activity.type,
        isActive: activity.isActive,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
        subActivities: activity.subActivities.map(subActivity => ({
          id: subActivity.id,
          _id: subActivity.id,
          name: subActivity.name,
          description: subActivity.description,
          maxScore: subActivity.maxScore,
          createdAt: subActivity.createdAt,
        })),
        stats: activity.stats
          ? {
              totalSubmissions: activity.stats.totalSubmissions,
              totalParticipants: activity.stats.totalParticipants,
              averageScore: activity.stats.averageScore,
              lastSubmissionAt: activity.stats.lastSubmissionAt,
            }
          : {
              totalSubmissions: 0,
              totalParticipants: 0,
              averageScore: 0,
              lastSubmissionAt: null,
            },
      })),
      nextCursor: hasMore ? activities[activities.length - 1]?.id : null,
    };
  }

  async getTeams({ chatId, userId, cursor }: ScopedRequest & { cursor?: string }) {
    const group = await this.findAccessibleGroup(chatId, userId);
    const rows = await this.prisma.team.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        stats: true,
        _count: { select: { members: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                telegramUser: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    const hasMore = rows.length > PAGE_SIZE;
    const teams = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    return {
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: team._count.members,
        maxMembers: team.maxMembers,
        isPrivate: team.isPrivate,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        members: team.members.map(member => ({
          id: member.id,
          _id: member.id,
          userId: {
            id: member.user.id,
            _id: member.user.id,
            username: member.user.telegramUser || member.user.username,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatar: null,
          },
          isAdmin: member.isAdmin,
          joinedAt: member.joinedAt,
        })),
        stats: team.stats
          ? {
              totalScore: team.stats.totalScore,
              normalizedTotal: team.stats.normalizedTotal,
              scoreCount: team.stats.scoreCount,
              rank: team.stats.rank,
              lastScoreAt: team.stats.lastScoreAt,
            }
          : {
              totalScore: 0,
              normalizedTotal: 0,
              scoreCount: 0,
              rank: null,
              lastScoreAt: null,
            },
      })),
      nextCursor: hasMore ? teams[teams.length - 1]?.id : null,
    };
  }

  private async findAccessibleGroup(chatId: string, userId: string) {
    if (!chatId) throw new BadRequestException('chatId requis');
    const group = await this.prisma.telegramGroup.findUnique({ where: { chatId } });
    if (!group) throw new NotFoundException('Groupe introuvable');

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Acces refuse pour ce groupe');

    return group;
  }

  private displayUserName(user: {
    firstName: string | null;
    lastName: string | null;
    telegramUser: string | null;
  }) {
    return user.telegramUser || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Joueur';
  }

  private parseActivityType(type?: string): ActivityType | null {
    if (!type || type === 'all') return null;
    if (Object.values(ActivityType).includes(type as ActivityType)) return type as ActivityType;
    throw new BadRequestException('Type d activite invalide');
  }
}
