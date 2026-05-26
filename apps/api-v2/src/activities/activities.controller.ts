import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ActivitiesService } from './activities.service';

@UseGuards(AuthGuard)
@Controller('api/activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query('chatId') chatId: string,
    @Param('id') id: string,
  ) {
    return this.activities.getActivity(id, chatId, user.id);
  }

  @Get(':id/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('chatId') chatId: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.activities.getActivityHistory({
      actorId: user.id,
      chatId,
      activityId: id,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { chatId: string; name: string; description?: string; type?: string },
  ) {
    return this.activities.createActivity({
      actorId: user.id,
      chatId: body.chatId,
      name: body.name,
      description: body.description,
      type: body.type,
    });
  }

  @Post(':id/subactivities')
  addSubActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { chatId: string; name: string; description?: string; maxScore?: number },
  ) {
    return this.activities.addSubActivity({
      actorId: user.id,
      chatId: body.chatId,
      activityId: id,
      name: body.name,
      description: body.description,
      maxScore: body.maxScore,
    });
  }

  @Delete(':id')
  deleteActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('chatId') chatId: string,
  ) {
    return this.activities.deleteActivity({ actorId: user.id, chatId, activityId: id });
  }

  @Delete(':id/subactivities/:subId')
  deleteSubActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Query('chatId') chatId: string,
  ) {
    return this.activities.deleteSubActivity({
      actorId: user.id,
      chatId,
      activityId: id,
      subActivityId: subId,
    });
  }
}
