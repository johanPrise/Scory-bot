import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { TelegramAuthService } from './telegram-auth.service';

@Global()
@Module({
  providers: [AuthGuard, TelegramAuthService],
  exports: [AuthGuard, TelegramAuthService],
})
export class AuthModule {}
