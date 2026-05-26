import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../../runtime-env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) as T : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delByPrefix(prefix: string) {
    const stream = this.client.scanStream({ match: `${prefix}*`, count: 100 });
    for await (const keys of stream) {
      if (Array.isArray(keys) && keys.length > 0) {
        await this.client.del(...keys);
      }
    }
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}
