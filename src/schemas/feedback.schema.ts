import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Feedback {
    @Prop({ type: Types.ObjectId, ref: 'Delivery', required: true })
    deliveryId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    fromUser: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    toUser: Types.ObjectId;

    @Prop({ type: String, required: true, enum: ['driver', 'sender'] })
    role: 'driver' | 'sender';

    @Prop({ type: Number, min: 1, max: 5, required: true })
    rating: number;

    @Prop({ type: String })
    comment?: string;
}

export type FeedbackDocument = Feedback & Document;
export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

