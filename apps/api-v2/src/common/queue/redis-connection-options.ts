import type { RedisOptions } from 'ioredis';

export function createRedisConnectionOptions(redisUrl: string): RedisOptions {
  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    tls: isTls ? {} : undefined,
  };
}
