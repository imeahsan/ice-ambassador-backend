import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true })
    firstname: string;

    @Prop({ required: true })
    lastname: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ required: false, enum: ['male', 'female', 'other'], default: 'other' })
    gender: string;
    @Prop({ required: false, enum: ['driver', 'customer', 'other'], default: '' })
    role: string;

    @Prop({ required: false, default: null })
    dateOfBirth: Date;

    @Prop({ default: '' })
    address: string; // ✅ added

    @Prop({ type: Number, default: null })
    zipCode: number; // ✅ added

    @Prop({ required: false, enum: ['car', 'bike', 'scooter', 'walk'], default: null })
    deliveryMethod: string; // ✅ added

    @Prop({ type: String, default: null })
    emailOTP: string | null;

    @Prop({ type: String, default: null })
    OTP: string | null;

    @Prop({ default: '' })
    FCMToken: string;

    @Prop({ default: '' })
    platform: string;

      @Prop({ default: false })
    stripeAccountSetupComplete: boolean;

    @Prop({ default: '' })
    profilePic: string;

    @Prop({ default: '' })
    idPic: string;
    @Prop({ default: '' })
    idBackPic: string;

    @Prop({ default: false })
    isPhoneVerified: boolean;

    @Prop({ default: false })
    isVerifiedDriver: boolean;

    @Prop({ default: false })
    isEmailVerified: boolean;
    @Prop({ default: false })
    isCorporate: boolean;

    @Prop({
        default: 'pending',
        enum: ['pending', 'approved', 'declined', 'expired'],
    })
    veriffStatus: string;

    @Prop({ default: null })
    veriffSessionId: string;

    @Prop({ default: null })
    veriffUrl: string;

    @Prop({ default: null })
    veriffCreatedAt: Date;

    @Prop({ default: 'pending' })
    checkrStatus: string;

    @Prop({ default: null })
    stripeUserId: string;

    @Prop({ default: null })
    stripeAccountId: string;

    @Prop({ default: false })
    adminApproval: boolean;

    @Prop({ default: false })
    isBlocked: boolean;

    @Prop({ type: Boolean, default: false })
    vehicleAdded: boolean;

    @Prop({ type: String, default: null })
    phoneLoginOTP: string | null;

    @Prop({ type: Date, default: null })
    phoneLoginOTPExpiresAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
