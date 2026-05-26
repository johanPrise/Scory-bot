import { MongoClient, ObjectId } from 'mongodb';
import {
  ActivityType,
  ChatType,
  GlobalRole,
  GroupRole,
  PrismaClient,
  ScoreContext,
  ScoreStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const mongoUrl = process.env.MONGO_URL;

type MongoDoc = Record<string, any>;

function mongoId(value: unknown) {
  return value instanceof ObjectId ? value.toHexString() : String(value || '');
}

function asDate(value: unknown) {
  const date = value ? new Date(value as string | Date) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeRole(value: unknown): GlobalRole {
  return value === 'admin' || value === 'superadmin' ? value : GlobalRole.user;
}

function normalizeGroupRole(value: unknown): GroupRole {
  if (value === 'admin' || value === 'creator') return value;
  if (value === 'administrator') return GroupRole.admin;
  return GroupRole.member;
}

function normalizeChatType(value: unknown): ChatType {
  if (value === 'private' || value === 'group' || value === 'supergroup' || value === 'channel') return value;
  return ChatType.group;
}

function normalizeActivityType(value: unknown): ActivityType {
  if (value === 'game' || value === 'sport' || value === 'education' || value === 'creative' || value === 'other') {
    return value;
  }
  return ActivityType.other;
}

function normalizeScoreStatus(value: unknown): ScoreStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'disputed') return value;
  return ScoreStatus.approved;
}

function normalizeScoreContext(value: unknown): ScoreContext {
  if (value === 'team' || value === 'group') return value;
  return ScoreContext.individual;
}

function normalizedScore(value: number, maxPossible: number) {
  if (!maxPossible || maxPossible <= 0) return 0;
  return Math.min(100, Math.round((value / maxPossible) * 100));
}

