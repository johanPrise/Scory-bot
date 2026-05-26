import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MigrationReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getPostgresCounts() {
    const [
      users,
      groups,
      memberships,
      activities,
      subActivities,
      teams,
      teamMembers,
      scores,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.telegramGroup.count(),
      this.prisma.groupMember.count(),
      this.prisma.activity.count(),
      this.prisma.subActivity.count(),
      this.prisma.team.count(),
      this.prisma.teamMember.count(),
      this.prisma.score.count(),
    ]);

    return { users, groups, memberships, activities, subActivities, teams, teamMembers, scores };
  }
}
