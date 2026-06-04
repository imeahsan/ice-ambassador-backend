import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DriverDetailsDocument = DriverDetails & Document;

@Schema({ timestamps: true })
export class DriverDetails {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: MongooseSchema.Types.ObjectId;

    @Prop({ required: true })
    deliveryMethod: string;

    @Prop({
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0], // ✅ default to [0, 0]
        },
    })
    location: {
        type: 'Point';
        coordinates: [number, number];
    };

    @Prop({ default: false })
    isAvailable: boolean;

    @Prop({ default: false })
    isVerified: boolean;

    @Prop({ default: false })
    isBlocked: boolean;
}

export const DriverDetailsSchema = SchemaFactory.createForClass(DriverDetails);

// ✅ Enable geospatial indexing
DriverDetailsSchema.index({ location: '2dsphere' });
