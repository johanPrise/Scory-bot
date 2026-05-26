import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TeamsService } from './teams.service';

@UseGuards(AuthGuard)
@Controller('api/teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { chatId: string; name: string; description?: string; settings?: { maxMembers?: number } },
  ) {
    return this.teams.createTeam({
      actorId: user.id,
      chatId: body.chatId,
      name: body.name,
      description: body.description,
      maxMembers: body.settings?.maxMembers,
    });
  }

  @Post('join')
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { chatId: string; joinCode: string },
  ) {
    return this.teams.joinTeam({ actorId: user.id, chatId: body.chatId, joinCode: body.joinCode });
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { chatId: string },
  ) {
    return this.teams.deleteTeam({ actorId: user.id, chatId: body.chatId, teamId: id });
  }
}
