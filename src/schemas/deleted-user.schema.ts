import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeletedUserDocument = DeletedUser & Document;

@Schema({ timestamps: true })
export class DeletedUser {
    @Prop({ required: true }) email: string;
    @Prop({ required: true }) password: string;
    @Prop({ required: true }) firstname: string;
    @Prop({ required: true }) lastname: string;
    @Prop({ required: true }) phone: string;
    @Prop({ enum: ['male', 'female', 'other'], default: 'other' }) gender: string;
    @Prop({ enum: ['driver', 'customer', 'other'], default: '' }) role: string;
    @Prop() dateOfBirth: Date;
    @Prop() address: string;
    @Prop() zipCode: number;
    @Prop({ enum: ['car', 'bike', 'scooter', 'walk'], default: null }) deliveryMethod: string;
    @Prop() profilePic: string;
    @Prop() idPic: string;

    // Verification & statuses
    @Prop() isPhoneVerified: boolean;
    @Prop() isEmailVerified: boolean;
    @Prop() isVerifiedDriver: boolean;
    @Prop() veriffStatus: string;
    @Prop() veriffSessionId: string;
    @Prop() veriffUrl: string;
    @Prop() veriffCreatedAt: Date;
    @Prop() checkrStatus: string;
    @Prop() stripeUserId: string;
    @Prop() stripeAccountId: string;
    @Prop() adminApproval: boolean;
    @Prop() isBlocked: boolean;

    // Archive metadata
    @Prop({ default: Date.now }) deletedAt: Date;
    @Prop() deletedBy: string;         // Optional: admin ID or self
    @Prop() reason: string;            // Optional: deletion reason
}

export const DeletedUserSchema = SchemaFactory.createForClass(DeletedUser);
