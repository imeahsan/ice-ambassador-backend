import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ApiKey, ApiKeyDocument } from './api-key.schema';
import { randomBytes } from 'crypto';
import { RedisService } from '../../common/redis/redis.service';

interface CreateApiKeyOptions {
  name: string;
  userId?: string; // if created by a user (owner)
  scopes?: string[];
  expiresAt?: Date | null;
  rateLimitPerMinute?: number;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private readonly redisService: RedisService,
  ) {}

  private generateRawKey(): { full: string; prefix: string; secret: string } {
    // prefix: 8 hex chars, secret: 32 bytes base64url
    const prefix = randomBytes(4).toString('hex');
    const secret = randomBytes(24).toString('base64url');
    const full = `ice_${prefix}_${secret}`;
    return { full, prefix, secret };
  }

  async createKey(opts: CreateApiKeyOptions) {
    const { full, prefix, secret } = this.generateRawKey();
    const hash = await bcrypt.hash(secret, 10);

    const doc = await this.apiKeyModel.create({
      name: opts.name,
      prefix,
      hash,
      scopes: opts.scopes || [],
      userId: opts.userId || undefined,
      expiresAt: opts.expiresAt || null,
      rateLimitPerMinute: opts.rateLimitPerMinute || 0,
      currentMinuteWindow: null,
      currentMinuteCount: 0,
    });

    return {
      apiKey: full, // show only once!
      id: (doc._id as any).toString(),
      name: doc.name,
      scopes: doc.scopes,
      expiresAt: doc.expiresAt,
      userId: doc.userId,
    };
  }

  async listUserKeys(userId: string) {
    const docs = await this.apiKeyModel.find({ userId }).lean();
    return docs.map(d => ({
      id: d._id.toString(),
      name: d.name,
      prefix: d.prefix,
      scopes: d.scopes,
      expiresAt: d.expiresAt,
      isActive: d.isActive,
      lastUsedAt: d.lastUsedAt,
      usageCount: d.usageCount,
      rateLimitPerMinute: d.rateLimitPerMinute,
    }));
  }

  async revokeKey(id: string, userId: string) {
    const key = await this.apiKeyModel.findById(id);
    if (!key) throw new NotFoundException('API key not found');
    if (key.userId?.toString() !== userId) throw new ForbiddenException('Not owner');
    key.isActive = false;
    await key.save();
    return { message: 'API key revoked' };
  }

  async rotateKey(id: string, userId: string) {
    const key = await this.apiKeyModel.findById(id);
    if (!key) throw new NotFoundException('API key not found');
    if (key.userId?.toString() !== userId) throw new ForbiddenException('Not owner');
    const { full, prefix, secret } = this.generateRawKey();
    key.prefix = prefix;
    key.hash = await bcrypt.hash(secret, 10);
    key.lastUsedAt = null;
    key.usageCount = 0;
    await key.save();
    return { apiKey: full, message: 'API key rotated' };
  }

  async validate(rawKey: string): Promise<ApiKeyDocument | null> {
    if (!rawKey.startsWith('ice_')) return null;
    const parts = rawKey.split('_');
    if (parts.length !== 3) return null;
    const [, prefix, secret] = parts;
    const keyDoc = await this.apiKeyModel.findOne({ prefix });
    if (!keyDoc) return null;
    if (!keyDoc.isActive) return null;
    if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) return null;

    const match = await bcrypt.compare(secret, keyDoc.hash);
    if (!match) return null;

    const now = new Date();
    if (keyDoc.rateLimitPerMinute > 0) {
      await this.enforceApiKeyRateLimit(keyDoc, now);
    }

    keyDoc.lastUsedAt = now;
    keyDoc.usageCount += 1;
    await keyDoc.save();
    return keyDoc;
  }

  private async enforceApiKeyRateLimit(keyDoc: ApiKeyDocument, now: Date): Promise<void> {
    try {
      const key = `rate-limit:api-key:${keyDoc.prefix}`;
      const result = await this.redisService.checkRateLimit(
        key,
        keyDoc.rateLimitPerMinute,
        60,
      );

      keyDoc.currentMinuteWindow = new Date(now.getTime() - (60 - result.retryAfter) * 1000);
      keyDoc.currentMinuteCount = result.count;

      if (!result.allowed) {
        throw new ForbiddenException('API key rate limit exceeded');
      }

      return;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.applyDocumentRateLimitFallback(keyDoc, now);
    }
  }

  private applyDocumentRateLimitFallback(keyDoc: ApiKeyDocument, now: Date): void {
    if (
      !keyDoc.currentMinuteWindow ||
      now.getTime() - keyDoc.currentMinuteWindow.getTime() >= 60_000
    ) {
      keyDoc.currentMinuteWindow = now;
      keyDoc.currentMinuteCount = 0;
    }

    keyDoc.currentMinuteCount += 1;
    if (keyDoc.currentMinuteCount > keyDoc.rateLimitPerMinute) {
      throw new ForbiddenException('API key rate limit exceeded');
    }
  }
}
