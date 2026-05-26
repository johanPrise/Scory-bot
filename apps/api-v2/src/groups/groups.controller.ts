import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GroupsService } from './groups.service';

@UseGuards(AuthGuard)
@Controller('api/groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.groups.listUserGroups(user.id);
  }

  @Get(':chatId')
  get(@CurrentUser() user: AuthenticatedUser, @Param('chatId') chatId: string) {
    return this.groups.getGroup({ chatId, userId: user.id });
  }
}
