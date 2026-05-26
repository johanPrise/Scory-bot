import { Body, Controller, Get, Post, Put, UnauthorizedException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthenticatedUser, AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { TelegramAuthService } from './telegram-auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramAuth: TelegramAuthService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        telegramId: true,
        telegramUser: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    if (!profile) throw new UnauthorizedException('Utilisateur introuvable');
    return { user: profile };
  }

  @Post('telegram-login')
  async telegramLogin(@Body() body: { initData?: string }) {
    const user = body.initData ? await this.telegramAuth.resolveUserFromInitData(body.initData) : null;
    if (!user) throw new UnauthorizedException('Authentification Telegram invalide');

    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        telegramId: true,
        telegramUser: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    return { user: profile };
  }

  @UseGuards(AuthGuard)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { firstName?: string; lastName?: string },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: body.firstName?.trim() || null,
        lastName: body.lastName?.trim() || null,
      },
      select: {
        id: true,
        telegramId: true,
        telegramUser: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    return { user: updated };
  }
}
