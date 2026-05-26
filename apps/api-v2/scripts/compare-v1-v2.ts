import { MongoClient, ObjectId } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const mongoUrl = process.env.MONGO_URL;

type MongoDoc = Record<string, any>;
type SkipBucket = 'activities' | 'teams' | 'teamMembers' | 'scores';

function mongoId(value: unknown) {
  return value instanceof ObjectId ? value.toHexString() : String(value || '');
}

function increment(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
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

  const userByMongo = new Set(users.map(user => mongoId(user._id)));
  const userByTelegram = new Set(users.map(user => String(user.telegram?.id || '')).filter(Boolean));
  const groupByChatId = new Set(groups.map(group => String(group.chatId)));
  const importableActivities = new Set<string>();
  const importableTeams = new Set<string>();
  let importableTeamMembers = 0;

  const skipped = {
    activities: 0,
    teams: 0,
    teamMembers: 0,
    scores: 0,
    reasons: {} as Record<string, number>,
  };

  const skip = (bucket: SkipBucket, reason: string) => {
    skipped[bucket] += 1;
    increment(skipped.reasons, reason);
  };

  const importableMemberships = groups.reduce((count, group) => {
    return count + (group.members || []).filter((member: MongoDoc) => {
      return userByMongo.has(mongoId(member.userId)) || userByTelegram.has(String(member.telegramId || ''));
    }).length;
  }, 0);

  for (const team of teams) {
    if (!groupByChatId.has(String(team.chatId))) {
      skip('teams', 'team_group_missing');
      continue;
    }
    if (!userByMongo.has(mongoId(team.createdBy))) {
      skip('teams', 'team_creator_missing');
      continue;
    }
    importableTeams.add(mongoId(team._id));

    for (const member of team.members || []) {
      if (!userByMongo.has(mongoId(member.userId))) {
        skip('teamMembers', 'team_member_user_missing');
        continue;
      }
      importableTeamMembers += 1;
    }
  }

  for (const activity of activities) {
    if (!groupByChatId.has(String(activity.chatId))) {
      skip('activities', 'activity_group_missing');
      continue;
    }
    if (!userByMongo.has(mongoId(activity.createdBy))) {
      skip('activities', 'activity_creator_missing');
      continue;
    }
    importableActivities.add(mongoId(activity._id));
  }

  for (const score of scores) {
    if (!groupByChatId.has(String(score.metadata?.chatId))) {
      skip('scores', 'score_group_missing');
      continue;
    }
    if (!importableActivities.has(mongoId(score.activity))) {
      skip('scores', 'score_activity_missing');
      continue;
    }
    const awardedBy = mongoId(score.awardedBy) || mongoId(score.user);
    if (!userByMongo.has(awardedBy)) {
      skip('scores', 'score_awarder_missing');
    }
  }

  const mongoRaw = {
    users: users.length,
    groups: groups.length,
    memberships: groups.reduce((count, group) => count + (group.members || []).length, 0),
    activities: activities.length,
    teams: teams.length,
    teamMembers: teams.reduce((count, team) => count + (team.members || []).length, 0),
    scores: scores.length,
  };

  const mongoImportable = {
    users: users.length,
    groups: groups.length,
    memberships: importableMemberships,
    activities: importableActivities.size,
    teams: importableTeams.size,
    teamMembers: importableTeamMembers,
    scores: mongoRaw.scores - skipped.scores,
  };

  const postgres = {
    users: await prisma.user.count(),
    groups: await prisma.telegramGroup.count(),
    memberships: await prisma.groupMember.count(),
    activities: await prisma.activity.count(),
    teams: await prisma.team.count(),
    teamMembers: await prisma.teamMember.count(),
    scores: await prisma.score.count(),
  };

  const deltas = Object.fromEntries(
    Object.entries(mongoImportable).map(([key, expected]) => [
      key,
      (postgres as Record<string, number>)[key] - expected,
    ]),
  );

  console.log(JSON.stringify({ mongoRaw, mongoImportable, postgres, deltas, skipped }, null, 2));

  await mongo.close();
  await prisma.$disconnect();
}

main().catch(async error => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
