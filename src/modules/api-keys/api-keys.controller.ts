import { Controller, Post, Body, Req, UseGuards, Get, Param, Patch } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyOrJwtGuard } from './api-key.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private apiKeys: ApiKeysService) {}

  @Post()
  async create(@Body() dto: CreateApiKeyDto, @Req() req: any) {
    // Require JWT user context
    if (req.authType !== 'jwt' || !req.userId) {
      return { success: false, message: 'JWT required to create API keys' };
    }
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const result = await this.apiKeys.createKey({
      name: dto.name || 'Default API Key',
      userId: req.userId,
      scopes: dto.scopes || [],
      expiresAt,
      rateLimitPerMinute: dto.rateLimitPerMinute || 0,
    });
    return { success: true, message: 'API key created', data: result };
  }

  @Get()
  async list(@Req() req: any) {
    if (!req.userId) return { success: false, message: 'Unauthorized' };
    const data = await this.apiKeys.listUserKeys(req.userId);
    return { success: true, data };
  }

  @Patch(':id/revoke')
  async revoke(@Param('id') id: string, @Req() req: any) {
    if (!req.userId) return { success: false, message: 'Unauthorized' };
    const data = await this.apiKeys.revokeKey(id, req.userId);
    return { success: true, ...data };
  }

  @Patch(':id/rotate')
  async rotate(@Param('id') id: string, @Req() req: any) {
    if (!req.userId) return { success: false, message: 'Unauthorized' };
    const data = await this.apiKeys.rotateKey(id, req.userId);
    return { success: true, ...data };
  }
}
