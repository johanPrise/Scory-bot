import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

function generateJoinCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeam(input: {
    actorId: string;
    chatId: string;
    name: string;
    description?: string;
    maxMembers?: number;
  }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const team = await this.prisma.team.create({
      data: {
        groupId: group.id,
        createdById: input.actorId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        maxMembers: Number.isFinite(Number(input.maxMembers)) ? Number(input.maxMembers) : 10,
        joinCode: generateJoinCode(),
      },
      include: {
        members: { include: { user: { select: { id: true, telegramUser: true, username: true, firstName: true, lastName: true } } } },
        stats: true,
        _count: { select: { members: true } },
      },
    });

    await this.bumpGroupCounters(group.id);
    return { team: this.toApiTeam(team) };
  }

  async joinTeam(input: { actorId: string; chatId: string; joinCode: string }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const team = await this.prisma.team.findFirst({
      where: { groupId: group.id, joinCode: input.joinCode.trim().toUpperCase() },
    });
    if (!team) throw new NotFoundException('Equipe introuvable');

    await this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: input.actorId } },
      update: {},
      create: { teamId: team.id, userId: input.actorId },
    });

    return { teamId: team.id, joinCode: team.joinCode };
  }

  async deleteTeam(input: { actorId: string; chatId: string; teamId: string }) {
    const group = await this.findActorGroupByChatId(input.chatId, input.actorId);
    const team = await this.prisma.team.findFirst({
      where: { id: input.teamId, groupId: group.id },
    });
    if (!team) throw new NotFoundException('Equipe introuvable');

    await this.prisma.$transaction(async tx => {
      await tx.score.deleteMany({ where: { teamId: team.id } });
      await tx.teamMember.deleteMany({ where: { teamId: team.id } });
      await tx.teamGroupStats.deleteMany({ where: { teamId: team.id } });
      await tx.team.delete({ where: { id: team.id } });
    });

    await this.bumpGroupCounters(group.id);
    return { ok: true };
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

  private toApiTeam(team: any) {
    return {
      ...team,
      _id: team.id,
      settings: {
        joinCode: team.joinCode,
        maxMembers: team.maxMembers,
      },
      memberCount: team._count?.members ?? team.members?.length ?? 0,
      members: (team.members || []).map((member: any) => ({
        ...member,
        _id: member.id,
        userId: member.user,
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
