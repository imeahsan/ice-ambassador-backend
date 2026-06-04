// src/vehicle/schemas/vehicle.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VehicleDocument = Vehicle & Document;

@Schema({ timestamps: true })
export class Vehicle {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    make: string;

    @Prop({ required: true })
    model: string;

    @Prop({ required: true })
    year: number;

    @Prop()
    color?: string;

    @Prop({ required: true, unique: true })
    plateNumber: string;

    @Prop()
    vin?: string;

    @Prop()
    registrationExpiry?: Date;

    @Prop()
    insuranceProvider?: string;

    @Prop()
    insuranceExpiry?: Date;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
