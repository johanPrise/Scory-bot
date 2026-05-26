import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { env } from '../runtime-env';
import { AuthenticatedUser } from './auth.guard';

type TelegramInitUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class TelegramAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUserFromInitData(initData: string): Promise<AuthenticatedUser | null> {
    const payload = this.verifyInitData(initData);
    if (!payload) return null;

    const telegramUser = payload.user ? JSON.parse(payload.user) as TelegramInitUser : null;
    if (!telegramUser?.id) return null;

    const user = await this.prisma.user.upsert({
      where: { telegramId: String(telegramUser.id) },
      update: {
        telegramUser: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      },
      create: {
        telegramId: String(telegramUser.id),
        telegramUser: telegramUser.username,
        username: telegramUser.username ? `tg_${telegramUser.username}` : null,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      },
      select: { id: true, telegramId: true },
    });

    return { id: user.id, telegramId: user.telegramId || undefined };
  }

  private verifyInitData(initData: string): Record<string, string> | null {
    if (!env.TELEGRAM_BOT_TOKEN) return null;

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(env.TELEGRAM_BOT_TOKEN)
      .digest();
    const calculated = crypto
      .createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash))) {
      return null;
    }

    return Object.fromEntries(params.entries());
  }
}
