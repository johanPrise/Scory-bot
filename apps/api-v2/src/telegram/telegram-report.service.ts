import { Injectable } from '@nestjs/common';
import { StatsSnapshotPeriod } from '@prisma/client';
import { StatsSnapshotService } from '../stats/stats-snapshot.service';
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

@Injectable()
export class TelegramReportService {
  constructor(private readonly snapshots: StatsSnapshotService) {}

  async buildReport(input: {
    groupId: string;
    period: TelegramReportPeriod;
    scope: TelegramReportScope;
  }) {
    const period = this.toSnapshotPeriod(input.period);
    const snapshot = await this.snapshots.getFreshReportSnapshot(input.groupId, period)
      || await this.snapshots.rebuildReportSnapshot(input.groupId, period);

    const lines = [
      `📊 <b>Rapport Scory</b>`,
      '',
      `Groupe: <b>${escapeHtml(snapshot.group.title)}</b>`,
      `Période: <b>${this.periodLabel(input.period)}</b>`,
      '',
      `Scores: <b>${snapshot.totals.scoreCount}</b>`,
      `Points: <b>${snapshot.totals.pointTotal}</b>`,
      `Activités jouées: <b>${snapshot.totals.activityCount}</b>`,
      `Participants: <b>${snapshot.totals.participantCount}</b>`,
      this.progressLine(snapshot.totals.scoreCount, snapshot.previousScoreCount),
      '',
      ...this.sectionLines('🏆 Top joueurs', snapshot.topPlayers.map(item => `${item.rank}. <b>${escapeHtml(item.name)}</b> - ${item.points} pts`)),
      '',
      ...this.sectionLines('🎯 Activités', snapshot.topActivities.map(item => `${item.rank}. <b>${escapeHtml(item.name)}</b> - ${item.scoreCount} scores`)),
      '',
      ...this.sectionLines('👥 Équipes', snapshot.topTeams.map(item => `${item.rank}. <b>${escapeHtml(item.name)}</b> - ${item.points} pts`)),
    ];

    if (snapshot.recentScore) {
      lines.push(
        '',
        `Dernier score: <b>${escapeHtml(snapshot.recentScore.target)}</b>, ${escapeHtml(snapshot.recentScore.activity)}, +${snapshot.recentScore.value} pts`,
      );
    }

    if (input.scope !== 'summary') {
      lines.push('', `Vue demandée: <b>${escapeHtml(input.scope)}</b>`);
    }

    const text = lines.join('\n');
    return text.length > 3900 ? `${text.slice(0, 3900)}\n... rapport tronqué.` : text;
  }

  private toSnapshotPeriod(period: TelegramReportPeriod) {
    if (period === '7d') return StatsSnapshotPeriod.seven_days;
    if (period === '30d') return StatsSnapshotPeriod.thirty_days;
    return StatsSnapshotPeriod.all;
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
