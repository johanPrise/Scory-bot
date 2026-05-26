import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const apiUrl = (process.env.API_URL || 'http://127.0.0.1:3101').replace(/\/$/, '');

async function request(path: string, userId: string) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { 'x-scory-user-id': userId },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function expectStatus(path: string, userId: string, expectedStatus: number) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { 'x-scory-user-id': userId },
  });
  if (response.status !== expectedStatus) {
    const body = await response.text().catch(() => '');
    throw new Error(`${path} returned ${response.status}, expected ${expectedStatus}: ${body}`);
  }
}

function assertObject(value: unknown, label: string): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} did not return an object`);
  }
}

async function main() {
  const membership = await prisma.groupMember.findFirst({
    include: { group: true, user: true },
    orderBy: { lastSeen: 'desc' },
  });
  if (!membership) throw new Error('No group membership found for smoke test');

  const chatId = encodeURIComponent(membership.group.chatId);
  const userId = membership.user.id;

  const home = await request(`/api/mobile/home?chatId=${chatId}`, userId);
  assertObject(home, 'home');
  if (!home.group || !home.stats || !Array.isArray(home.recentScores)) {
    throw new Error('home contract is missing group, stats, or recentScores');
  }

  const rankings = await request(`/api/mobile/rankings?chatId=${chatId}&scope=individual&period=month`, userId);
  assertObject(rankings, 'rankings');
  if (!Array.isArray(rankings.items) || !rankings.generatedAt) {
    throw new Error('rankings contract is missing items or generatedAt');
  }

  const activities = await request(`/api/mobile/activities?chatId=${chatId}`, userId);
  assertObject(activities, 'activities');
  if (!Array.isArray(activities.activities) || !('nextCursor' in activities)) {
    throw new Error('activities contract is missing activities or nextCursor');
  }

  const teams = await request(`/api/mobile/teams?chatId=${chatId}`, userId);
  assertObject(teams, 'teams');
  if (!Array.isArray(teams.teams) || !('nextCursor' in teams)) {
    throw new Error('teams contract is missing teams or nextCursor');
  }

  await expectStatus(`/api/mobile/home?chatId=${chatId}`, randomUUID(), 403);

  console.log(JSON.stringify({
    ok: true,
    apiUrl,
    group: { id: membership.group.id, chatId: membership.group.chatId },
    user: { id: userId, telegramId: membership.user.telegramId },
    checks: {
      home: true,
      rankings: true,
      activities: true,
      teams: true,
      groupAccessDenied: true,
    },
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(async error => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
