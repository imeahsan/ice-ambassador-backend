// logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

function redactSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(redactSensitiveData);
    }
    const redacted = { ...obj };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'accessToken', 'refreshToken'];
    for (const key of Object.keys(redacted)) {
        if (sensitiveKeys.includes(key)) {
            redacted[key] = '[REDACTED]';
        } else if (typeof redacted[key] === 'object') {
            redacted[key] = redactSensitiveData(redacted[key]);
        }
    }
    return redacted;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        if (req.body) {
            console.log('Raw Request Body:', redactSensitiveData(req.body));
        }
        next();
    }
}
