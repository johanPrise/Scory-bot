import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { MobileService } from './mobile.service';
import { AuthenticatedUser, AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('api/mobile')
export class MobileController {
  constructor(private readonly mobile: MobileService) {}

  @Get('home')
  home(@CurrentUser() user: AuthenticatedUser, @Query('chatId') chatId: string) {
    return this.mobile.getHome({ userId: user.id, chatId });
  }

  @Get('rankings')
  rankings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('chatId') chatId: string,
    @Query('scope') scope: 'individual' | 'team' = 'individual',
    @Query('period') period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month',
    @Query('activityId') activityId?: string,
  ) {
    return this.mobile.getRankings({ userId: user.id, chatId, scope, period, activityId });
  }

  @Get('activities')
  activities(
    @CurrentUser() user: AuthenticatedUser,
    @Query('chatId') chatId: string,
    @Query('cursor') cursor?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.mobile.getActivities({ userId: user.id, chatId, cursor, type, search });
  }

  @Get('teams')
  teams(
    @CurrentUser() user: AuthenticatedUser,
    @Query('chatId') chatId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.mobile.getTeams({ userId: user.id, chatId, cursor });
  }
}
