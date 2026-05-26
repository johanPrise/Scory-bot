import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ActivityType,
  ChatType,
  GlobalRole,
  GroupRole,
  RankingPeriod,
  RankingScope,
  TimerStatus,
} from '@prisma/client';
import type { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { JOB_NAMES, QUEUE_NAMES } from '../common/queue/queue.constants';
import { RankingsService } from '../rankings/rankings.service';
import { ScoresService } from '../scores/scores.service';
import { env } from '../runtime-env';
import { TelegramClientService } from './telegram-client.service';
import { TelegramReportPeriod, TelegramReportScope } from './telegram-report.jobs';
import { TelegramTimerSchedulerService } from './telegram-timer-scheduler.service';
import {
  TelegramChatPayload,
  TelegramCommandResult,
  TelegramMessagePayload,
  TelegramUpdatePayload,
  TelegramUserPayload,
} from './telegram.types';

type ParsedCommand = {
  command: string;
  args: string;
};

function stringifyValue(value: unknown) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) ?? '';
    } catch {
      return '';
    }
  }
  return String(value);
}

function escapeHtml(value: unknown) {
  return stringifyValue(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function normalizeChatType(type: TelegramChatPayload['type']): ChatType {
  if (type === 'private' || type === 'group' || type === 'supergroup' || type === 'channel') return type;
  return ChatType.group;
}

function displayName(user: { telegramUser?: string | null; username?: string | null; firstName?: string | null; lastName?: string | null }) {
  return user.telegramUser || user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Joueur';
}

function parseCommand(text?: string): ParsedCommand | null {
  if (!text?.startsWith('/')) return null;
  const [rawCommand = '', ...rest] = text.trim().split(/\s+/);
  const command = rawCommand.slice(1).split('@')[0]?.toLowerCase();
  if (!command) return null;
  return { command, args: rest.join(' ') };
}

@Injectable()
export class TelegramUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramClientService,
    private readonly rankings: RankingsService,
    private readonly scores: ScoresService,
    private readonly timerScheduler: TelegramTimerSchedulerService,
    @InjectQueue(QUEUE_NAMES.telegramJobs) private readonly telegramQueue: Queue,
  ) {}

  async handleUpdate(update: TelegramUpdatePayload, options: { dryRun?: boolean } = {}): Promise<TelegramCommandResult> {
    if (options.dryRun) {
      return this.telegram.runWithDryRun(() => this.handleUpdateInternal(update));
    }
    return this.handleUpdateInternal(update);
  }

  private async handleUpdateInternal(update: TelegramUpdatePayload): Promise<TelegramCommandResult> {
    this.telegram.drainSentMessages();

    const message = update.message || update.edited_message || update.callback_query?.message;
    if (!message?.text || !message.from) {
      return this.result(false, undefined, message?.chat.id);
    }

    const parsed = parseCommand(message.text);
    if (!parsed) return this.result(false, undefined, message.chat.id);

    await this.dispatch(message, parsed);
    return this.result(true, parsed.command, message.chat.id);
  }

  private result(handled: boolean, command?: string, chatId?: string | number): TelegramCommandResult {
    return {
      ok: true,
      handled,
      command,
      chatId: chatId ? String(chatId) : undefined,
      dryRun: this.telegram.dryRun,
      messages: this.telegram.drainSentMessages(),
    };
  }

  private async dispatch(message: TelegramMessagePayload, parsed: ParsedCommand) {
    const handlers: Record<string, (message: TelegramMessagePayload, args: string) => Promise<void>> = {
      start: this.start.bind(this),
      help: this.help.bind(this),
      app: this.app.bind(this),
      activities: this.activities.bind(this),
      createactivity: this.createActivity.bind(this),
      create_activity: this.createActivity.bind(this),
      addsubactivity: this.addSubActivity.bind(this),
      history: this.history.bind(this),
      score: this.score.bind(this),
      ranking: this.ranking.bind(this),
      stats: this.stats.bind(this),
      createteam: this.createTeam.bind(this),
      addtoteam: this.addToTeam.bind(this),
      teamranking: this.teamRanking.bind(this),
      deleteactivity: this.deleteActivity.bind(this),
      deleteteam: this.deleteTeam.bind(this),
      deletescore: this.deleteScore.bind(this),
      subscore: this.subScore.bind(this),
      subranking: this.subRanking.bind(this),
      aranking: this.ranking.bind(this),
      shistory: this.history.bind(this),
      report: this.report.bind(this),
      export: this.exportData.bind(this),
      feedback: this.feedback.bind(this),
      starttimer: this.startTimer.bind(this),
      stoptimer: this.stopTimer.bind(this),
    };

    const handler = handlers[parsed.command] || this.unknown.bind(this);
    try {
      await handler(message, parsed.args);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Erreur inconnue';
      await this.telegram.sendMessage(message.chat.id, `❌ ${messageText}`);
    }
  }

  private async ensureUser(from: TelegramUserPayload) {
    return this.prisma.user.upsert({
      where: { telegramId: String(from.id) },
      update: {
        telegramUser: from.username || null,
        firstName: from.first_name || null,
        lastName: from.last_name || null,
      },
      create: {
        telegramId: String(from.id),
        telegramUser: from.username || null,
        username: from.username ? `tg_${from.username}` : null,
        firstName: from.first_name || null,
        lastName: from.last_name || null,
        role: GlobalRole.user,
      },
      select: { id: true, telegramId: true, telegramUser: true, username: true, firstName: true, lastName: true },
    });
  }

  private async ensureGroup(message: TelegramMessagePayload, userId: string) {
    const chat = message.chat;
    const group = await this.prisma.telegramGroup.upsert({
      where: { chatId: String(chat.id) },
      update: {
        title: chat.title || chat.username || chat.first_name || `Chat ${chat.id}`,
        type: normalizeChatType(chat.type),
        isActive: true,
      },
      create: {
        chatId: String(chat.id),
        title: chat.title || chat.username || chat.first_name || `Chat ${chat.id}`,
        type: normalizeChatType(chat.type),
        isActive: true,
      },
      select: { id: true, chatId: true, title: true, type: true },
    });

    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId } },
      update: { lastSeen: new Date() },
      create: {
        groupId: group.id,
        userId,
        role: GroupRole.member,
      },
    });

    await this.prisma.groupStats.upsert({
      where: { groupId: group.id },
      update: {},
      create: { groupId: group.id },
    });

    return group;
  }

  private async ensureContext(message: TelegramMessagePayload) {
    if (!message.from) throw new BadRequestException('Telegram user missing');
    const user = await this.ensureUser(message.from);
    const group = await this.ensureGroup(message, user.id);
    return { user, group };
  }

  private async start(message: TelegramMessagePayload, args: string) {
    const { user } = await this.ensureContext(message);

    if (message.chat.type === 'private' && args.startsWith('app_chat')) {
      const chatId = `-${args.replace('app_chat', '')}`;
      const group = await this.prisma.telegramGroup.findUnique({ where: { chatId } });
      if (group) {
        await this.prisma.groupMember.upsert({
          where: { groupId_userId: { groupId: group.id, userId: user.id } },
          update: { lastSeen: new Date() },
          create: { groupId: group.id, userId: user.id },
        });
      }
    }

    await this.telegram.sendMessage(
      message.chat.id,
      `✅ Profil Scory prêt.\n\nTape /help pour voir les commandes ou /app pour ouvrir l'application.`,
    );
  }

  private async help(message: TelegramMessagePayload) {
    await this.telegram.sendMessage(
      message.chat.id,
      [
        '📚 <b>Commandes Scory</b>',
        '',
        '/start - Initialiser ton profil',
        '/app - Ouvrir la WebApp',
        '/activities - Lister les activités',
        '/createactivity nom [description] - Créer une activité',
        '/addsubactivity activité nom [score_max] [description] - Ajouter une variante',
        '/score @user activité points [commentaire] - Ajouter un score',
        '/ranking [activité] - Voir le classement',
        '/stats [activité] - Voir les stats',
        '/report [7d|30d|all] - Rapport lisible du groupe',
        '/export [scores|activities|teams] [7d|30d|all] - Ancienne commande, génère un rapport lisible',
        '/createteam nom [description] - Créer une équipe',
        '/addtoteam @user équipe - Ajouter un membre',
        '/teamranking - Classement des équipes',
        '/starttimer nom durée_minutes - Lancer un timer',
        '/stoptimer [nom] - Arrêter un timer',
      ].join('\n'),
      { parse_mode: 'HTML' },
    );
  }

  private async app(message: TelegramMessagePayload) {
    await this.ensureContext(message);
    const webAppUrl = env.WEB_APP_URL || 'http://localhost:5173';
    const chatId = String(message.chat.id);

    if (message.chat.type === 'private' && webAppUrl.startsWith('https://')) {
      await this.telegram.sendMessage(message.chat.id, '🎯 <b>Scory App</b>\n\nOuvre le tableau de bord complet.', {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🚀 Ouvrir Scory App', web_app: { url: webAppUrl } }]],
        },
      });
      return;
    }

    const botUsername = await this.telegram.getBotUsername();
    if (!botUsername) {
      await this.telegram.sendMessage(message.chat.id, '❌ Bot Telegram non configuré pour ouvrir Scory en privé.');
      return;
    }

    await this.telegram.sendMessage(message.chat.id, '🎯 <b>Scory App</b>\n\nOuvre Scory en privé avec le bot.', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 Ouvrir Scory', url: `https://t.me/${botUsername}?start=app_chat${Math.abs(Number(chatId))}` }]],
      },
    });
  }

  private async activities(message: TelegramMessagePayload) {
    const { group } = await this.ensureContext(message);
    const activities = await this.prisma.activity.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { subActivities: true, stats: true },
    });

    if (activities.length === 0) {
      await this.telegram.sendMessage(message.chat.id, '📋 Aucune activité pour ce groupe.');
      return;
    }

    const lines = activities.flatMap(activity => {
      const description = activity.description ? ` - ${escapeHtml(activity.description)}` : '';

      return [
        `🏷 <b>${escapeHtml(activity.name)}</b>${description}`,
        ...activity.subActivities.map(sub => `  └ ${escapeHtml(sub.name)} (${sub.maxScore})`),
      ];
    });
    await this.telegram.sendMessage(message.chat.id, `📋 <b>Activités</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  }

  private async createActivity(message: TelegramMessagePayload, args: string) {
    const { user, group } = await this.ensureContext(message);
    const [name, ...descriptionParts] = args.trim().split(/\s+/);
    if (!name) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /createactivity nom_activité [description]');
      return;
    }

    const activity = await this.prisma.activity.create({
      data: {
        groupId: group.id,
        name,
        description: descriptionParts.join(' ') || null,
        type: ActivityType.other,
        createdById: user.id,
      },
    });

    await this.prisma.groupStats.upsert({
      where: { groupId: group.id },
      update: { totalActivities: { increment: 1 } },
      create: { groupId: group.id, totalActivities: 1 },
    });

    await this.telegram.sendMessage(message.chat.id, `✅ Activité créée: <b>${escapeHtml(activity.name)}</b>`, {
      parse_mode: 'HTML',
    });
  }

  private async addSubActivity(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const [activityName, subName, maybeMaxScore, ...descriptionParts] = args.trim().split(/\s+/);
    if (!activityName || !subName) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /addsubactivity activité nom_sous_activité [score_max] [description]');
      return;
    }

    const activity = await this.findActivityByName(group.id, activityName);
    if (!activity) {
      await this.telegram.sendMessage(message.chat.id, `❌ Activité "${activityName}" introuvable.`);
      return;
    }
    if (!(await this.canManageResource(message, group.id, activity.createdById))) {
      await this.telegram.sendMessage(message.chat.id, `❌ Permission refusée pour modifier "${activityName}".`);
      return;
    }

    const parsedMax = Number.parseInt(maybeMaxScore || '', 10);
    const maxScore = Number.isFinite(parsedMax) ? parsedMax : 100;
    const description = Number.isFinite(parsedMax) ? descriptionParts.join(' ') : [maybeMaxScore, ...descriptionParts].filter(Boolean).join(' ');

    await this.prisma.subActivity.create({
      data: {
        activityId: activity.id,
        name: subName,
        maxScore,
        description: description || null,
      },
    });

    await this.telegram.sendMessage(message.chat.id, `✅ Sous-activité ajoutée: <b>${escapeHtml(activity.name)} → ${escapeHtml(subName)}</b>`, {
      parse_mode: 'HTML',
    });
  }

  private async score(message: TelegramMessagePayload, args: string) {
    const { user, group } = await this.ensureContext(message);
    const [target, activityName, pointsRaw, ...commentParts] = args.trim().split(/\s+/);
    const value = Number.parseInt(pointsRaw || '', 10);
    if (!target || !activityName || !Number.isFinite(value)) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /score @utilisateur activité points [commentaire]');
      return;
    }

    const targetUser = await this.findUserByTarget(target);
    if (!targetUser) {
      await this.telegram.sendMessage(message.chat.id, `❌ Utilisateur "${target}" introuvable. Il doit d'abord utiliser /start.`);
      return;
    }

    const isMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: targetUser.id } },
      select: { id: true },
    });
    if (!isMember) {
      await this.telegram.sendMessage(message.chat.id, `❌ ${escapeHtml(displayName(targetUser))} n'est pas membre de ce groupe.`);
      return;
    }

    const activity = await this.findActivityByName(group.id, activityName);
    if (!activity) {
      await this.telegram.sendMessage(message.chat.id, `❌ Activité "${activityName}" introuvable.`);
      return;
    }

    await this.scores.createScore({
      actorId: user.id,
      chatId: group.chatId,
      activityId: activity.id,
      userId: targetUser.id,
      value,
      maxPossible: 100,
      context: 'individual',
      comments: commentParts.join(' ') || undefined,
    });

    await this.telegram.sendMessage(
      message.chat.id,
      `✅ Score ajouté.\n\n👤 <b>${escapeHtml(displayName(targetUser))}</b>\n🏷 ${escapeHtml(activity.name)}\n🔢 ${value} pts`,
      { parse_mode: 'HTML' },
    );
  }

  private async subScore(message: TelegramMessagePayload, args: string) {
    const [target, activityName, subName, pointsRaw, ...commentParts] = args.trim().split(/\s+/);
    if (!target || !activityName || !subName || !pointsRaw) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /subscore @utilisateur activité sous_activité points [commentaire]');
      return;
    }

    const { user, group } = await this.ensureContext(message);
    const value = Number.parseInt(pointsRaw, 10);
    if (!Number.isFinite(value)) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /subscore @utilisateur activité sous_activité points [commentaire]');
      return;
    }

    const targetUser = await this.findUserByTarget(target);
    const activity = await this.findActivityByName(group.id, activityName);
    if (!targetUser || !activity) {
      await this.telegram.sendMessage(message.chat.id, '❌ Utilisateur ou activité introuvable.');
      return;
    }

    const subActivity = await this.prisma.subActivity.findFirst({
      where: { activityId: activity.id, name: { equals: subName, mode: 'insensitive' } },
      select: { id: true, name: true, maxScore: true },
    });
    if (!subActivity) {
      await this.telegram.sendMessage(message.chat.id, `❌ Sous-activité "${subName}" introuvable.`);
      return;
    }

    await this.scores.createScore({
      actorId: user.id,
      chatId: group.chatId,
      activityId: activity.id,
      subActivityId: subActivity.id,
      userId: targetUser.id,
      value,
      maxPossible: subActivity.maxScore,
      context: 'individual',
      comments: commentParts.join(' ') || undefined,
    });

    await this.telegram.sendMessage(
      message.chat.id,
      `✅ Score ajouté.\n\n👤 <b>${escapeHtml(displayName(targetUser))}</b>\n🏷 ${escapeHtml(activity.name)} → ${escapeHtml(subActivity.name)}\n🔢 ${value} pts`,
      { parse_mode: 'HTML' },
    );
  }

  private async ranking(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const activityName = args.trim();
    const activity = activityName ? await this.findActivityByName(group.id, activityName) : null;
    if (activityName && !activity) {
      await this.telegram.sendMessage(message.chat.id, `❌ Activité "${activityName}" introuvable.`);
      return;
    }

    const ranking = await this.rankings.getSnapshot({
      groupId: group.id,
      scope: RankingScope.individual,
      period: RankingPeriod.month,
      activityId: activity?.id,
    });

    if (ranking.items.length === 0) {
      await this.telegram.sendMessage(message.chat.id, '🏆 Aucun score dans ce classement.');
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = ranking.items.slice(0, 10).map((item, index) => {
      const rank = medals[index] || `#${index + 1}`;
      return `${rank} <b>${escapeHtml(item.name)}</b>: ${item.totalScore} pts`;
    });
    await this.telegram.sendMessage(message.chat.id, `🏆 <b>Classement</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  }

  private async subRanking(message: TelegramMessagePayload, args: string) {
    await this.ranking(message, args);
  }

  private async history(message: TelegramMessagePayload) {
    const { group } = await this.ensureContext(message);
    const scores = await this.prisma.score.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        activity: { select: { name: true } },
        user: { select: { telegramUser: true, username: true, firstName: true, lastName: true } },
      },
    });

    if (scores.length === 0) {
      await this.telegram.sendMessage(message.chat.id, '📊 Aucun historique de score.');
      return;
    }

    const lines = scores.map(score => {
      const user = score.user ? displayName(score.user) : 'Joueur';
      return `• ${escapeHtml(user)} - ${escapeHtml(score.activity.name)}: ${score.value} pts`;
    });
    await this.telegram.sendMessage(message.chat.id, `📊 <b>Derniers scores</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  }

  private async stats(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const activityName = args.trim();
    const activity = activityName ? await this.findActivityByName(group.id, activityName) : null;
    if (activityName && !activity) {
      await this.telegram.sendMessage(message.chat.id, `❌ Activité "${activityName}" introuvable.`);
      return;
    }

    const [scoreCount, scoreSum, activityCount, teamCount] = await Promise.all([
      this.prisma.score.count({ where: { groupId: group.id, ...(activity && { activityId: activity.id }) } }),
      this.prisma.score.aggregate({ where: { groupId: group.id, ...(activity && { activityId: activity.id }) }, _sum: { value: true } }),
      this.prisma.activity.count({ where: { groupId: group.id } }),
      this.prisma.team.count({ where: { groupId: group.id } }),
    ]);

    await this.telegram.sendMessage(
      message.chat.id,
      [
        '📈 <b>Stats Scory</b>',
        '',
        `Scores: <b>${scoreCount}</b>`,
        `Points: <b>${scoreSum._sum.value || 0}</b>`,
        `Activités: <b>${activityCount}</b>`,
        `Équipes: <b>${teamCount}</b>`,
      ].join('\n'),
      { parse_mode: 'HTML' },
    );
  }

  private async createTeam(message: TelegramMessagePayload, args: string) {
    const { user, group } = await this.ensureContext(message);
    const [name, ...descriptionParts] = args.trim().split(/\s+/);
    if (!name) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /createteam nom_équipe [description]');
      return;
    }

    const team = await this.prisma.team.create({
      data: {
        groupId: group.id,
        name,
        description: descriptionParts.join(' ') || null,
        createdById: user.id,
        members: { create: { userId: user.id, isAdmin: true } },
      },
    });

    await this.prisma.groupStats.upsert({
      where: { groupId: group.id },
      update: { totalTeams: { increment: 1 } },
      create: { groupId: group.id, totalTeams: 1 },
    });

    await this.telegram.sendMessage(message.chat.id, `✅ Équipe créée: <b>${escapeHtml(team.name)}</b>`, { parse_mode: 'HTML' });
  }

  private async addToTeam(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const [target, teamName] = args.trim().split(/\s+/);
    if (!target || !teamName) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /addtoteam @utilisateur équipe');
      return;
    }

    const [targetUser, team] = await Promise.all([
      this.findUserByTarget(target),
      this.findTeamByName(group.id, teamName),
    ]);
    if (!targetUser || !team) {
      await this.telegram.sendMessage(message.chat.id, '❌ Utilisateur ou équipe introuvable.');
      return;
    }

    await this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: targetUser.id } },
      update: { lastSeen: new Date() },
      create: { groupId: group.id, userId: targetUser.id },
    });
    await this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: targetUser.id } },
      update: {},
      create: { teamId: team.id, userId: targetUser.id },
    });

    await this.telegram.sendMessage(message.chat.id, `✅ ${escapeHtml(displayName(targetUser))} ajouté à ${escapeHtml(team.name)}.`, {
      parse_mode: 'HTML',
    });
  }

  private async teamRanking(message: TelegramMessagePayload) {
    const { group } = await this.ensureContext(message);
    const ranking = await this.rankings.getSnapshot({
      groupId: group.id,
      scope: RankingScope.team,
      period: RankingPeriod.month,
    });

    if (ranking.items.length === 0) {
      await this.telegram.sendMessage(message.chat.id, '🏆 Aucun score équipe.');
      return;
    }

    const lines = ranking.items.slice(0, 10).map((item, index) => `#${index + 1} <b>${escapeHtml(item.name)}</b>: ${item.totalScore} pts`);
    await this.telegram.sendMessage(message.chat.id, `🏆 <b>Classement équipes</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  }

  private async deleteActivity(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const activity = await this.findActivityByName(group.id, args.trim());
    if (!activity) {
      await this.telegram.sendMessage(message.chat.id, '❌ Activité introuvable.');
      return;
    }
    if (!(await this.canManageResource(message, group.id, activity.createdById))) {
      await this.telegram.sendMessage(message.chat.id, '❌ Permission refusée pour supprimer cette activité.');
      return;
    }

    await this.prisma.activity.delete({ where: { id: activity.id } });
    await this.prisma.groupStats.upsert({
      where: { groupId: group.id },
      update: { totalActivities: { decrement: 1 } },
      create: { groupId: group.id },
    });
    await this.telegram.sendMessage(message.chat.id, `🗑 Activité supprimée: ${escapeHtml(activity.name)}`, { parse_mode: 'HTML' });
  }

  private async deleteTeam(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const team = await this.findTeamByName(group.id, args.trim());
    if (!team) {
      await this.telegram.sendMessage(message.chat.id, '❌ Équipe introuvable.');
      return;
    }
    if (!(await this.canManageResource(message, group.id, team.createdById))) {
      await this.telegram.sendMessage(message.chat.id, '❌ Permission refusée pour supprimer cette équipe.');
      return;
    }

    await this.prisma.team.delete({ where: { id: team.id } });
    await this.prisma.groupStats.upsert({
      where: { groupId: group.id },
      update: { totalTeams: { decrement: 1 } },
      create: { groupId: group.id },
    });
    await this.telegram.sendMessage(message.chat.id, `🗑 Équipe supprimée: ${escapeHtml(team.name)}`, { parse_mode: 'HTML' });
  }

  private async deleteScore(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const scoreId = args.trim();
    if (!scoreId) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /deletescore score_id');
      return;
    }

    const score = await this.prisma.score.findFirst({
      where: { id: scoreId, groupId: group.id },
      select: { id: true, awardedById: true },
    });
    if (!score) {
      await this.telegram.sendMessage(message.chat.id, '❌ Score introuvable.');
      return;
    }
    if (!(await this.canManageResource(message, group.id, score.awardedById))) {
      await this.telegram.sendMessage(message.chat.id, '❌ Permission refusée pour supprimer ce score.');
      return;
    }

    await this.scores.deleteScore({ actorId: (await this.ensureUser(message.from as TelegramUserPayload)).id, scoreId: score.id });
    await this.telegram.sendMessage(message.chat.id, '🗑 Score supprimé.');
  }

  private async report(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const period = this.parseReportPeriod(args.trim());

    if (!period) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /report [7d|30d|all]');
      return;
    }

    await this.queueReport({
      groupId: group.id,
      chatId: group.chatId,
      period,
      scope: 'summary',
    });

    await this.telegram.sendMessage(message.chat.id, `📊 Rapport ${period} en préparation...`);
  }

  private async exportData(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const { scope, period } = this.parseExportRequest(args.trim());

    if (!scope || !period) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /export [scores|activities|teams] [7d|30d|all]');
      return;
    }

    await this.queueReport({
      groupId: group.id,
      chatId: group.chatId,
      period,
      scope,
    });

    await this.telegram.sendMessage(
      message.chat.id,
      `📦 Export CSV remplacé par un rapport lisible.\nRapport ${scope} ${period} en préparation...`,
    );
  }

  private async queueReport(input: {
    groupId: string;
    chatId: string;
    period: TelegramReportPeriod;
    scope: TelegramReportScope;
  }) {
    if (this.telegram.dryRun) return;

    await this.telegramQueue.add(
      JOB_NAMES.telegramReportRequested,
      input,
      {
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  private parseReportPeriod(value: string): TelegramReportPeriod | null {
    const period = value.trim().toLowerCase() || '7d';
    if (period === '7d' || period === '30d' || period === 'all') return period;
    return null;
  }

  private parseExportRequest(value: string): {
    scope: TelegramReportScope | null;
    period: TelegramReportPeriod | null;
  } {
    const parts = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const defaultScope: TelegramReportScope = 'summary';
    const defaultPeriod: TelegramReportPeriod = '7d';
    let scope: TelegramReportScope = defaultScope;
    let period: TelegramReportPeriod = defaultPeriod;

    for (const part of parts) {
      if (part === 'scores' || part === 'activities' || part === 'teams') {
        scope = part;
        continue;
      }
      const parsedPeriod = this.parseReportPeriod(part);
      if (parsedPeriod) {
        period = parsedPeriod;
        continue;
      }

      return { scope: null, period: null };
    }

    return { scope, period };
  }

  private async feedback(message: TelegramMessagePayload, args: string) {
    const { user, group } = await this.ensureContext(message);
    const [category, ...messageParts] = args.trim().split(/\s+/);
    const feedbackMessage = messageParts.length > 0 ? messageParts.join(' ') : args.trim();
    const normalizedCategory = messageParts.length > 0 ? category : null;

    if (!feedbackMessage) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /feedback [categorie] message');
      return;
    }

    await this.prisma.feedback.create({
      data: {
        groupId: group.id,
        userId: user.id,
        category: normalizedCategory,
        message: feedbackMessage,
      },
    });

    await this.telegram.sendMessage(message.chat.id, '✅ Feedback enregistré. Merci.');
  }

  private async startTimer(message: TelegramMessagePayload, args: string) {
    const { user, group } = await this.ensureContext(message);
    const parts = args.trim().split(/\s+/).filter(Boolean);
    const durationRaw = parts.pop();
    const name = parts.join(' ');
    const durationMin = Number.parseInt(durationRaw || '', 10);

    if (!name || !Number.isFinite(durationMin) || durationMin <= 0) {
      await this.telegram.sendMessage(message.chat.id, 'Format: /starttimer nom du timer durée_minutes');
      return;
    }

    const now = new Date();
    const timer = await this.prisma.timer.create({
      data: {
        groupId: group.id,
        name,
        durationMin,
        startedAt: now,
        endsAt: new Date(now.getTime() + durationMin * 60_000),
        status: TimerStatus.running,
        createdById: user.id,
      },
    });

    if (!this.telegram.dryRun) {
      await this.timerScheduler.scheduleTimer({
        timerId: timer.id,
        chatId: group.chatId,
        endsAt: timer.endsAt,
      });
    }

    await this.telegram.sendMessage(
      message.chat.id,
      `⏱ Timer lancé: <b>${escapeHtml(timer.name)}</b>\nDurée: ${durationMin} min`,
      { parse_mode: 'HTML' },
    );
  }

  private async stopTimer(message: TelegramMessagePayload, args: string) {
    const { group } = await this.ensureContext(message);
    const name = args.trim();
    const timer = await this.prisma.timer.findFirst({
      where: {
        groupId: group.id,
        status: TimerStatus.running,
        ...(name && { name: { equals: name, mode: 'insensitive' } }),
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!timer) {
      await this.telegram.sendMessage(message.chat.id, name ? `❌ Timer "${name}" introuvable.` : '❌ Aucun timer actif.');
      return;
    }

    if (!(await this.canManageResource(message, group.id, timer.createdById))) {
      await this.telegram.sendMessage(message.chat.id, '❌ Permission refusée pour arrêter ce timer.');
      return;
    }

    const stopped = await this.prisma.timer.update({
      where: { id: timer.id },
      data: { status: TimerStatus.stopped, stoppedAt: new Date() },
    });
    await this.timerScheduler.cancelTimer(timer.id);
    const elapsedMin = Math.max(0, Math.round((stopped.stoppedAt!.getTime() - stopped.startedAt.getTime()) / 60_000));

    await this.telegram.sendMessage(
      message.chat.id,
      `⏹ Timer arrêté: <b>${escapeHtml(stopped.name)}</b>\nTemps écoulé: ${elapsedMin} min`,
      { parse_mode: 'HTML' },
    );
  }

  private async unknown(message: TelegramMessagePayload) {
    await this.telegram.sendMessage(message.chat.id, '❓ Commande inconnue. Tape /help pour voir les commandes disponibles.');
  }

  private findActivityByName(groupId: string, name: string) {
    if (!name) return null;
    return this.prisma.activity.findFirst({
      where: { groupId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true, createdById: true },
    });
  }

  private findTeamByName(groupId: string, name: string) {
    if (!name) return null;
    return this.prisma.team.findFirst({
      where: { groupId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true, createdById: true },
    });
  }

  private async findUserByTarget(target: string) {
    const clean = target.startsWith('@') ? target.slice(1) : target;
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { telegramUser: { equals: clean, mode: 'insensitive' } },
          { username: { equals: clean, mode: 'insensitive' } },
          { telegramId: clean },
        ],
      },
      select: { id: true, telegramUser: true, username: true, firstName: true, lastName: true },
    });
  }

  private async canManageResource(message: TelegramMessagePayload, groupId: string, ownerId: string | null | undefined) {
    if (!message.from) return false;
    const actor = await this.ensureUser(message.from);
    if (ownerId && actor.id === ownerId) return true;

    const [fullActor, membership] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { role: true },
      }),
      this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: actor.id } },
        select: { role: true },
      }),
    ]);
    return fullActor?.role === GlobalRole.admin
      || fullActor?.role === GlobalRole.superadmin
      || membership?.role === GroupRole.admin
      || membership?.role === GroupRole.creator;
  }
}
