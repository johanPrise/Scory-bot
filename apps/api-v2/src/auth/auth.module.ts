import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { TelegramAuthService } from './telegram-auth.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthGuard, TelegramAuthService],
  exports: [AuthGuard, TelegramAuthService],
})
export class AuthModule {}
