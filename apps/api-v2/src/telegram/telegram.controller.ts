import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { env } from '../runtime-env';
import { TelegramCommandRegistry } from './telegram-command-registry';
import { TelegramUpdateService } from './telegram-update.service';
import { TelegramUpdatePayload } from './telegram.types';

function canDryRun(secret: string | undefined, dryRun: string | undefined) {
  return dryRun === '1' && Boolean(env.TELEGRAM_WEBHOOK_SECRET) && secret === env.TELEGRAM_WEBHOOK_SECRET;
}

@Controller()
export class TelegramController {
  constructor(
    private readonly registry: TelegramCommandRegistry,
    private readonly updates: TelegramUpdateService,
  ) {}

  @Get('api/telegram/commands')
  commands() {
    return { commands: this.registry.commands };
  }

  @Post('telegram/webhook')
  webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Headers('x-scory-telegram-dry-run') dryRun: string | undefined,
    @Body() update: TelegramUpdatePayload,
  ) {
    if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Webhook Telegram refuse');
    }

    return this.updates.handleUpdate(update, { dryRun: canDryRun(secret, dryRun) });
  }

  @Post('webhook/:token')
  tokenWebhook(
    @Param('token') token: string,
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Headers('x-scory-telegram-dry-run') dryRun: string | undefined,
    @Body() update: TelegramUpdatePayload,
  ) {
    if (env.TELEGRAM_BOT_TOKEN && token !== env.TELEGRAM_BOT_TOKEN) {
      throw new UnauthorizedException('Webhook Telegram refuse');
    }
    if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new UnauthorizedException('Webhook Telegram refuse');
    }

    return this.updates.handleUpdate(update, { dryRun: canDryRun(secret, dryRun) });
  }
}
