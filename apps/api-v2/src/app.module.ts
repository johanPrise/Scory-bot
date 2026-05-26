import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { SlowRequestInterceptor } from './common/observability/slow-request.interceptor';
import { AuthModule } from './auth/auth.module';
import { MobileModule } from './mobile/mobile.module';
import { ScoresModule } from './scores/scores.module';
import { ProjectionsModule } from './projections/projections.module';
import { RankingsModule } from './rankings/rankings.module';
import { TelegramModule } from './telegram/telegram.module';
import { MigrationModule } from './migration/migration.module';
import { GroupsModule } from './groups/groups.module';
import { ActivitiesModule } from './activities/activities.module';
import { TeamsModule } from './teams/teams.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    ProjectionsModule,
    RankingsModule,
    ScoresModule,
    MobileModule,
    GroupsModule,
    ActivitiesModule,
    TeamsModule,
    TelegramModule,
    MigrationModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SlowRequestInterceptor,
    },
  ],
})
export class AppModule {}
