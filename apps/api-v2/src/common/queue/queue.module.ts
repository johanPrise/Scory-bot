import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { env } from '../../runtime-env';
import { QUEUE_NAMES } from './queue.constants';
import { createRedisConnectionOptions } from './redis-connection-options';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: createRedisConnectionOptions(env.REDIS_URL),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1_000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.telegramJobs },
      { name: QUEUE_NAMES.telegramSend },
      { name: QUEUE_NAMES.statsJobs },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
