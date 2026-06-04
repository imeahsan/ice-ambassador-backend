import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RedisRateLimitMiddleware.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const maxRequests = Number(
      this.configService.get<string>('RATE_LIMIT_MAX_REQUESTS') || 120,
    );
    const windowSec = Number(
      this.configService.get<string>('RATE_LIMIT_WINDOW_SEC') || 60,
    );

    if (maxRequests <= 0 || windowSec <= 0) {
      return next();
    }

    try {
      const key = this.getRateLimitKey(req);
      const result = await this.redisService.checkRateLimit(
        key,
        maxRequests,
        windowSec,
      );

      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(result.retryAfter));

      if (!result.allowed) {
        throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }

      return next();
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }

      // Fail open to avoid full API outage when Redis is unreachable.
      this.logger.warn(`Rate limiter fallback: ${String(error)}`);
      return next();
    }
  }

  private getRateLimitKey(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : req.ip;

    return `rate-limit:ip:${ip}:${req.method}:${req.baseUrl || ''}${req.path}`;
  }
}


