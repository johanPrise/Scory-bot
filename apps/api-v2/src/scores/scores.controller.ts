import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ScoresService } from './scores.service';

type CreateScoreBody = {
  chatId: string;
  activityId: string;
  subActivityId?: string;
  userId?: string;
  teamId?: string;
  value: number;
  maxPossible: number;
  context: 'individual' | 'team';
  comments?: string;
};

@UseGuards(AuthGuard)
@Controller('api/scores')
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateScoreBody) {
    return this.scores.createScore({ actorId: user.id, ...body });
  }

  @Put(':id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.scores.approveScore({ actorId: user.id, scoreId: id });
  }

  @Put(':id/reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.scores.rejectScore({ actorId: user.id, scoreId: id, reason: body.reason });
  }
}
