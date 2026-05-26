import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service';

export type AuthenticatedUser = {
  id: string;
  telegramId?: string;
};

type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
};

function getHeader(headers: RequestWithUser['headers'], name: string) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly telegramAuth: TelegramAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const devUserId = getHeader(request.headers, 'x-scory-user-id');
    if (devUserId) {
      request.user = { id: devUserId };
      return true;
    }

    const initData = getHeader(request.headers, 'x-telegram-init-data');
    const telegramUser = initData ? await this.telegramAuth.resolveUserFromInitData(initData) : null;
    if (telegramUser) {
      request.user = telegramUser;
      return true;
    }

    throw new UnauthorizedException('Authentification Scory v2 requise');
  }
}
