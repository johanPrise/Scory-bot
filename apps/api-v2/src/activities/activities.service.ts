import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ScoresService } from '../scores/scores.service';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scores: ScoresService,
  ) {}

  async createActivity(input: {
    actorId: string;
    chatId: string;
    name: string;
    description?: string;
    type?: ActivityType | string;
  }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const activity = await this.prisma.activity.create({
      data: {
        groupId: group.id,
        createdById: input.actorId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: this.normalizeActivityType(input.type),
      },
      include: { subActivities: true, stats: true },
    });

    await this.bumpGroupCounters(group.id);
    return { activity: this.toApiActivity(activity) };
  }

  async getActivity(activityId: string, chatId: string, actorId: string) {
    const group = await this.findActorGroupByChatId(chatId, actorId);
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, groupId: group.id },
      include: { subActivities: { orderBy: { createdAt: 'asc' } }, stats: true },
    });
    if (!activity) throw new NotFoundException('Activite introuvable');
    return { activity: this.toApiActivity(activity) };
  }

  async deleteActivity(input: { actorId: string; chatId: string; activityId: string }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const activity = await this.prisma.activity.findFirst({
      where: { id: input.activityId, groupId: group.id },
      include: { subActivities: true },
    });
    if (!activity) throw new NotFoundException('Activite introuvable');

    await this.prisma.$transaction(async tx => {
      await tx.score.deleteMany({ where: { activityId: activity.id } });
      await tx.subActivity.deleteMany({ where: { activityId: activity.id } });
      await tx.activity.delete({ where: { id: activity.id } });
    });

    await this.bumpGroupCounters(group.id);
    return { ok: true };
  }

  async addSubActivity(input: {
    actorId: string;
    chatId: string;
    activityId: string;
    name: string;
    description?: string;
    maxScore?: number;
  }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const activity = await this.prisma.activity.findFirst({
      where: { id: input.activityId, groupId: group.id },
      select: { id: true },
    });
    if (!activity) throw new NotFoundException('Activite introuvable');

    const subActivity = await this.prisma.subActivity.create({
      data: {
        activityId: activity.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        maxScore: Number.isFinite(Number(input.maxScore)) ? Number(input.maxScore) : 100,
      },
    });

    await this.prisma.activity.update({ where: { id: activity.id }, data: { updatedAt: new Date() } });
    return { subActivity: { ...subActivity, _id: subActivity.id } };
  }

  async deleteSubActivity(input: {
    actorId: string;
    chatId: string;
    activityId: string;
    subActivityId: string;
  }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const activity = await this.prisma.activity.findFirst({
      where: { id: input.activityId, groupId: group.id },
      select: { id: true },
    });
    if (!activity) throw new NotFoundException('Activite introuvable');

    await this.prisma.$transaction(async tx => {
      await tx.score.deleteMany({ where: { activityId: activity.id, subActivityId: input.subActivityId } });
      await tx.subActivity.deleteMany({ where: { id: input.subActivityId, activityId: activity.id } });
    });

    return { ok: true };
  }

  async getActivityHistory(input: { actorId: string; chatId: string; activityId: string; limit?: number }) {
    return this.scores.listScores({
      actorId: input.actorId,
      chatId: input.chatId,
      activityId: input.activityId,
      limit: input.limit || 20,
    });
  }

  private async findActorGroupByChatId(chatId: string, actorId: string) {
    if (!chatId) throw new BadRequestException('chatId requis');

    const group = await this.prisma.telegramGroup.findUnique({ where: { chatId } });
    if (!group) throw new NotFoundException('Groupe introuvable');

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: actorId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Acces refuse pour ce groupe');

    return group;
  }

  private normalizeActivityType(type?: ActivityType | string) {
    if (!type) return ActivityType.other;
    if (Object.values(ActivityType).includes(type as ActivityType)) return type as ActivityType;
    return ActivityType.other;
  }

  private toApiActivity(activity: {
    id: string;
    name: string;
    description: string | null;
    type: ActivityType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    subActivities?: Array<{ id: string; name: string; description: string | null; maxScore: number; createdAt: Date }>;
    stats?: any;
  }) {
    return {
      ...activity,
      _id: activity.id,
      settings: { isActive: activity.isActive },
      subActivities: (activity.subActivities || []).map(subActivity => ({
        ...subActivity,
        _id: subActivity.id,
      })),
    };
  }

  private async bumpGroupCounters(groupId: string) {
    const [activities, teams, scores] = await Promise.all([
      this.prisma.activity.count({ where: { groupId } }),
      this.prisma.team.count({ where: { groupId } }),
      this.prisma.score.count({ where: { groupId, status: 'approved' } }),
    ]);

    await this.prisma.groupStats.upsert({
      where: { groupId },
      update: { totalActivities: activities, totalTeams: teams, totalScores: scores },
      create: { groupId, totalActivities: activities, totalTeams: teams, totalScores: scores },
    });
  }
}
