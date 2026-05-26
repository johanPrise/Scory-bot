import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
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

type ListScoresQuery = {
  chatId: string;
  activityId?: string;
  userId?: string;
  teamId?: string;
  context?: 'individual' | 'team';
  status?: 'approved' | 'pending' | 'rejected' | 'deleted';
  limit?: string;
};

@UseGuards(AuthGuard)
@Controller('api/scores')
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListScoresQuery,
  ) {
    return this.scores.listScores({
      actorId: user.id,
      chatId: query.chatId,
      activityId: query.activityId,
      userId: query.userId,
      teamId: query.teamId,
      context: query.context,
      status: query.status,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

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

  @Delete(':id')
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.scores.deleteScore({ actorId: user.id, scoreId: id });
  }
}