async function main() {
  if (!mongoUrl) throw new Error('MONGO_URL is required');

  const mongo = new MongoClient(mongoUrl);
  await mongo.connect();
  const db = mongo.db();

  const [users, groups, activities, teams, scores] = await Promise.all([
    db.collection('users').find().toArray() as Promise<MongoDoc[]>,
    db.collection('chatgroups').find().toArray() as Promise<MongoDoc[]>,
    db.collection('activities').find().toArray() as Promise<MongoDoc[]>,
    db.collection('teams').find().toArray() as Promise<MongoDoc[]>,
    db.collection('scores').find().toArray() as Promise<MongoDoc[]>,
  ]);

  const report = {
    dryRun,
    mongo: {
      users: users.length,
      groups: groups.length,
      activities: activities.length,
      teams: teams.length,
      scores: scores.length,
    },
  };

  if (dryRun) {
    console.log(JSON.stringify(report, null, 2));
    await mongo.close();
    await prisma.$disconnect();
    return;
  }

  const userByMongo = new Map<string, string>();
  const userByTelegram = new Map<string, string>();
  const groupByChatId = new Map<string, string>();
  const activityByMongo = new Map<string, string>();
  const subActivityByActivityAndName = new Map<string, string>();
  const teamByMongo = new Map<string, string>();
  const skipped = {
    memberships: 0,
    activities: 0,
    teams: 0,
    teamMembers: 0,
    scores: 0,
    reasons: {} as Record<string, number>,
  };

  const skip = (bucket: keyof Omit<typeof skipped, 'reasons'>, reason: string) => {
    skipped[bucket] += 1;
    skipped.reasons[reason] = (skipped.reasons[reason] || 0) + 1;
  };

  for (const user of users) {
    const saved = await prisma.user.upsert({
      where: { mongoId: mongoId(user._id) },
      update: {
        telegramId: user.telegram?.id ? String(user.telegram.id) : undefined,
        telegramUser: user.telegram?.username || undefined,
        firstName: user.firstName || user.telegram?.firstName || undefined,
        lastName: user.lastName || user.telegram?.lastName || undefined,
        role: normalizeRole(user.role),
        status: user.status || 'active',
      },
      create: {
        mongoId: mongoId(user._id),
        telegramId: user.telegram?.id ? String(user.telegram.id) : null,
        telegramUser: user.telegram?.username || null,
        username: user.username || null,
        firstName: user.firstName || user.telegram?.firstName || null,
        lastName: user.lastName || user.telegram?.lastName || null,
        role: normalizeRole(user.role),
        status: user.status || 'active',
        createdAt: asDate(user.createdAt),
        updatedAt: asDate(user.updatedAt),
      },
      select: { id: true, mongoId: true, telegramId: true },
    });
    if (saved.mongoId) userByMongo.set(saved.mongoId, saved.id);
    if (saved.telegramId) userByTelegram.set(saved.telegramId, saved.id);
  }

  for (const group of groups) {
    const saved = await prisma.telegramGroup.upsert({
      where: { chatId: String(group.chatId) },
      update: {
        title: group.title || `Groupe ${group.chatId}`,
        type: normalizeChatType(group.type),
        isActive: group.isActive !== false,
      },
      create: {
        mongoId: mongoId(group._id),
        chatId: String(group.chatId),
        title: group.title || `Groupe ${group.chatId}`,
        type: normalizeChatType(group.type),
        isActive: group.isActive !== false,
        createdAt: asDate(group.createdAt),
        updatedAt: asDate(group.updatedAt),
      },
      select: { id: true, chatId: true },
    });
    groupByChatId.set(saved.chatId, saved.id);

    for (const member of group.members || []) {
      const userId = userByMongo.get(mongoId(member.userId)) || userByTelegram.get(String(member.telegramId || ''));
      if (!userId) {
        skip('memberships', 'member_user_missing');
        continue;
      }
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: saved.id, userId } },
        update: {
          role: normalizeGroupRole(member.role),
          lastSeen: asDate(member.lastSeen),
        },
        create: {
          groupId: saved.id,
          userId,
          role: normalizeGroupRole(member.role),
          firstSeen: asDate(member.firstSeen),
          lastSeen: asDate(member.lastSeen),
        },
      });
    }
  }

  for (const team of teams) {
    const groupId = groupByChatId.get(String(team.chatId));
    const createdById = userByMongo.get(mongoId(team.createdBy));
    if (!groupId) {
      skip('teams', 'team_group_missing');
      continue;
    }
    if (!createdById) {
      skip('teams', 'team_creator_missing');
      continue;
    }

    const saved = await prisma.team.upsert({
      where: { mongoId: mongoId(team._id) },
      update: {
        name: team.name,
        description: team.description || null,
        joinCode: team.settings?.joinCode || null,
        maxMembers: team.settings?.maxMembers || 10,
        isPrivate: Boolean(team.settings?.isPrivate),
      },
      create: {
        mongoId: mongoId(team._id),
        groupId,
        name: team.name,
        description: team.description || null,
        joinCode: team.settings?.joinCode || null,
        maxMembers: team.settings?.maxMembers || 10,
        isPrivate: Boolean(team.settings?.isPrivate),
        createdById,
        createdAt: asDate(team.createdAt),
        updatedAt: asDate(team.updatedAt),
      },
      select: { id: true, mongoId: true },
    });
    if (saved.mongoId) teamByMongo.set(saved.mongoId, saved.id);

    for (const member of team.members || []) {
      const userId = userByMongo.get(mongoId(member.userId));
      if (!userId) {
        skip('teamMembers', 'team_member_user_missing');
        continue;
      }
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: saved.id, userId } },
        update: { isAdmin: Boolean(member.isAdmin) },
        create: {
          teamId: saved.id,
          userId,
          isAdmin: Boolean(member.isAdmin),
          joinedAt: asDate(member.joinedAt),
        },
      });
    }
  }

  for (const activity of activities) {
    const groupId = groupByChatId.get(String(activity.chatId));
    const createdById = userByMongo.get(mongoId(activity.createdBy));
    if (!groupId) {
      skip('activities', 'activity_group_missing');
      continue;
    }
    if (!createdById) {
      skip('activities', 'activity_creator_missing');
      continue;
    }

    const saved = await prisma.activity.upsert({
      where: { mongoId: mongoId(activity._id) },
      update: {
        name: activity.name,
        description: activity.description || null,
        type: normalizeActivityType(activity.type),
        teamId: activity.teamId ? teamByMongo.get(mongoId(activity.teamId)) : null,
        isActive: activity.settings?.isActive !== false,
      },
      create: {
        mongoId: mongoId(activity._id),
        groupId,
        name: activity.name,
        description: activity.description || null,
        type: normalizeActivityType(activity.type),
        createdById,
        teamId: activity.teamId ? teamByMongo.get(mongoId(activity.teamId)) : null,
        isActive: activity.settings?.isActive !== false,
        createdAt: asDate(activity.createdAt),
        updatedAt: asDate(activity.updatedAt),
      },
      select: { id: true, mongoId: true },
    });
    if (saved.mongoId) activityByMongo.set(saved.mongoId, saved.id);

    for (const sub of activity.subActivities || []) {
      const subName = sub.name || mongoId(sub._id);
      const subSaved = await prisma.subActivity.upsert({
        where: { activityId_name: { activityId: saved.id, name: subName } },
        update: {
          description: sub.description || null,
          maxScore: sub.maxScore || 100,
        },
        create: {
          mongoId: sub._id ? mongoId(sub._id) : null,
          activityId: saved.id,
          name: subName,
          description: sub.description || null,
          maxScore: sub.maxScore || 100,
          createdAt: asDate(sub.createdAt),
        },
        select: { id: true, name: true },
      });
      subActivityByActivityAndName.set(`${saved.id}:${subSaved.name}`, subSaved.id);
    }
  }

  for (const score of scores) {
    const groupId = groupByChatId.get(String(score.metadata?.chatId));
    const activityId = activityByMongo.get(mongoId(score.activity));
    const awardedById = userByMongo.get(mongoId(score.awardedBy)) || userByMongo.get(mongoId(score.user));
    if (!groupId) {
      skip('scores', 'score_group_missing');
      continue;
    }
    if (!activityId) {
      skip('scores', 'score_activity_missing');
      continue;
    }
    if (!awardedById) {
      skip('scores', 'score_awarder_missing');
      continue;
    }

    const value = Number(score.value || 0);
    const maxPossible = Number(score.maxPossible || 100);
    const context = normalizeScoreContext(score.context);
    const userId = score.user ? userByMongo.get(mongoId(score.user)) : null;
    const teamId = score.team ? teamByMongo.get(mongoId(score.team)) : null;
    const subActivityId = score.subActivity
      ? subActivityByActivityAndName.get(`${activityId}:${score.subActivity}`) || null
      : null;

    await prisma.score.upsert({
      where: { mongoId: mongoId(score._id) },
      update: {
        status: normalizeScoreStatus(score.status),
        value,
        maxPossible,
        normalizedScore: Number(score.normalizedScore ?? normalizedScore(value, maxPossible)),
      },
      create: {
        mongoId: mongoId(score._id),
        groupId,
        userId,
        teamId,
        activityId,
        subActivityId,
        value,
        maxPossible,
        normalizedScore: Number(score.normalizedScore ?? normalizedScore(value, maxPossible)),
        context,
        status: normalizeScoreStatus(score.status),
        awardedById,
        reviewedById: score.reviewedBy ? userByMongo.get(mongoId(score.reviewedBy)) : null,
        reviewedAt: score.reviewedAt ? asDate(score.reviewedAt) : null,
        rejectionReason: score.rejectionReason || null,
        comments: score.metadata?.comments || null,
        evidence: score.metadata?.evidence || null,
        createdAt: asDate(score.createdAt),
        updatedAt: asDate(score.updatedAt),
      },
    });
  }

  const postgres = {
    users: await prisma.user.count(),
    groups: await prisma.telegramGroup.count(),
    memberships: await prisma.groupMember.count(),
    activities: await prisma.activity.count(),
    subActivities: await prisma.subActivity.count(),
    teams: await prisma.team.count(),
    teamMembers: await prisma.teamMember.count(),
    scores: await prisma.score.count(),
  };

  console.log(JSON.stringify({ ...report, postgres, skipped }, null, 2));

  await mongo.close();
  await prisma.$disconnect();
}

main().catch(async error => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
