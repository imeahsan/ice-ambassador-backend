import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from './api-keys.service';
import { REQUIRE_SCOPES_KEY } from './scopes.decorator';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ApiKeyOrJwtGuard implements CanActivate {
  constructor(private apiKeys: ApiKeysService, private reflector: Reflector, private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];
    const apiKeyHeader: string | undefined = req.headers['x-api-key'] as string | undefined;

    // First try API key auth if provided
    if (apiKeyHeader) {
      const keyDoc = await this.apiKeys.validate(apiKeyHeader);
      if (!keyDoc) throw new UnauthorizedException('Invalid API key');
      // Scope check
      const requiredScopes = this.reflector.getAllAndOverride<string[]>(REQUIRE_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];
      if (requiredScopes.length && !requiredScopes.every(s => keyDoc.scopes.includes(s))) {
        throw new ForbiddenException('Insufficient API key scopes');
      }
      req.userId = keyDoc.userId || null; // Might be null for system key
      req.authType = 'apiKey';
      req.apiKey = keyDoc.prefix;
      return true;
    }

    // Fallback to JWT bearer
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwt.verify(token);
      req.userId = decoded.uid;
      req.authType = 'jwt';
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}
