import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const redisUrl = configService.get<string>('REDIS_URL');

        const redis = redisUrl
          ? new Redis(redisUrl, { maxRetriesPerRequest: null })
          : new Redis({
              host: configService.get<string>('REDIS_HOST') || '127.0.0.1',
              port: Number(configService.get<string>('REDIS_PORT') || 6379),
              username: configService.get<string>('REDIS_USERNAME') || undefined,
              password: configService.get<string>('REDIS_PASSWORD') || undefined,
              db: Number(configService.get<string>('REDIS_DB') || 0),
              maxRetriesPerRequest: null,
            });

        redis.on('connect', () => Logger.log('Redis connected', 'RedisModule'));
        redis.on('error', (error) =>
          Logger.error(`Redis error: ${String(error)}`, '', 'RedisModule'),
        );

        return redis;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}

