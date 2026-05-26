import { Injectable } from '@nestjs/common';
import { ScoreContext, ScoreStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramReportPeriod, TelegramReportScope } from './telegram-report.jobs';

function stringifyValue(value: unknown) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function escapeHtml(value: unknown) {
  return stringifyValue(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function displayName(user: { telegramUser?: string | null; username?: string | null; firstName?: string | null; lastName?: string | null }) {
  return user.telegramUser || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Joueur';
}

@Injectable()
export class TelegramReportService {
  constructor(private readonly prisma: PrismaService) {}

  async buildReport(input: {
    groupId: string;
    period: TelegramReportPeriod;
    scope: TelegramReportScope;
  }) {
    const [group, totals, previousCount, topPlayers, topActivities, topTeams, recentScore] = await Promise.all([
      this.prisma.telegramGroup.findUnique({
        where: { id: input.groupId },
        select: { title: true },
      }),
      this.getTotals(input.groupId, input.period),
      this.getPreviousScoreCount(input.groupId, input.period),
      this.getTopPlayers(input.groupId, input.period),
      this.getTopActivities(input.groupId, input.period),
      this.getTopTeams(input.groupId, input.period),
      this.getRecentScore(input.groupId, input.period),
    ]);

    const periodLabel = this.periodLabel(input.period);
    const lines = [
      `📊 <b>Rapport Scory</b>`,
      '',
      `Groupe: <b>${escapeHtml(group?.title || 'Groupe')}</b>`,
      `Période: <b>${periodLabel}</b>`,
      '',
      `Scores: <b>${totals.scoreCount}</b>`,
      `Points: <b>${totals.pointTotal}</b>`,
      `Activités jouées: <b>${totals.activityCount}</b>`,
      `Participants: <b>${totals.participantCount}</b>`,
      this.progressLine(totals.scoreCount, previousCount),
      '',
      ...this.sectionLines('🏆 Top joueurs', topPlayers.map(item => `${item.rank}. <b>${escapeHtml(item.name)}</b> - ${item.points} pts`)),
      '',
      ...this.sectionLines('🎯 Activités', topActivities.map(item => `${item.rank}. <b>${escapeHtml(item.name)}</b> - ${item.scoreCount} scores`)),
      '',
      ...this.sectionLines('👥 Équipes', topTeams.map(item => `${item.rank}. <b>${escapeHtml(item.name)}</b> - ${item.points} pts`)),
    ];

    if (recentScore) {
      lines.push(
        '',
        `Dernier score: <b>${escapeHtml(recentScore.target)}</b>, ${escapeHtml(recentScore.activity)}, +${recentScore.value} pts`,
      );
    }

    if (input.scope !== 'summary') {
      lines.push('', `Vue demandée: <b>${escapeHtml(input.scope)}</b>`);
    }

    const text = lines.join('\n');
    return text.length > 3900 ? `${text.slice(0, 3900)}\n... rapport tronqué.` : text;
  }

  private async getTotals(groupId: string, period: TelegramReportPeriod) {
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

  private async getPreviousScoreCount(groupId: string, period: TelegramReportPeriod) {
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

  private async getTopPlayers(groupId: string, period: TelegramReportPeriod) {
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

  private async getTopActivities(groupId: string, period: TelegramReportPeriod) {
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

  private async getTopTeams(groupId: string, period: TelegramReportPeriod) {
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

  private async getRecentScore(groupId: string, period: TelegramReportPeriod) {
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

  private scoreWhere(groupId: string, period: TelegramReportPeriod) {
    const range = this.periodRange(period);
    return {
      groupId,
      status: ScoreStatus.approved,
      ...(range && { createdAt: { gte: range.start } }),
    };
  }

  private periodRange(period: TelegramReportPeriod) {
    if (period === 'all') return null;

    const days = period === '7d' ? 7 : 30;
    const durationMs = days * 24 * 60 * 60 * 1000;
    const start = new Date(Date.now() - durationMs);
    const previousStart = new Date(start.getTime() - durationMs);
    return { start, previousStart };
  }

  private periodLabel(period: TelegramReportPeriod) {
    if (period === '7d') return '7 derniers jours';
    if (period === '30d') return '30 derniers jours';
    return 'Depuis le début';
  }

  private sectionLines(title: string, rows: string[]) {
    return rows.length > 0 ? [title, ...rows] : [title, 'Aucune donnée'];
  }

  private progressLine(current: number, previous: number | null) {
    if (previous == null) return 'Progression: <b>n/a</b>';
    if (previous === 0) return current > 0 ? 'Progression: <b>nouvelle activité</b>' : 'Progression: <b>0%</b>';

    const percent = Math.round(((current - previous) / previous) * 100);
    const sign = percent > 0 ? '+' : '';
    return `Progression: <b>${sign}${percent}%</b>`;
  }
}
