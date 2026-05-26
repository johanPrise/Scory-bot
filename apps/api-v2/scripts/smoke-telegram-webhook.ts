import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apiUrl = (process.env.API_URL || 'http://127.0.0.1:3101').replace(/\/$/, '');
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const dryRun = process.env.SMOKE_TELEGRAM_DRY_RUN !== 'false';
const runId = Date.now();
const chatId = Number(process.env.SMOKE_TELEGRAM_CHAT_ID || `-100${runId}`);
const userId = Number(process.env.SMOKE_TELEGRAM_USER_ID || `${runId}`.slice(-9));
const username = process.env.SMOKE_TELEGRAM_USERNAME || `scory_smoke_${userId}`;

type SmokeResponse = {
  ok: boolean;
  handled: boolean;
  command?: string;
  messages?: Array<{ text: string }>;
};

async function sendCommand(text: string): Promise<SmokeResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (webhookSecret) {
    headers['x-telegram-bot-api-secret-token'] = webhookSecret;
  }
  if (dryRun) {
    headers['x-scory-telegram-dry-run'] = '1';
  }

  const response = await fetch(`${apiUrl}/telegram/webhook`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      update_id: Date.now(),
      message: {
        message_id: Math.floor(Math.random() * 1_000_000),
        chat: { id: chatId, type: 'supergroup', title: 'Scory v2 smoke' },
        from: { id: userId, username, first_name: 'Smoke', last_name: 'Tester' },
        text,
      },
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${text} returned ${response.status}: ${JSON.stringify(body)}`);
  }
  if (!body?.ok || !body.handled) {
    throw new Error(`${text} was not handled: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const commands = [
    '/start',
    `/createactivity smoke_${userId} Test backend v2`,
    `/addsubactivity smoke_${userId} sub_${userId} 50 Test sub`,
    '/activities',
    `/score @${username} smoke_${userId} 12 test`,
    `/score @${username} smoke_${userId} 12 duplicate`,
    `/subscore @${username} smoke_${userId} sub_${userId} 20 test`,
    `/ranking smoke_${userId}`,
    `/subranking smoke_${userId} sub_${userId}`,
    '/stats',
    `/createteam team_${userId} Test team`,
    `/addtoteam @${username} team_${userId}`,
    '/teamranking',
    '/history',
    '/export scores',
    '/feedback smoke Backend v2 OK',
    `/starttimer timer_${userId} 5`,
    `/stoptimer timer_${userId}`,
    '/help',
    '/app',
  ];

  const results = [];
  for (const command of commands) {
    const result = await sendCommand(command);
    results.push({
      command,
      responseCommand: result.command,
      messages: result.messages?.length || 0,
    });
  }

  console.log(JSON.stringify({ ok: true, apiUrl, chatId, username, results }, null, 2));
  await prisma.telegramGroup.deleteMany({ where: { chatId: String(chatId) } });
  await prisma.user.deleteMany({ where: { telegramId: String(userId) } });
  await prisma.$disconnect();
}

main().catch(error => {
  console.error(error);
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});
