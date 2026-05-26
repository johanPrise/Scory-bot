import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listUserGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, group: { isActive: true } },
      orderBy: { lastSeen: 'desc' },
      include: {
        group: {
          include: { groupStats: true },
        },
      },
    });

    const groups = memberships.map(membership => ({
      id: membership.group.id,
      chatId: membership.group.chatId,
      title: membership.group.title,
      type: membership.group.type,
      stats: {
        activities: membership.group.groupStats?.totalActivities || 0,
        teams: membership.group.groupStats?.totalTeams || 0,
        scores: membership.group.groupStats?.totalScores || 0,
      },
      memberRole: membership.role,
      lastSeen: membership.lastSeen,
      updatedAt: membership.group.updatedAt,
    }));

    return { groups, total: groups.length };
  }

  async getGroup({ chatId, userId }: { chatId: string; userId: string }) {
    const group = await this.prisma.telegramGroup.findUnique({
      where: { chatId },
      include: {
        groupStats: true,
        members: {
          orderBy: { lastSeen: 'desc' },
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

    if (!group) throw new NotFoundException('Groupe non trouve');
    if (!group.members.some(member => member.userId === userId)) {
      throw new ForbiddenException('Acces non autorise');
    }

    return {
      group: {
        id: group.id,
        _id: group.id,
        chatId: group.chatId,
        title: group.title,
        type: group.type,
        isActive: group.isActive,
        members: group.members.map(member => ({
          id: member.id,
          _id: member.id,
          role: member.role,
          firstSeen: member.firstSeen,
          lastSeen: member.lastSeen,
          userId: {
            id: member.user.id,
            _id: member.user.id,
            username: member.user.telegramUser || member.user.username,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatar: null,
          },
        })),
        stats: {
          activities: group.groupStats?.totalActivities || 0,
          teams: group.groupStats?.totalTeams || 0,
          scores: group.groupStats?.totalScores || 0,
        },
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
    };
  }
}
