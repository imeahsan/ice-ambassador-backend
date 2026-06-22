import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true, lowercase: true })
    email: string;

    @Prop({ required: true, unique: true })
    phone: string;

    @Prop({ required: false })
    password?: string;

    @Prop({ type: String, enum: ['ACTIVE', 'SUSPENDED', 'PENDING', 'PASSWORD_RESET_REQUIRED'], default: 'ACTIVE' })
    status: string;

    @Prop({ type: Boolean, default: false })
    isMigrated: boolean;

    @Prop({ type: Date, default: null })
    lastLoginAt: Date | null;

    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({ required: true, enum: ['PARTNER', 'AMBASSADOR'] })
    userType: string;

    @Prop({ required: true, unique: true })
    referralCode: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
    referredByUserId: MongooseSchema.Types.ObjectId | string | null;

    @Prop({ type: String, default: null })
    iceDriverId: string | null;

    @Prop({
        type: [{
            tokenHash: { type: String, required: true },
            expiresAt: { type: Date, required: true },
            used: { type: Boolean, default: false },
        }],
        default: []
    })
    resetTokens?: Array<{
        tokenHash: string;
        expiresAt: Date;
        used: boolean;
    }>;

    @Prop({ type: Date, default: null })
    emailVerifiedAt: Date | null;

    @Prop({
        type: [{
            tokenHash: { type: String, required: true },
            expiresAt: { type: Date, required: true },
            used: { type: Boolean, default: false },
        }],
        default: []
    })
    emailVerificationTokens?: Array<{
        tokenHash: string;
        expiresAt: Date;
        used: boolean;
    }>;

    @Prop({ type: String, default: null, index: true })
    firebaseUid?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
