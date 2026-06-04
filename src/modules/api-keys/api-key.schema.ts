import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../schemas/user.schema';

export type ApiKeyDocument = ApiKey & Document;

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ required: true })
  name: string; // Friendly name

  @Prop({ required: true, index: true })
  prefix: string; // Short prefix to lookup the key quickly

  @Prop({ required: true })
  hash: string; // Bcrypt hash of the secret portion (never store raw key)

  @Prop({ type: [String], default: [] })
  scopes: string[]; // e.g. ['deliveries:read', 'payments:write']

  @Prop({ type: Types.ObjectId, ref: User.name, required: false })
  userId?: Types.ObjectId; // Optional owner (null for system/integration keys)

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ type: Date, default: null })
  lastUsedAt: Date | null;

  @Prop({ type: Number, default: 0 })
  usageCount: number;

  @Prop({ type: Number, default: 0 })
  rateLimitPerMinute: number; // 0 means unlimited at this layer

  @Prop({ type: Number, default: 0 })
  currentMinuteCount: number; // transient counter (can be reset externally)

  @Prop({ type: Date, default: null })
  currentMinuteWindow: Date | null; // start time of current rate window
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
ApiKeySchema.index({ isActive: 1, expiresAt: 1 });
