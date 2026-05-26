import { TelegramReportPeriod, TelegramReportScope } from './telegram-report.jobs';

export function reportCallbackData(scope: TelegramReportScope, period: TelegramReportPeriod) {
  return `report:${scope}:${period}`;
}

export function reportKeyboard(scope: TelegramReportScope, period: TelegramReportPeriod) {
  return {
    inline_keyboard: [
      [
        { text: scope === 'summary' ? 'Vue globale ✓' : 'Vue globale', callback_data: reportCallbackData('summary', period) },
      ],
      [
        { text: scope === 'scores' ? 'Joueurs ✓' : 'Joueurs', callback_data: reportCallbackData('scores', period) },
        { text: scope === 'activities' ? 'Activités ✓' : 'Activités', callback_data: reportCallbackData('activities', period) },
        { text: scope === 'teams' ? 'Équipes ✓' : 'Équipes', callback_data: reportCallbackData('teams', period) },
      ],
      [
        { text: period === '7d' ? '7j ✓' : '7j', callback_data: reportCallbackData(scope, '7d') },
        { text: period === '30d' ? '30j ✓' : '30j', callback_data: reportCallbackData(scope, '30d') },
        { text: period === 'all' ? 'Tout ✓' : 'Tout', callback_data: reportCallbackData(scope, 'all') },
      ],
    ],
  };
}

export function parseReportCallbackData(data: string | undefined): {
  scope: TelegramReportScope;
  period: TelegramReportPeriod;
} | null {
  const [prefix, scope, period] = (data || '').split(':');
  if (prefix !== 'report') return null;
  if (scope !== 'summary' && scope !== 'scores' && scope !== 'activities' && scope !== 'teams') return null;
  if (period !== '7d' && period !== '30d' && period !== 'all') return null;
  return { scope, period };
}
