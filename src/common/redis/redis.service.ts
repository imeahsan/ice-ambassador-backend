import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  getClient(): Redis {
    return this.redis;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      this.logger.warn(`Failed to close Redis connection: ${String(error)}`);
    }
  }

  async incrementWithWindow(key: string, windowSec: number): Promise<number> {
    const result = await this.redis.eval(
      'local current = redis.call("INCR", KEYS[1]); if current == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]); end; return current;',
      1,
      key,
      windowSec,
    );

    return Number(result);
  }

  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSec: number,
  ): Promise<{ allowed: boolean; count: number; remaining: number; retryAfter: number }> {
    const count = await this.incrementWithWindow(key, windowSec);
    const ttl = await this.redis.ttl(key);
    const retryAfter = ttl > 0 ? ttl : windowSec;

    return {
      allowed: count <= maxRequests,
      count,
      remaining: Math.max(0, maxRequests - count),
      retryAfter,
    };
  }
}

